/**
 * Onde os leads moram (servidor). Ordem de escolha:
 * 1. Planilha Google via Apps Script (LEADS_SHEETS_URL + LEADS_SHEETS_TOKEN):
 *    grava, lista e atualiza status. É a base do CRM em /crm.
 * 2. Webhook genérico (LEADS_WEBHOOK_URL): só grava (CRM fica indisponível).
 * 3. Desenvolvimento sem nada configurado: arquivo .data/leads.jsonl.
 * Para trocar por um CRM de verdade depois, implemente LeadStore e ajuste getLeadStore().
 */
import type { StoredLead } from './schema';

export const LEAD_STATUSES = ['novo', 'contatado', 'qualificado', 'descartado'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type CrmLead = StoredLead & { status: LeadStatus | string; nota: string; atualizado_em: string };

export interface LeadStore {
  save(lead: StoredLead): Promise<void>;
  list?(): Promise<CrmLead[]>;
  update?(id: string, patch: { status?: LeadStatus; nota?: string }): Promise<void>;
}

const env = (k: string) => process.env[k] || (import.meta.env as Record<string, string | undefined>)[k] || '';

class SheetsStore implements LeadStore {
  constructor(private url: string, private token: string) {}

  private async post(body: Record<string, unknown>) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' }, // Apps Script lê o corpo cru
      body: JSON.stringify({ ...body, token: this.token }),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    const out = await res.json().catch(() => ({ ok: false, error: `http_${res.status}` }));
    if (!out.ok) throw new Error(`planilha: ${out.error}`);
  }

  save(lead: StoredLead) {
    return this.post({ action: 'append', lead });
  }

  async list() {
    // Token no corpo (POST), não na URL, para não ficar em logs de acesso.
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'list', token: this.token }),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    let out = await res.json().catch(() => ({ ok: false, error: `http_${res.status}` }));
    // Compatibilidade com a versão anterior do Apps Script, que só lista por GET.
    if (out.error === 'unknown_action') out = await this.listLegacy();
    if (!out.ok) throw new Error(`planilha: ${out.error}`);
    return out.leads as CrmLead[];
  }

  private async listLegacy() {
    const u = new URL(this.url);
    u.searchParams.set('action', 'list');
    u.searchParams.set('token', this.token);
    const res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return res.json();
  }

  update(id: string, patch: { status?: LeadStatus; nota?: string }) {
    return this.post({ action: 'update', id, ...patch });
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
