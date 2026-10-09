import type { APIRoute } from 'astro';
import { checkPassword, startSession, sameOrigin } from '../../lib/crm/auth';
import { clear, clientIp, hit } from '../../lib/security/rate-limit';

export const prerender = false;

const MAX_TENTATIVAS = 8;
const JANELA_MS = 15 * 60 * 1000;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!sameOrigin(request)) return new Response('Origem inválida', { status: 403 });
  const ip = clientIp(request);
  if (!hit('crm-login', ip, MAX_TENTATIVAS, JANELA_MS)) {
    console.warn('[crm] login bloqueado por excesso de tentativas', ip);
    return redirect('/crm?erro=limite', 303);
  }
  const form = await request.formData();
  if (await checkPassword(String(form.get('senha') || ''))) {
    clear('crm-login', ip);
    await startSession(cookies);
    return redirect('/crm', 303);
  }
  await new Promise((r) => setTimeout(r, 800)); // freia tentativa e erro
  return redirect('/crm?erro=1', 303);
};
