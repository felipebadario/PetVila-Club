import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StoredLead } from '../src/lib/leads/schema';
import type { WhatsAppConfig } from '../src/lib/whatsapp/config';

export function makeLead(over: Partial<StoredLead> = {}): StoredLead {
  return {
    id: crypto.randomUUID(),
    criado_em: '2026-10-07T12:00:00.000Z',
    nome: 'Ana Souza',
    email: 'ana@example.com',
    whatsapp: '11912345678',
    nome_cao: 'Pipoca',
    porte: 'medio',
    idade_faixa: 'adulto',
    nascimento: '',
    cidade: 'São Paulo',
    uf: 'SP',
    interesses: ['passeios'],
    preferredPlan: 'care',
    consentimento: true,
    consentimento_versao: '2026-10-07',
    consentimento_texto: 'texto',
    whatsapp_opt_in: true,
    whatsapp_opt_in_texto: 'Aceito receber...',
    cta_origem: 'hero',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    referrer: '',
    landing_page: '/',
    source: 'lp-primeiros-da-vila',
    whatsapp_e164: '5511912345678',
    whatsapp_opt_in_at: '2026-10-07T12:00:00.000Z',
    ...over,
  };
}

export function makeConfig(over: Partial<WhatsAppConfig> = {}): WhatsAppConfig {
  return {
    enabled: true,
    accessToken: 'EAAtesttokenvaluethatislongenough123',
    phoneNumberId: '100000000000001',
    businessAccountId: '200000000000002',
    verifyToken: 'verify-me',
    appSecret: 'app-secret',
    apiVersion: 'v99.0',
    welcomeTemplateName: 'boas_vindas_primeiros_da_vila',
    welcomeTemplateLanguage: 'pt_BR',
    welcomeTemplateParamName: '',
    ...over,
  };
}

/** Resposta de sucesso do POST /messages da Cloud API. */
export const graphOk = (wamid = 'wamid.TEST1') =>
  new Response(
    JSON.stringify({
      messaging_product: 'whatsapp',
      contacts: [{ input: '5511912345678', wa_id: '5511912345678' }],
      messages: [{ id: wamid, message_status: 'accepted' }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

/** Diretório temporário como cwd: o LocalFileStore grava em .data/leads.jsonl. */
export async function useTempCwd() {
  const dir = await mkdtemp(join(tmpdir(), 'petvila-test-'));
  const prev = process.cwd();
  process.chdir(dir);
  return () => process.chdir(prev);
}

/** Corpo de webhook de status no formato documentado pela Meta. */
export function statusPayload(statuses: Record<string, unknown>[]) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '200000000000002',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '551100000000', phone_number_id: '100000000000001' },
              statuses,
            },
          },
        ],
      },
    ],
  };
}
