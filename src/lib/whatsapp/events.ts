/**
 * Processa os eventos do webhook depois que a Meta já recebeu o 200.
 * Status das mensagens enviadas atualizam o lead pelo wamid; mensagens recebidas
 * por enquanto só são registradas em log (sem chatbot nem resposta automática).
 */
import type { LeadStore } from '../leads/store';
import { waLog } from './log';
import type { StatusUpdate } from './status';
import type { ParsedWebhook } from './webhook';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * O webhook "sent" pode chegar antes de o wamid ter sido gravado na planilha
 * (o envio e a gravação levam alguns segundos). Por isso "not_found" tenta de novo.
 */
const RETRY_MS = [3000, 8000];

export async function processWebhook(parsed: ParsedWebhook, store: LeadStore | null, retryMs: number[] = RETRY_MS) {
  for (const m of parsed.messages) {
    waLog('info', 'webhook.message_received', { wamid: m.id, from: m.from, type: m.type, at: m.timestamp });
  }
  if (!parsed.statuses.length) return;
  if (!store?.applyWelcomeStatus) {
    waLog('warn', 'webhook.status_unsupported_store', { count: parsed.statuses.length });
    return;
  }
  // Em ordem: delivered depois de sent, read depois de delivered (a regra de merge tolera o contrário).
  for (const u of parsed.statuses) await applyOne(store, u, retryMs);
}

async function applyOne(store: LeadStore, u: StatusUpdate, retryMs: number[]) {
  const base = { wamid: u.wamid, status: u.status, recipient_id: u.recipientId };
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await store.applyWelcomeStatus!(u);
      if (result === 'not_found' && attempt < retryMs.length) {
        await sleep(retryMs[attempt]);
        continue;
      }
      // Sem correspondência: mensagem que não é boas-vindas (ex.: enviada por outro canal).
      waLog('info', result === 'not_found' ? 'webhook.status_unmatched' : 'webhook.status_applied', {
        ...base,
        result,
        ...(u.error ? { error_code: u.error.code, error_title: u.error.title } : {}),
      });
      return;
    } catch (err) {
      waLog('error', 'webhook.status_error', { ...base, error: err instanceof Error ? err.message : String(err) });
      return;
    }
  }
}
