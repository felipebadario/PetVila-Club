import type { APIRoute } from 'astro';
import { validateLead, type StoredLead } from '../../lib/leads/schema';
import { getLeadStore } from '../../lib/leads/store';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json(400, { message: 'Requisição inválida.' });
  }

  // Honeypot: robôs preenchem o campo invisível. Respondemos ok e descartamos.
  if (typeof input.website === 'string' && input.website.trim()) return json(200, { ok: true });

  const { ok, data, errors } = validateLead(input);
  if (!ok) return json(422, { message: 'Confira os dados do cadastro.', errors });

  const store = getLeadStore();
  if (!store) {
    console.error('[leads] LEADS_WEBHOOK_URL não configurado: lead não armazenado.');
    return json(503, { message: 'Cadastro indisponível no momento. Tenta de novo em instantes?' });
  }

  const lead: StoredLead = { id: crypto.randomUUID(), criado_em: new Date().toISOString(), ...data };
  try {
    await store.save(lead);
  } catch (err) {
    console.error('[leads] falha ao salvar', lead.id, err instanceof Error ? err.message : err);
    return json(502, { message: 'Não conseguimos registrar agora. Tenta de novo?' });
  }
  return json(201, { ok: true });
};

export const ALL: APIRoute = () => json(405, { message: 'Método não permitido.' });
