import type { APIRoute } from 'astro';
import { waitUntil } from '@vercel/functions';
import { LEAD_SOURCE, validateLead, type StoredLead } from '../../lib/leads/schema';
import { getLeadStore } from '../../lib/leads/store';
import { clientIp, hit } from '../../lib/security/rate-limit';
import { toWhatsAppNumber } from '../../lib/whatsapp/phone';
import { sendWelcome } from '../../lib/whatsapp/welcome';

export const prerender = false;

// Domínios alternativos que redirecionam para o canônico. Uma aba aberta antes do
// redirecionamento ainda envia o formulário para lá e o POST chega aqui como cross-origin.
const ALT_ORIGINS = new Set(['https://petvilaclub.com', 'https://www.petvilaclub.com', 'https://www.petvilaclub.com.br']);

const cors = (request: Request): Record<string, string> => {
  const origin = request.headers.get('origin') || '';
  return ALT_ORIGINS.has(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};
};

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });

// Um cadastro tem poucos KB; acima disso é abuso.
const MAX_BYTES = 16 * 1024;

export const OPTIONS: APIRoute = ({ request }) =>
  new Response(null, {
    status: 204,
    headers: { ...cors(request), 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' },
  });

export const POST: APIRoute = async ({ request }) => {
  const send = (status: number, body: unknown) => json(status, body, cors(request));
  // Só JSON: obriga o navegador a fazer preflight em envios de outros sites.
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json'))
    return send(415, { message: 'Requisição inválida.' });
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return send(413, { message: 'Requisição inválida.' });
  if (!hit('leads', clientIp(request), 10, 10 * 60 * 1000))
    return send(429, { message: 'Recebemos muitos envios daqui. Tenta de novo em alguns minutos?' });

  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return send(413, { message: 'Requisição inválida.' });
    input = JSON.parse(raw);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('not_object');
  } catch {
    return send(400, { message: 'Requisição inválida.' });
  }

  // Honeypot: robôs preenchem o campo invisível. Respondemos ok e descartamos.
  if (typeof input.website === 'string' && input.website.trim()) return send(200, { ok: true });

  const { ok, data, errors } = validateLead(input);
  if (!ok) return send(422, { message: 'Confira os dados do cadastro.', errors });

  const store = getLeadStore();
  if (!store) {
    console.error('[leads] nenhum destino configurado (LEADS_SHEETS_URL ou LEADS_WEBHOOK_URL): lead não armazenado.');
    return send(503, { message: 'Cadastro indisponível no momento. Tenta de novo em instantes?' });
  }

  const criado_em = new Date().toISOString();
  const lead: StoredLead = {
    id: crypto.randomUUID(),
    criado_em,
    ...data,
    source: LEAD_SOURCE,
    whatsapp_e164: toWhatsAppNumber(data.whatsapp),
    whatsapp_opt_in_at: data.whatsapp_opt_in ? criado_em : '',
  };
  try {
    await store.save(lead);
  } catch (err) {
    console.error('[leads] falha ao salvar', lead.id, err instanceof Error ? err.message : err);
    return send(502, { message: 'Não conseguimos registrar agora. Tenta de novo?' });
  }

  // Boas-vindas pelo WhatsApp depois da resposta: o cadastro não espera pela Meta
  // e nunca falha por causa dela. sendWelcome não lança e respeita WHATSAPP_ENABLED.
  const welcome = sendWelcome(lead, { store });
  try {
    waitUntil(welcome);
  } catch {
    // Fora da Vercel (dev) não há contexto de waitUntil; a promessa segue sozinha.
  }
  return send(201, { ok: true });
};

export const ALL: APIRoute = () => json(405, { message: 'Método não permitido.' });
