/**
 * Boas-vindas dos Primeiros da Vila pelo WhatsApp, sempre por template aprovado.
 *
 * Só envia quando: WHATSAPP_ENABLED=true, configuração completa, opt-in marcado,
 * número válido e a base consegue reservar o envio (claimWelcome). A reserva é o
 * que impede reenvio por refresh, retry do formulário ou reprocessamento.
 * Nunca lança: qualquer falha vira log e, quando possível, fica registrada no lead.
 */
import type { StoredLead } from '../leads/schema';
import type { LeadStore } from '../leads/store';
import { WhatsAppClient, WhatsAppError } from './client';
import { getWhatsAppConfig, missingSendConfig, type WhatsAppConfig } from './config';
import { waLog } from './log';
import { formatError } from './status';

export type WelcomeOutcome =
  | 'disabled'
  | 'no_opt_in'
  | 'invalid_phone'
  | 'misconfigured'
  | 'unsupported_store'
  | 'duplicate'
  | 'claim_failed'
  | 'accepted'
  | 'failed';

export interface WelcomeDeps {
  store: LeadStore | null;
  config?: WhatsAppConfig;
  client?: WhatsAppClient;
}

/** Primeiro nome, para o {{nome}} do template. */
export const firstName = (nome: string) => nome.trim().split(/\s+/)[0]?.slice(0, 60) || 'tutor';

/** Decide sem efeitos colaterais se este lead deveria receber boas-vindas. */
export function welcomeBlocker(lead: StoredLead, cfg: WhatsAppConfig, store: LeadStore | null): WelcomeOutcome | null {
  if (!cfg.enabled) return 'disabled';
  if (!lead.whatsapp_opt_in) return 'no_opt_in';
  if (!lead.whatsapp_e164) return 'invalid_phone';
  if (missingSendConfig(cfg).length) return 'misconfigured';
  if (!store?.claimWelcome || !store.recordWelcome) return 'unsupported_store';
  return null;
}

export async function sendWelcome(lead: StoredLead, deps: WelcomeDeps): Promise<WelcomeOutcome> {
  const cfg = deps.config ?? getWhatsAppConfig();
  const { store } = deps;
  const base = { lead_id: lead.id, phone: lead.whatsapp_e164 };

  const blocked = welcomeBlocker(lead, cfg, store);
  if (blocked) {
    // Desligado ou sem opt-in é o caminho normal: log informativo. O resto pede atenção.
    const level = blocked === 'disabled' || blocked === 'no_opt_in' ? 'info' : 'warn';
    waLog(level, 'welcome.skipped', {
      ...base,
      reason: blocked,
      ...(blocked === 'misconfigured' ? { missing: missingSendConfig(cfg).join(',') } : {}),
    });
    return blocked;
  }

  let claimed: boolean;
  try {
    claimed = await store!.claimWelcome!(lead.id, lead.whatsapp_e164);
  } catch (err) {
    waLog('error', 'welcome.claim_error', { ...base, error: err instanceof Error ? err.message : String(err) });
    return 'claim_failed';
  }
  if (!claimed) {
    waLog('info', 'welcome.skipped', { ...base, reason: 'duplicate' });
    return 'duplicate';
  }

  const client = deps.client ?? new WhatsAppClient(cfg);
  const param = { text: firstName(lead.nome), ...(cfg.welcomeTemplateParamName ? { name: cfg.welcomeTemplateParamName } : {}) };
  waLog('info', 'welcome.attempt', { ...base, template: cfg.welcomeTemplateName, language: cfg.welcomeTemplateLanguage });

  try {
    const res = await client.sendTemplate(lead.whatsapp_e164, cfg.welcomeTemplateName, cfg.welcomeTemplateLanguage, [param]);
    waLog('info', 'welcome.accepted', { ...base, wamid: res.messageId, meta_status: res.status });
    await record(store!, lead.id, {
      welcome_message_id: res.messageId,
      welcome_message_status: 'accepted',
    });
    return 'accepted';
  } catch (err) {
    const e = err instanceof WhatsAppError ? err : new WhatsAppError('network', err instanceof Error ? err.message : String(err));
    waLog('error', 'welcome.send_error', {
      ...base,
      kind: e.kind,
      code: e.code,
      title: e.title,
      error: e.message,
      details: e.details,
      http_status: e.httpStatus,
      fbtrace_id: e.fbtraceId,
    });
    await record(store!, lead.id, {
      welcome_message_status: 'failed',
      welcome_failed_at: new Date().toISOString(),
      welcome_error_code: e.code || e.kind,
      welcome_error_message: formatError({ title: e.title, message: e.message, details: e.details }),
    });
    return 'failed';
  }
}

async function record(store: LeadStore, id: string, patch: Parameters<NonNullable<LeadStore['recordWelcome']>>[1]) {
  try {
    await store.recordWelcome!(id, patch);
  } catch (err) {
    // A mensagem pode ter saído; o wamid fica no log para conciliação manual.
    waLog('error', 'welcome.record_error', { lead_id: id, wamid: patch.welcome_message_id, error: err instanceof Error ? err.message : String(err) });
  }
}
