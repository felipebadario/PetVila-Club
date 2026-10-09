/**
 * Webhook da WhatsApp Business Platform: verificação (GET), assinatura (POST)
 * e leitura defensiva do corpo. Nada aqui grava dados; quem decide é o endpoint.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { WEBHOOK_STATUSES, type StatusUpdate, type WebhookStatus } from './status';

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Handshake da Meta: devolve o hub.challenge só se o token conferir. */
export function verifySubscription(params: URLSearchParams, verifyToken: string): string | null {
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token') || '';
  const challenge = params.get('hub.challenge');
  if (!verifyToken || mode !== 'subscribe' || challenge === null) return null;
  return safeEqual(token, verifyToken) ? challenge : null;
}

/** Confere o X-Hub-Signature-256 (HMAC-SHA256 do corpo cru com o App Secret). */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!appSecret || !header?.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  return safeEqual(header, expected);
}

export interface InboundMessage {
  id: string;
  from: string;
  type: string;
  timestamp: string;
}

export interface ParsedWebhook {
  statuses: StatusUpdate[];
  messages: InboundMessage[];
  /** Itens que não reconhecemos (campo, status ou formato inesperado). */
  ignored: number;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const s = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

/** Timestamp da Meta (segundos Unix, em string) -> ISO 8601. Sem valor válido, usa agora. */
function iso(ts: unknown): string {
  const n = Number(s(ts));
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : new Date().toISOString();
}

/** Lê o corpo sem assumir formato fixo: campos ausentes ou estranhos são ignorados. */
export function parseWebhook(payload: unknown): ParsedWebhook {
  const out: ParsedWebhook = { statuses: [], messages: [], ignored: 0 };
  if (!isObj(payload) || payload.object !== 'whatsapp_business_account') {
    out.ignored++;
    return out;
  }
  for (const entry of arr(payload.entry)) {
    if (!isObj(entry)) { out.ignored++; continue; }
    for (const change of arr(entry.changes)) {
      if (!isObj(change) || !isObj(change.value)) { out.ignored++; continue; }
      if (change.field !== undefined && change.field !== 'messages') { out.ignored++; continue; }
      const value = change.value;

      for (const st of arr(value.statuses)) {
        if (!isObj(st) || !s(st.id) || !(WEBHOOK_STATUSES as readonly string[]).includes(s(st.status))) {
          out.ignored++;
          continue;
        }
        const update: StatusUpdate = {
          wamid: s(st.id),
          status: s(st.status) as WebhookStatus,
          timestamp: iso(st.timestamp),
          recipientId: s(st.recipient_id),
        };
        const err = arr(st.errors)[0];
        if (isObj(err)) {
          const data = isObj(err.error_data) ? err.error_data : {};
          update.error = {
            code: s(err.code),
            title: s(err.title),
            message: s(err.message),
            details: s(data.details),
          };
        }
        out.statuses.push(update);
      }

      for (const m of arr(value.messages)) {
        if (!isObj(m) || !s(m.id)) { out.ignored++; continue; }
        out.messages.push({ id: s(m.id), from: s(m.from), type: s(m.type) || 'unknown', timestamp: iso(m.timestamp) });
      }
    }
  }
  return out;
}
