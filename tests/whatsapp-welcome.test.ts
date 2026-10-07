import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLeadStore, type LeadStore } from '../src/lib/leads/store';
import { WhatsAppClient } from '../src/lib/whatsapp/client';
import { sendWelcome } from '../src/lib/whatsapp/welcome';
import { graphOk, makeConfig, makeLead, useTempCwd } from './helpers';

let restore: () => void;
let store: LeadStore;

beforeEach(async () => {
  restore = await useTempCwd();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  store = getLeadStore()!; // sem planilha em teste: LocalFileStore em .data/leads.jsonl
});
afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

const client = (fetchMock: typeof fetch, over = {}) => new WhatsAppClient(makeConfig(over), fetchMock);
const leads = async () => (await store.list!()).reduce((m, l) => m.set(l.id, l), new Map());

describe('sendWelcome', () => {
  it('WHATSAPP_ENABLED=false não envia nada', async () => {
    const fetchMock = vi.fn();
    const lead = makeLead();
    await store.save(lead);
    const cfg = makeConfig({ enabled: false });
    expect(await sendWelcome(lead, { store, config: cfg, client: new WhatsAppClient(cfg, fetchMock) })).toBe('disabled');
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await leads()).get(lead.id).welcome_message_status).toBeUndefined();
  });

  it('desligado por padrão: sem variáveis de ambiente, nada é enviado', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const lead = makeLead();
    await store.save(lead);
    expect(await sendWelcome(lead, { store })).toBe('disabled');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sem opt-in ou sem telefone válido não envia', async () => {
    const fetchMock = vi.fn();
    const cfg = makeConfig();
    const c = new WhatsAppClient(cfg, fetchMock);
    expect(await sendWelcome(makeLead({ whatsapp_opt_in: false }), { store, config: cfg, client: c })).toBe('no_opt_in');
    expect(await sendWelcome(makeLead({ whatsapp_e164: '' }), { store, config: cfg, client: c })).toBe('invalid_phone');
    expect(await sendWelcome(makeLead(), { store, config: makeConfig({ welcomeTemplateName: '' }), client: c })).toBe('misconfigured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia uma vez, grava o wamid e é idempotente para o mesmo lead e o mesmo número', async () => {
    const fetchMock = vi.fn(async () => graphOk('wamid.UM'));
    const lead = makeLead();
    await store.save(lead);
    const deps = { store, config: makeConfig(), client: client(fetchMock) };

    expect(await sendWelcome(lead, deps)).toBe('accepted');
    // Reprocessamento do mesmo lead
    expect(await sendWelcome(lead, deps)).toBe('duplicate');
    // Novo cadastro com o mesmo número (refresh / retry do formulário)
    const again = makeLead();
    await store.save(again);
    expect(await sendWelcome(again, deps)).toBe('duplicate');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const saved = (await leads()).get(lead.id);
    expect(saved.welcome_message_id).toBe('wamid.UM');
    expect(saved.welcome_message_status).toBe('accepted');
    expect((await leads()).get(again.id).welcome_message_status).toBeUndefined();
  });

  it('falha da Meta fica registrada no lead e libera novo cadastro do mesmo número', async () => {
    const fail = vi.fn(
      async () => new Response(JSON.stringify({ error: { message: 'Template name does not exist', type: 'OAuthException', code: 132001 } }), { status: 400 }),
    );
    const lead = makeLead();
    await store.save(lead);
    expect(await sendWelcome(lead, { store, config: makeConfig(), client: client(fail) })).toBe('failed');
    const saved = (await leads()).get(lead.id);
    expect(saved.welcome_message_status).toBe('failed');
    expect(saved.welcome_error_code).toBe('132001');
    expect(saved.welcome_error_message).toContain('Template name does not exist');
    expect(saved.welcome_failed_at).toBeTruthy();

    // O mesmo lead não é reenviado automaticamente...
    const ok = vi.fn(async () => graphOk());
    expect(await sendWelcome(lead, { store, config: makeConfig(), client: client(ok) })).toBe('duplicate');
    // ...mas um novo cadastro do número pode receber.
    const retry = makeLead();
    await store.save(retry);
    expect(await sendWelcome(retry, { store, config: makeConfig(), client: client(ok) })).toBe('accepted');
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('base sem suporte a idempotência não envia', async () => {
    const fetchMock = vi.fn();
    const onlySave: LeadStore = { save: async () => {} };
    expect(await sendWelcome(makeLead(), { store: onlySave, config: makeConfig(), client: client(fetchMock) })).toBe('unsupported_store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('nunca registra o token nos logs', async () => {
    const cfg = makeConfig();
    const fail = vi.fn(async () => new Response(JSON.stringify({ error: { message: `bad token ${cfg.accessToken}`, code: 190 } }), { status: 401 }));
    const lead = makeLead();
    await store.save(lead);
    await sendWelcome(lead, { store, config: cfg, client: new WhatsAppClient(cfg, fail) });
    const logged = [console.info, console.warn, console.error].flatMap((f) => (f as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat()).join('\n');
    expect(logged).not.toContain(cfg.accessToken);
    expect(logged).not.toContain('5511912345678');
    expect(JSON.stringify((await leads()).get(lead.id))).not.toContain(cfg.accessToken);
  });
});
