/**
 * Dados institucionais. Campos vazios escondem os links correspondentes.
 */
export const site = {
  name: 'PetVila Club',
  tagline: 'Cuidado que faz parte da rotina.',
  description:
    'PetVila Club é um clube de assinatura mensal para cães: todo mês, uma nova curadoria para a rotina de vocês. Seja um dos Primeiros da Vila.',
  url: import.meta.env.PUBLIC_SITE_URL || 'https://petvilaclub.com.br',
  locale: 'pt_BR',
  instagram: 'petvilaclub',
  contactEmail: 'contato@petvilaclub.com',
  legalName: 'Pet Vila Club LTDA',
  cnpj: '69.194.320/0001-26',
  themeColor: '#E25D28',
} as const;

export const env = {
  appEnv: import.meta.env.PUBLIC_APP_ENV || 'development',
  ga4Id: import.meta.env.PUBLIC_GA4_ID || '',
  metaPixelId: import.meta.env.PUBLIC_META_PIXEL_ID || '',
} as const;
