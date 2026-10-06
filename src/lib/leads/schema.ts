/**
 * Formato do lead "Primeiros da Vila". Compartilhado entre o formulário
 * (validação imediata) e /api/leads (validação definitiva).
 */

export const SIZES = ['pequeno', 'medio', 'grande'] as const;
export const AGES = ['filhote', 'jovem', 'adulto', 'senior'] as const;
export const INTERESTS = ['alimentacao', 'brinquedos', 'higiene', 'passeios', 'organizacao', 'viagens'] as const;
/** Plano de interesse. '' = não informado (leads anteriores ao campo). */
export const PLANS = ['essential', 'care', 'undecided'] as const;
export type PreferredPlan = (typeof PLANS)[number];
export const isPlan = (v: unknown): v is PreferredPlan => (PLANS as readonly unknown[]).includes(v);
export const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

export interface Lead {
  nome: string;
  email: string;
  whatsapp: string; // só dígitos, com DDD
  nome_cao: string;
  porte: (typeof SIZES)[number];
  idade_faixa: (typeof AGES)[number] | '';
  nascimento: string; // AAAA-MM-DD ou ''
  cidade: string;
  uf: (typeof UFS)[number];
  interesses: (typeof INTERESTS)[number][];
  preferredPlan: PreferredPlan | '';
  consentimento: true;
  consentimento_versao: string;
  consentimento_texto: string;
  cta_origem: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  referrer: string;
  landing_page: string;
}

/** Lead como fica armazenado: com carimbo do servidor. */
export interface StoredLead extends Lead {
  id: string;
  criado_em: string; // ISO 8601, UTC
}

export type LeadErrors = Partial<Record<keyof Lead, string>>;

const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const onlyDigits = (v: string) => v.replace(/\D/g, '');

/** Aceita 10 ou 11 dígitos (com DDD), opcionalmente com 55 na frente. */
export function normalizeWhatsapp(v: string) {
  let d = onlyDigits(v);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
}

/** Valida apenas os campos informados em `fields` (para validar etapa por etapa). */
export function validateLead(input: Record<string, unknown>, fields?: (keyof Lead)[]) {
  const e: LeadErrors = {};
  const want = (k: keyof Lead) => !fields || fields.includes(k);

  const nome = str(input.nome, 80);
  const nome_cao = str(input.nome_cao, 60);
  const email = str(input.email, 160).toLowerCase();
  const whatsapp = normalizeWhatsapp(str(input.whatsapp, 30));
  const cidade = str(input.cidade, 80);
  const uf = str(input.uf, 2).toUpperCase();
  const porte = str(input.porte, 10);
  const idade_faixa = str(input.idade_faixa, 10);
  const nascimento = str(input.nascimento, 10);
  const preferredPlan = str(input.preferredPlan, 20);
  const interesses = Array.isArray(input.interesses)
    ? input.interesses.filter((i): i is Lead['interesses'][number] => (INTERESTS as readonly string[]).includes(i as string))
    : [];

  if (want('nome') && nome.length < 2) e.nome = 'Conta pra gente como podemos te chamar.';
  if (want('nome_cao') && nome_cao.length < 1) e.nome_cao = 'Qual é o nome do seu cão?';
  if (want('porte') && !(SIZES as readonly string[]).includes(porte)) e.porte = 'Escolha o porte.';
  if (want('idade_faixa') && !idade_faixa && !nascimento)
    e.idade_faixa = 'Escolha uma idade aproximada ou informe o nascimento.';
  if (want('idade_faixa') && idade_faixa && !(AGES as readonly string[]).includes(idade_faixa))
    e.idade_faixa = 'Escolha uma idade aproximada.';
  if (want('nascimento') && nascimento) {
    const d = new Date(nascimento + 'T12:00:00Z');
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(nascimento) && !isNaN(+d) && d <= new Date() && d.getUTCFullYear() > 1995;
    if (!ok) e.nascimento = 'Confira a data de nascimento.';
  }
  if (want('email') && !EMAIL.test(email)) e.email = 'Confira seu e-mail.';
  if (want('whatsapp') && !(whatsapp.length === 10 || whatsapp.length === 11))
    e.whatsapp = 'Informe o WhatsApp com DDD.';
  if (want('cidade') && cidade.length < 2) e.cidade = 'Qual é a sua cidade?';
  if (want('uf') && !(UFS as readonly string[]).includes(uf)) e.uf = 'Escolha o estado.';
  // Obrigatório na etapa do formulário. No servidor, vazio é aceito para não perder
  // cadastros de abas abertas antes do campo existir; valor desconhecido é recusado.
  if (fields?.includes('preferredPlan') && !preferredPlan) e.preferredPlan = 'Escolha uma das opções.';
  else if (want('preferredPlan') && preferredPlan && !isPlan(preferredPlan)) e.preferredPlan = 'Escolha uma das opções.';
  if (want('consentimento') && input.consentimento !== true)
    e.consentimento = 'Precisamos do seu consentimento para te avisar do lançamento.';

  const data: Lead = {
    nome,
    email,
    whatsapp,
    nome_cao,
    porte: porte as Lead['porte'],
    idade_faixa: idade_faixa as Lead['idade_faixa'],
    nascimento,
    cidade,
    uf: uf as Lead['uf'],
    interesses: [...new Set(interesses)],
    preferredPlan: isPlan(preferredPlan) ? preferredPlan : '',
    consentimento: true,
    consentimento_versao: str(input.consentimento_versao, 20),
    consentimento_texto: str(input.consentimento_texto, 300),
    cta_origem: str(input.cta_origem, 40),
    utm_source: str(input.utm_source, 150),
    utm_medium: str(input.utm_medium, 150),
    utm_campaign: str(input.utm_campaign, 150),
    utm_content: str(input.utm_content, 150),
    utm_term: str(input.utm_term, 150),
    referrer: str(input.referrer, 200),
    landing_page: str(input.landing_page, 300),
  };

  return { ok: Object.keys(e).length === 0, data, errors: e };
}
