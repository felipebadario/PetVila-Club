import type { APIRoute } from 'astro';
import { checkPassword, startSession, sameOrigin } from '../../lib/crm/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!sameOrigin(request)) return new Response('Origem inválida', { status: 403 });
  const form = await request.formData();
  if (await checkPassword(String(form.get('senha') || ''))) {
    await startSession(cookies);
    return redirect('/crm', 303);
  }
  await new Promise((r) => setTimeout(r, 800)); // freia tentativa e erro
  return redirect('/crm?erro=1', 303);
};
