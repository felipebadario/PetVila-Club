/**
 * Log estruturado da integração, sem dados sensíveis: telefones mascarados e
 * qualquer segredo conhecido trocado por [redacted] antes de imprimir.
 */
import { maskPhone } from './phone';

const PHONE_KEYS = new Set(['phone', 'to', 'from', 'wa_id', 'recipient_id', 'whatsapp', 'whatsapp_e164']);
const SECRET_KEYS = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET', 'LEADS_SHEETS_TOKEN'];

/** Remove de um texto qualquer segredo configurado (ex.: token ecoado numa mensagem de erro). */
export function redact(text: string): string {
  let out = text;
  for (const k of SECRET_KEYS) {
    const v = process.env[k];
    if (v && v.length >= 6) out = out.split(v).join('[redacted]');
  }
  // Padrões de token da Meta e cabeçalhos Bearer, mesmo que não estejam no env.
  return out.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]').replace(/\bEA[A-Za-z0-9]{20,}/g, '[redacted]');
}

function clean(fields: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (PHONE_KEYS.has(k)) out[k] = maskPhone(v);
    else if (typeof v === 'string') out[k] = redact(v).slice(0, 500);
    else out[k] = v;
  }
  return out;
}

type Level = 'info' | 'warn' | 'error';

export function waLog(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ scope: 'whatsapp', event, ...clean(fields) });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}
