import type { APIRoute } from 'astro';
import { endSession, sameOrigin } from '../../lib/crm/auth';

export const prerender = false;

export const POST: APIRoute = ({ request, cookies, redirect }) => {
  if (!sameOrigin(request)) return new Response('Origem inválida', { status: 403 });
  endSession(cookies);
  return redirect('/crm', 303);
};
