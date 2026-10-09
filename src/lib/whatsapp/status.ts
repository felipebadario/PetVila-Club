/**
 * Status da mensagem de boas-vindas e regras de atualização. A mesma lógica
 * está espelhada em integrations/google-sheets/Code.gs (welcomeClaim_ e
 * welcomeStatus_); mudou aqui, mude lá.
 */

/**
 * sending: envio reservado (idempotência), aguardando a resposta da Meta.
 * accepted: a Meta aceitou o pedido e devolveu o wamid.
 * sent / delivered / read / failed: vindos do webhook (failed também no envio).
 */
export const WELCOME_STATUSES = ['sending', 'accepted', 'sent', 'delivered', 'read', 'failed'] as const;
export type WelcomeStatus = (typeof WELCOME_STATUSES)[number];

/** Status que chegam pelo webhook e que acompanhamos. */
export const WEBHOOK_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];

export interface WelcomeFields {
  welcome_message_id: string;
  welcome_message_status: WelcomeStatus | '';
  welcome_sent_at: string;
  welcome_delivered_at: string;
  welcome_read_at: string;
  welcome_failed_at: string;
  welcome_error_code: string;
  welcome_error_message: string;
}

export type WelcomePatch = Partial<WelcomeFields>;
export const WELCOME_FIELDS = [
  'welcome_message_id',
  'welcome_message_status',
  'welcome_sent_at',
  'welcome_delivered_at',
  'welcome_read_at',
  'welcome_failed_at',
  'welcome_error_code',
  'welcome_error_message',
] as const satisfies readonly (keyof WelcomeFields)[];

export interface StatusError {
  code: string;
  title: string;
  message: string;
  details: string;
}

/** Atualização de status já extraída do webhook. */
export interface StatusUpdate {
  wamid: string;
  status: WebhookStatus;
  timestamp: string; // ISO 8601
  recipientId: string;
  error?: StatusError;
}

const RANK: Record<string, number> = { sending: 0, accepted: 1, sent: 2, delivered: 3, read: 4 };
const AT: Record<WebhookStatus, 'welcome_sent_at' | 'welcome_delivered_at' | 'welcome_read_at' | 'welcome_failed_at'> = {
  sent: 'welcome_sent_at',
  delivered: 'welcome_delivered_at',
  read: 'welcome_read_at',
  failed: 'welcome_failed_at',
};

/** Texto de erro gravado na planilha: "título: mensagem (detalhes)", curto. */
export function formatError(e: Partial<StatusError>): string {
  const head = [e.title, e.message].filter(Boolean).join(': ');
  return (e.details ? `${head} (${e.details})` : head).slice(0, 500);
}

/**
 * Campos a gravar no lead para um status do webhook. Os webhooks podem chegar fora
 * de ordem: o carimbo de cada etapa é gravado uma vez, e o status só avança
 * (sent < delivered < read). "failed" prevalece e não é sobrescrito depois.
 */
export function mergeWelcomeStatus(current: Partial<WelcomeFields>, update: StatusUpdate): WelcomePatch {
  const patch: WelcomePatch = {};
  const atField = AT[update.status];
  if (!current[atField]) patch[atField] = update.timestamp;

  const now = current.welcome_message_status || '';
  if (update.status === 'failed') {
    if (now !== 'failed') patch.welcome_message_status = 'failed';
    if (update.error) {
      patch.welcome_error_code = update.error.code;
      patch.welcome_error_message = formatError(update.error);
    }
  } else if (now !== 'failed' && (RANK[update.status] ?? -1) > (RANK[now] ?? -1)) {
    patch.welcome_message_status = update.status;
  }
  return patch;
}

/** Já existe boas-vindas em andamento ou entregue para este número (falha não conta). */
export function hasActiveWelcome(l: Partial<WelcomeFields> & { whatsapp_e164?: string }, phone: string) {
  return l.whatsapp_e164 === phone && !!l.welcome_message_status && l.welcome_message_status !== 'failed';
}
