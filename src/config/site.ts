/**
 * Dados institucionais. Itens marcados PENDENTE aguardam definição do negócio;
 * enquanto vazios, os links correspondentes não são exibidos.
 */
export const site = {
  name: 'PetVila Club',
  tagline: 'Cuidado que faz parte da rotina.',
  description:
    'Um clube criado para tornar a vida com seu cão mais prática, divertida e especial. Seja um dos Primeiros da Vila.',
  url: import.meta.env.PUBLIC_SITE_URL || 'https://petvilaclub.com.br',
  locale: 'pt_BR',
  // PENDENTE: @ oficial do Instagram.
  instagram: '',
  // PENDENTE: e-mail de contato público.
  contactEmail: '',
  // PENDENTE: razão social e CNPJ para o rodapé e a Política de Privacidade.
  legalName: '',
  themeColor: '#E25D28',
} as const;

export const env = {
  appEnv: import.meta.env.PUBLIC_APP_ENV || 'development',
  ga4Id: import.meta.env.PUBLIC_GA4_ID || '',
  metaPixelId: import.meta.env.PUBLIC_META_PIXEL_ID || '',
} as const;
