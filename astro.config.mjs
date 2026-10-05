// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Domínio canônico. Pode ser sobrescrito em preview com PUBLIC_SITE_URL.
const site = process.env.PUBLIC_SITE_URL || 'https://petvilaclub.com.br';

export default defineConfig({
  site,
  // Página estática; só /api/leads roda sob demanda (prerender = false).
  output: 'static',
  adapter: vercel({ webAnalytics: { enabled: false } }),
  trailingSlash: 'never',
  build: { inlineStylesheets: 'auto' },
  prefetch: false,
  devToolbar: { enabled: false },
});
