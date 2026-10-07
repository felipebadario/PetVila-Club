/**
 * Webhook da WhatsApp Business Platform (Meta).
 * URL de callback no painel da Meta: https://petvilaclub.com.br/api/webhooks/whatsapp
 *
 * GET: verificação inicial (hub.mode, hub.verify_token, hub.challenge).
 * POST: eventos. Confere a assinatura, responde 200 na hora e processa depois.
 */
import type { APIRoute } from 'astro';
import { waitUntil } from '@vercel/functions';
import { getLeadStore } from '../../../lib/leads/store';
import { getWhatsAppConfig } from '../../../lib/whatsapp/config';
import { processWebhook } from '../../../lib/whatsapp/events';
import { waLog } from '../../../lib/whatsapp/log';
import { parseWebhook, verifySignature, verifySubscription } from '../../../lib/whatsapp/webhook';

export const prerender = false;

const text = (status: number, body = '') =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

export const GET: APIRoute = ({ url }) => {
  const cfg = getWhatsAppConfig();
  if (!cfg.verifyToken) {
    waLog('warn', 'webhook.verify_rejected', { reason: 'verify_token_not_configured' });
    return text(403, 'Forbidden');
  }
  const challenge = verifySubscription(url.searchParams, cfg.verifyToken);
  if (challenge === null) {
    waLog('warn', 'webhook.verify_rejected', { reason: 'mode_or_token_mismatch', mode: url.searchParams.get('hub.mode') ?? '' });
    return text(403, 'Forbidden');
  }
  waLog('info', 'webhook.verified');
  return text(200, challenge);
};

export const POST: APIRoute = async ({ request }) => {
  const cfg = getWhatsAppConfig();
  const raw = await request.text().catch(() => '');

  // Sem App Secret não há como provar que o evento veio da Meta: confirma o
  // recebimento (para a Meta não reenviar sem parar) e não grava nada.
  if (!cfg.appSecret) {
    waLog('warn', 'webhook.ignored', { reason: 'app_secret_not_configured', bytes: raw.length });
    return text(200, 'ok');
  }
  if (!verifySignature(raw, request.headers.get('x-hub-signature-256'), cfg.appSecret)) {
    waLog('warn', 'webhook.rejected', { reason: 'invalid_signature', bytes: raw.length });
    return text(401, 'Unauthorized');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    waLog('warn', 'webhook.rejected', { reason: 'invalid_json', bytes: raw.length });
    return text(400, 'Bad Request');
  }

  const parsed = parseWebhook(payload);
  waLog('info', 'webhook.received', { statuses: parsed.statuses.length, messages: parsed.messages.length, ignored: parsed.ignored });

  const work = processWebhook(parsed, getLeadStore()).catch((err) =>
    waLog('error', 'webhook.process_error', { error: err instanceof Error ? err.message : String(err) }),
  );
  try {
    waitUntil(work);
  } catch {
    // Fora da Vercel (dev) não há contexto de waitUntil; a promessa segue sozinha.
  }
  return text(200, 'ok');
};

export const ALL: APIRoute = () => text(405, 'Method Not Allowed');
