/**
 * Configuração da integração WhatsApp (Meta Cloud API). Só servidor: nada daqui
 * pode ir para o navegador (nenhuma variável usa o prefixo PUBLIC_).
 *
 * WHATSAPP_ENABLED=false (padrão) desliga todo envio. O webhook continua de pé.
 */

export type EnvGetter = (key: string) => string | undefined;

const defaultEnv: EnvGetter = (k) => process.env[k] || (import.meta.env as Record<string, string | undefined>)[k];

export interface WhatsAppConfig {
  enabled: boolean;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  appSecret: string;
  apiVersion: string;
  welcomeTemplateName: string;
  welcomeTemplateLanguage: string;
  /** Vazio = template com variáveis posicionais ({{1}}). Preenchido = variável nomeada ({{nome}}). */
  welcomeTemplateParamName: string;
}

export function getWhatsAppConfig(env: EnvGetter = defaultEnv): WhatsAppConfig {
  const get = (k: string) => (env(k) || '').trim();
  return {
    enabled: get('WHATSAPP_ENABLED').toLowerCase() === 'true',
    accessToken: get('WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: get('WHATSAPP_PHONE_NUMBER_ID'),
    businessAccountId: get('WHATSAPP_BUSINESS_ACCOUNT_ID'),
    verifyToken: get('WHATSAPP_VERIFY_TOKEN'),
    appSecret: get('WHATSAPP_APP_SECRET'),
    apiVersion: get('WHATSAPP_API_VERSION'),
    welcomeTemplateName: get('WHATSAPP_WELCOME_TEMPLATE_NAME'),
    welcomeTemplateLanguage: get('WHATSAPP_WELCOME_TEMPLATE_LANGUAGE') || 'pt_BR',
    welcomeTemplateParamName: get('WHATSAPP_WELCOME_TEMPLATE_PARAM_NAME'),
  };
}

/** Variáveis que faltam para enviar mensagens. Lista vazia = pronto para enviar. */
export function missingSendConfig(cfg: WhatsAppConfig): string[] {
  const need: [string, string][] = [
    ['WHATSAPP_ACCESS_TOKEN', cfg.accessToken],
    ['WHATSAPP_PHONE_NUMBER_ID', cfg.phoneNumberId],
    ['WHATSAPP_API_VERSION', cfg.apiVersion],
    ['WHATSAPP_WELCOME_TEMPLATE_NAME', cfg.welcomeTemplateName],
  ];
  return need.filter(([, v]) => !v).map(([k]) => k);
}
