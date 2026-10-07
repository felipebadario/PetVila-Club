/**
 * Onde os leads moram (servidor). Ordem de escolha:
 * 1. Planilha Google via Apps Script (LEADS_SHEETS_URL + LEADS_SHEETS_TOKEN):
 *    grava, lista e atualiza status. É a base do CRM em /crm.
 * 2. Webhook genérico (LEADS_WEBHOOK_URL): só grava (CRM fica indisponível).
 * 3. Desenvolvimento sem nada configurado: arquivo .data/leads.jsonl.
 * Para trocar por um CRM de verdade depois, implemente LeadStore e ajuste getLeadStore().
 *
 * Os campos welcome_* (boas-vindas pelo WhatsApp) moram nas mesmas linhas do lead.
 * Só a planilha e o arquivo local sabem gravá-los; sem eles nenhum envio acontece.
 */
import type { StoredLead } from './schema';
import {
  WELCOME_FIELDS,
  hasActiveWelcome,
  mergeWelcomeStatus,
  type StatusUpdate,
  type WelcomeFields,
  type WelcomePatch,
} from '../whatsapp/status';

export const LEAD_STATUSES = ['novo', 'contatado', 'qualificado', 'descartado'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type CrmLead = StoredLead &
  Partial<WelcomeFields> & { status: LeadStatus | string; nota: string; atualizado_em: string };

export type StatusResult = 'updated' | 'unchanged' | 'not_found';

export interface LeadStore {
  save(lead: StoredLead): Promise<void>;
  list?(): Promise<CrmLead[]>;
  update?(id: string, patch: { status?: LeadStatus; nota?: string }): Promise<void>;
  /**
   * Idempotência das boas-vindas, atômica na base: reserva o envio para o lead
   * (status "sending") só se ele ainda não tiver status e se nenhum outro lead
   * com o mesmo número tiver boas-vindas em andamento ou entregue.
   */
  claimWelcome?(id: string, phone: string): Promise<boolean>;
  /** Grava o resultado do envio (wamid, status, erro) no lead. */
  recordWelcome?(id: string, patch: WelcomePatch): Promise<void>;
  /** Aplica um status do webhook ao lead que tem esse wamid. */
  applyWelcomeStatus?(update: StatusUpdate): Promise<StatusResult>;
}

const pickWelcome = (patch: WelcomePatch): WelcomePatch =>
  Object.fromEntries(WELCOME_FIELDS.filter((k) => patch[k] !== undefined).map((k) => [k, String(patch[k])]));

const env = (k: string) => process.env[k] || (import.meta.env as Record<string, string | undefined>)[k] || '';

class SheetsStore implements LeadStore {
  constructor(private url: string, private token: string) {}

  private async post(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' }, // Apps Script lê o corpo cru
      body: JSON.stringify({ ...body, token: this.token }),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    const out = await res.json().catch(() => ({ ok: false, error: `http_${res.status}` }));
    if (!out.ok) throw new Error(`planilha: ${out.error}`);
    return out;
  }

  async save(lead: StoredLead) {
    await this.post({ action: 'append', lead });
  }

  async list() {
    const u = new URL(this.url);
    u.searchParams.set('action', 'list');
    u.searchParams.set('token', this.token);
    const res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const out = await res.json();
    if (!out.ok) throw new Error(`planilha: ${out.error}`);
    return out.leads as CrmLead[];
  }

  async update(id: string, patch: { status?: LeadStatus; nota?: string }) {
    await this.post({ action: 'update', id, ...patch });
  }

  // Exigem a versão do Code.gs com welcome_*; a anterior responde unknown_action (erro).
  async claimWelcome(id: string, phone: string) {
    const out = await this.post({ action: 'welcome_claim', id, phone });
    return out.claimed === true;
  }

  async recordWelcome(id: string, patch: WelcomePatch) {
    await this.post({ action: 'welcome_record', id, patch: pickWelcome(patch) });
  }

  async applyWelcomeStatus(update: StatusUpdate) {
    const out = await this.post({ action: 'welcome_status', update });
    return (out.result as StatusResult) || 'unchanged';
  }
}

class WebhookStore implements LeadStore {
  constructor(private url: string, private token?: string) {}
  async save(lead: StoredLead) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`webhook respondeu ${res.status}`);
  }
}

class LocalFileStore implements LeadStore {
  private file = '.data/leads.jsonl';
  private async read(): Promise<CrmLead[]> {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(this.file, 'utf8').catch(() => '');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((l) => ({ status: 'novo', nota: '', atualizado_em: '', ...JSON.parse(l) }));
  }
  private async write(leads: CrmLead[]) {
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir('.data', { recursive: true });
    await writeFile(this.file, leads.map((l) => JSON.stringify(l)).join('\n') + '\n');
  }
  async save(lead: StoredLead) {
    const all = await this.read();
    all.push({ ...lead, status: 'novo', nota: '', atualizado_em: '' });
    await this.write(all);
  }
  list() {
    return this.read();
  }
  async update(id: string, patch: { status?: LeadStatus; nota?: string }) {
    const all = await this.read();
    const l = all.find((x) => x.id === id);
    if (!l) throw new Error('not_found');
    if (patch.status) l.status = patch.status;
    if (patch.nota !== undefined) l.nota = patch.nota;
    l.atualizado_em = new Date().toISOString();
    await this.write(all);
  }
  async claimWelcome(id: string, phone: string) {
    const all = await this.read();
    const l = all.find((x) => x.id === id);
    if (!l || l.welcome_message_status || all.some((x) => hasActiveWelcome(x, phone))) return false;
    l.welcome_message_status = 'sending';
    await this.write(all);
    return true;
  }
  async recordWelcome(id: string, patch: WelcomePatch) {
    const all = await this.read();
    const l = all.find((x) => x.id === id);
    if (!l) throw new Error('not_found');
    Object.assign(l, pickWelcome(patch));
    await this.write(all);
  }
  async applyWelcomeStatus(update: StatusUpdate): Promise<StatusResult> {
    const all = await this.read();
    const l = all.find((x) => x.welcome_message_id === update.wamid);
    if (!l) return 'not_found';
    const patch = mergeWelcomeStatus(l, update);
    if (!Object.keys(patch).length) return 'unchanged';
    Object.assign(l, patch);
    await this.write(all);
    return 'updated';
  }
}

export function getLeadStore(): LeadStore | null {
  const sheetsUrl = env('LEADS_SHEETS_URL');
  const sheetsToken = env('LEADS_SHEETS_TOKEN');
  if (sheetsUrl && sheetsToken) return new SheetsStore(sheetsUrl, sheetsToken);
  const webhook = env('LEADS_WEBHOOK_URL');
  if (webhook) return new WebhookStore(webhook, env('LEADS_WEBHOOK_TOKEN') || undefined);
  if (import.meta.env.DEV) return new LocalFileStore();
  return null;
}
