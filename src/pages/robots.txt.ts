import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const prod = (import.meta.env.PUBLIC_APP_ENV || 'development') === 'production';
  const body = prod
    ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /crm\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
