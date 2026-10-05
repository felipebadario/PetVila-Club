import type { APIRoute } from 'astro';
import { isAuthed, sameOrigin } from '../../../lib/crm/auth';
import { getLeadStore, LEAD_STATUSES, type LeadStatus } from '../../../lib/leads/store';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** Atualiza status e/ou nota de um lead. */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!sameOrigin(request) || !(await isAuthed(cookies))) return json(401, { message: 'Sessão expirada. Entre de novo.' });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const status = LEAD_STATUSES.includes(body.status) ? (body.status as LeadStatus) : undefined;
  const nota = typeof body.nota === 'string' ? body.nota.slice(0, 1000) : undefined;
  if (!id || (!status && nota === undefined)) return json(400, { message: 'Nada para atualizar.' });

  const store = getLeadStore();
  if (!store?.update) return json(503, { message: 'A base de leads atual não permite edição.' });
  try {
    await store.update(id, { status, nota });
    return json(200, { ok: true });
  } catch (err) {
    console.error('[crm] falha ao atualizar', id, err instanceof Error ? err.message : err);
    return json(502, { message: 'Não consegui salvar na planilha. Tente de novo.' });
  }
};
