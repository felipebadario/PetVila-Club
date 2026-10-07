/**
 * Roda integrations/google-sheets/Code.gs numa planilha simulada em memória,
 * para validar as colunas novas e as ações welcome_* que a produção usa.
 */
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeLead } from './helpers';

const SOURCE = readFileSync(new URL('../integrations/google-sheets/Code.gs', import.meta.url), 'utf8');

/** Planilha mínima: o que o Code.gs usa do SpreadsheetApp. Apóstrofo inicial = texto. */
class FakeSheet {
  rows: unknown[][] = [];
  maxCols = 26;
  store = (v: unknown) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);
  getLastRow = () => this.rows.length;
  getMaxColumns = () => this.maxCols;
  insertColumnsAfter = (_: number, n: number) => void (this.maxCols += n);
  setFrozenRows = () => {};
  appendRow = (r: unknown[]) => void this.rows.push(r.map(this.store));
  getRange = (row: number, col: number, nr = 1, nc = 1) => {
    const self = this;
    const values = () =>
      Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => self.rows[row - 1 + i]?.[col - 1 + j] ?? ''));
    const range = {
      getValues: values,
      getDisplayValues: () => values().map((r) => r.map(String)),
      setValue(v: unknown) {
        while (self.rows.length < row) self.rows.push([]);
        self.rows[row - 1][col - 1] = self.store(v);
        return range;
      },
      setFontWeight: () => range,
    };
    return range;
  };
}

let sheet: FakeSheet;
let gs: { doPost: (e: unknown) => { out: string }; doGet: (e: unknown) => { out: string }; HEADERS: string[] };

beforeEach(() => {
  sheet = new FakeSheet();
  const out = (s: string) => ({ out: s, setMimeType() { return this; } });
  const ctx = createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'tok' }) },
    ContentService: { createTextOutput: out, MimeType: { JSON: 'json' } },
    JSON,
    Date,
    String,
    Object,
  });
  runInContext(SOURCE + '\nthis.__api = { doPost, doGet, HEADERS };', ctx);
  gs = (ctx as unknown as { __api: typeof gs }).__api;
});

const post = (body: Record<string, unknown>) => JSON.parse(gs.doPost({ postData: { contents: JSON.stringify({ token: 'tok', ...body }) } }).out);
const list = () => JSON.parse(gs.doGet({ parameter: { token: 'tok', action: 'list' } }).out).leads as Record<string, unknown>[];
const cell = (row: number, h: string) => sheet.rows[row - 1][gs.HEADERS.indexOf(h)];

describe('Code.gs', () => {
  it('colunas novas entram no fim, depois de preferredPlan', () => {
    const h = gs.HEADERS;
    expect(h.slice(0, 27).at(-1)).toBe('preferredPlan');
    expect(h.slice(27)).toEqual([
      'source', 'whatsapp_e164', 'whatsapp_opt_in', 'whatsapp_opt_in_at', 'whatsapp_opt_in_texto',
      'welcome_message_id', 'welcome_message_status', 'welcome_sent_at', 'welcome_delivered_at',
      'welcome_read_at', 'welcome_failed_at', 'welcome_error_code', 'welcome_error_message',
    ]);
  });

  it('planilha antiga (27 colunas) ganha os cabeçalhos novos sem mexer nos dados', () => {
    const old = gs.HEADERS.slice(0, 27);
    sheet.rows.push(old.map((h) => (h === 'preferredPlan' ? 'Plano de interesse' : h)));
    sheet.rows.push(old.map((h) => (h === 'id' ? 'antigo' : 'x')));
    sheet.maxCols = 27;
    post({ action: 'append', lead: makeLead({ id: 'novo' }) });
    expect(sheet.rows[0].slice(27)).toEqual(gs.HEADERS.slice(27));
    expect(sheet.rows[1][0]).toBe('antigo');
    expect(list().map((l) => l.id)).toEqual(['antigo', 'novo']);
  });

  it('append grava opt-in, telefone normalizado e origem; welcome_* começa vazio', () => {
    post({ action: 'append', lead: { ...makeLead({ id: 'L1' }), welcome_message_status: 'read' } });
    expect(cell(2, 'whatsapp_e164')).toBe('5511912345678');
    expect(cell(2, 'whatsapp_opt_in')).toBe('sim');
    expect(cell(2, 'whatsapp_opt_in_at')).toBe('2026-10-07T12:00:00.000Z');
    expect(cell(2, 'source')).toBe('lp-primeiros-da-vila');
    expect(cell(2, 'welcome_message_status')).toBe('');
    expect(list()[0].whatsapp_opt_in).toBe(true);
    post({ action: 'append', lead: makeLead({ id: 'L2', whatsapp_opt_in: false }) });
    expect(cell(3, 'whatsapp_opt_in')).toBe('não');
  });

  it('welcome_claim é idempotente por lead e por número', () => {
    post({ action: 'append', lead: makeLead({ id: 'A' }) });
    post({ action: 'append', lead: makeLead({ id: 'B' }) });
    post({ action: 'append', lead: makeLead({ id: 'C', whatsapp_e164: '5521987654321' }) });

    expect(post({ action: 'welcome_claim', id: 'A', phone: '5511912345678' }).claimed).toBe(true);
    expect(cell(2, 'welcome_message_status')).toBe('sending');
    expect(post({ action: 'welcome_claim', id: 'A', phone: '5511912345678' }).claimed).toBe(false);
    expect(post({ action: 'welcome_claim', id: 'B', phone: '5511912345678' }).claimed).toBe(false);
    expect(post({ action: 'welcome_claim', id: 'C', phone: '5521987654321' }).claimed).toBe(true);
    expect(post({ action: 'welcome_claim', id: 'nao-existe', phone: '5511912345678' }).claimed).toBe(false);

    // Falha libera o número para um cadastro novo, nunca para o mesmo lead.
    post({ action: 'welcome_record', id: 'A', patch: { welcome_message_status: 'failed', welcome_error_code: '131026' } });
    expect(post({ action: 'welcome_claim', id: 'A', phone: '5511912345678' }).claimed).toBe(false);
    expect(post({ action: 'welcome_claim', id: 'B', phone: '5511912345678' }).claimed).toBe(true);
  });

  it('welcome_record só aceita campos welcome_* e protege contra fórmula', () => {
    post({ action: 'append', lead: makeLead({ id: 'A' }) });
    post({ action: 'welcome_record', id: 'A', patch: { welcome_message_id: 'wamid.X', welcome_message_status: 'accepted', nome: 'hack', welcome_error_message: '=IMPORTXML()' } });
    expect(cell(2, 'welcome_message_id')).toBe('wamid.X');
    expect(cell(2, 'welcome_message_status')).toBe('accepted');
    expect(cell(2, 'nome')).toBe('Ana Souza');
    expect(cell(2, 'welcome_error_message')).toBe('=IMPORTXML()'); // gravado como texto (apóstrofo)
    expect(post({ action: 'welcome_record', id: 'X', patch: {} })).toEqual({ ok: false, error: 'not_found' });
  });

  it('welcome_status segue a mesma regra do site (só avança, failed prevalece)', () => {
    post({ action: 'append', lead: makeLead({ id: 'A' }) });
    post({ action: 'welcome_record', id: 'A', patch: { welcome_message_id: 'wamid.X', welcome_message_status: 'accepted' } });
    const st = (status: string, timestamp: string, error?: unknown) =>
      post({ action: 'welcome_status', update: { wamid: 'wamid.X', status, timestamp, recipientId: '', error } }).result;

    expect(st('delivered', 't2')).toBe('updated');
    expect(st('sent', 't1')).toBe('updated'); // chegou atrasado: só o carimbo
    expect(cell(2, 'welcome_message_status')).toBe('delivered');
    expect(cell(2, 'welcome_sent_at')).toBe('t1');
    expect(st('sent', 't1')).toBe('unchanged');
    expect(st('read', 't3')).toBe('updated');
    expect(cell(2, 'welcome_message_status')).toBe('read');
    expect(st('failed', 't4', { code: '131050', title: 'Opted out', message: 'User stopped', details: '' })).toBe('updated');
    expect(cell(2, 'welcome_message_status')).toBe('failed');
    expect(cell(2, 'welcome_error_message')).toBe('Opted out: User stopped');
    expect(post({ action: 'welcome_status', update: { wamid: 'wamid.outro', status: 'sent', timestamp: 't' } }).result).toBe('not_found');
    expect(post({ action: 'welcome_status', update: { wamid: 'wamid.X', status: 'deleted' } }).ok).toBe(false);
  });

  it('ações antigas continuam funcionando', () => {
    post({ action: 'append', lead: makeLead({ id: 'A' }) });
    expect(post({ action: 'update', id: 'A', status: 'contatado', nota: 'ok' })).toEqual({ ok: true });
    expect(list()[0]).toMatchObject({ status: 'contatado', nota: 'ok', preferredPlan: 'care' });
    expect(JSON.parse(gs.doPost({ postData: { contents: '{"token":"errado"}' } }).out).error).toBe('unauthorized');
  });
});
