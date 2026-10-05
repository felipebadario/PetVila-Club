/** Sessão do CRM: cookie assinado (HMAC-SHA256) com validade, sem banco de dados. */
import type { AstroCookies } from 'astro';

const COOKIE = 'pv_crm';
const TTL_MS = 12 * 60 * 60 * 1000;
const env = (k: string) => process.env[k] || (import.meta.env as Record<string, string | undefined>)[k] || '';
const enc = new TextEncoder();

async function hmac(data: string) {
  const secret = env('CRM_SESSION_SECRET') || env('CRM_PASSWORD');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Buffer.from(sig).toString('base64url');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const crmConfigured = () => !!env('CRM_PASSWORD');

export async function checkPassword(input: string) {
  const expected = env('CRM_PASSWORD');
  if (!expected) return false;
  // Compara os HMACs para não vazar tamanho/conteúdo pelo tempo de resposta.
  return safeEqual(await hmac('pw:' + input), await hmac('pw:' + expected));
}

export async function startSession(cookies: AstroCookies) {
  const exp = String(Date.now() + TTL_MS);
  cookies.set(COOKIE, `${exp}.${await hmac('s:' + exp)}`, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: TTL_MS / 1000,
  });
}

export function endSession(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: '/' });
}

export async function isAuthed(cookies: AstroCookies) {
  if (!crmConfigured()) return false;
  const v = cookies.get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac('s:' + exp));
}

/** POSTs do CRM só aceitam a mesma origem (além do SameSite=Strict do cookie). */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
