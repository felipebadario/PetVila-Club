/**
 * Destino dos leads (servidor). Hoje: webhook genérico (CRM, planilha,
 * Make/Zapier, n8n...) definido em LEADS_WEBHOOK_URL. Em desenvolvimento,
 * sem webhook, grava em .data/leads.jsonl.
 * Para integrar uma ferramenta específica, implemente outro LeadStore aqui.
 */
import type { StoredLead } from './schema';

export interface LeadStore {
  save(lead: StoredLead): Promise<void>;
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
  async save(lead: StoredLead) {
    const { mkdir, appendFile } = await import('node:fs/promises');
    await mkdir('.data', { recursive: true });
    await appendFile('.data/leads.jsonl', JSON.stringify(lead) + '\n');
  }
}

export function getLeadStore(): LeadStore | null {
  const url = process.env.LEADS_WEBHOOK_URL || import.meta.env.LEADS_WEBHOOK_URL;
  const token = process.env.LEADS_WEBHOOK_TOKEN || import.meta.env.LEADS_WEBHOOK_TOKEN;
  if (url) return new WebhookStore(url, token);
  if (import.meta.env.DEV) return new LocalFileStore();
  return null;
}
