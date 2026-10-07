/**
 * /api/leads e /api/webhooks/whatsapp chamados como a Vercel chamaria, com a
 * base local (.data/leads.jsonl) num diretório temporário.
 */
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { getLeadStore } from '../src/lib/leads/store';
import { graphOk, statusPayload, useTempCwd } from './helpers';

const pending: Promise<unknown>[] = [];
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => void pending.push(p) }));

const leadsApi = await import('../src/pages/api/leads');
const hookApi = await import('../src/pages/api/webhooks/whatsapp');

const ENV = {
  WHATSAPP_ACCESS_TOKEN: 'EAAtesttokenvaluethatislongenough123',
  WHATSAPP_PHONE_NUMBER_ID: '100000000000001',
  WHATSAPP_API_VERSION: 'v99.0',
  WHATSAPP_WELCOME_TEMPLATE_NAME: 'boas_vindas_primeiros_da_vila',
  WHATSAPP_VERIFY_TOKEN: 'verify-me',
  WHATSAPP_APP_SECRET: 'app-secret',
};

let restore: () => void;
beforeEach(async () => {
  restore = await useTempCwd();
  pending.length = 0;
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  restore();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const ctx = (request: Request) => ({ request, url: new URL(request.url) }) as unknown as APIContext;
const settle = async () => {
  while (pending.length) await pending.shift();
};

const form = (over: Record<string, unknown> = {}) => ({
  nome: 'Ana Souza',
  nome_cao: 'Pipoca',
  porte: 'medio',
  idade_faixa: 'adulto',
  nascimento: '',
  email: 'ana@example.com',
  whatsapp: '(11) 91234-5678',
  cidade: 'São Paulo',
  uf: 'SP',
  interesses: ['passeios'],
  preferredPlan: 'care',
  consentimento: true,
  consentimento_versao: '2026-10-07',
  consentimento_texto: 'Quero receber novidades da PetVila Club por e-mail.',
  whatsapp_opt_in: true,
  whatsapp_opt_in_texto: 'Aceito receber novidades, lançamentos e comunicações da PetVila Club pelo WhatsApp.',
  cta_origem: 'hero',
  website: '',
  ...over,
});

const postLead = (body: Record<string, unknown>) =>
  leadsApi.POST(ctx(new Request('https://petvilaclub.com.br/api/leads', { method: 'POST', body: JSON.stringify(body) })));

const allLeads = () => getLeadStore()!.list!();

describe('POST /api/leads', () => {
  it('com WHATSAPP_ENABLED=false grava o opt-in e não envia nada', async () => {
    vi.stubEnv('WHATSAPP_ENABLED', 'false');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await postLead(form());
    await settle();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    const [lead] = await allLeads();
    expect(lead).toMatchObject({
      whatsapp: '11912345678',
      whatsapp_e164: '5511912345678',
      whatsapp_opt_in: true,
      whatsapp_opt_in_at: lead.criado_em,
      source: 'lp-primeiros-da-vila',
    });
    expect(lead.welcome_message_status).toBeUndefined();
  });

  it('cadastro atual continua igual sem opt-in (caixa desmarcada)', async () => {
    vi.stubEnv('WHATSAPP_ENABLED', 'true');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { whatsapp_opt_in, whatsapp_opt_in_texto, ...legacy } = form();
    void whatsapp_opt_in, void whatsapp_opt_in_texto;
    expect((await postLead(legacy)).status).toBe(201);
    await settle();
    expect(fetchSpy).not.toHaveBeenCalled();
    const [lead] = await allLeads();
    expect(lead).toMatchObject({ whatsapp_opt_in: false, whatsapp_opt_in_at: '', whatsapp_opt_in_texto: '' });
  });

  it('opt-in só vale como booleano true', async () => {
    vi.stubEnv('WHATSAPP_ENABLED', 'false');
    await postLead(form({ whatsapp_opt_in: 'on' }));
    expect((await allLeads())[0].whatsapp_opt_in).toBe(false);
  });

  it('validação e honeypot continuam como antes', async () => {
    expect((await postLead(form({ email: 'x' }))).status).toBe(422);
    expect((await postLead(form({ website: 'spam' }))).status).toBe(200);
    expect(await allLeads()).toEqual([]);
  });

  it('com WHATSAPP_ENABLED=true envia o template uma vez, mesmo com o formulário reenviado', async () => {
    vi.stubEnv('WHATSAPP_ENABLED', 'true');
    const graph = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => graphOk('wamid.LEAD'));
    expect((await postLead(form())).status).toBe(201);
    await settle();
    expect((await postLead(form())).status).toBe(201); // retry / refresh
    await settle();

    expect(graph).toHaveBeenCalledTimes(1);
    const body = JSON.parse((graph.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toBe('5511912345678');
    expect(body.template.name).toBe('boas_vindas_primeiros_da_vila');
    expect(body.template.components[0].parameters[0].text).toBe('Ana');
    const [first, second] = await allLeads();
    expect(first).toMatchObject({ welcome_message_id: 'wamid.LEAD', welcome_message_status: 'accepted' });
    expect(second.welcome_message_status).toBeUndefined();
  });

  it('erro da Meta não quebra o cadastro nem chega ao navegador', async () => {
    vi.stubEnv('WHATSAPP_ENABLED', 'true');
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify({ error: { message: 'Invalid parameter', code: 100 } }), { status: 400 }),
    );
    const res = await postLead(form());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    await settle();
    expect((await allLeads())[0]).toMatchObject({ welcome_message_status: 'failed', welcome_error_code: '100' });
  });
});

describe('GET /api/webhooks/whatsapp', () => {
  const get = (qs: string) => hookApi.GET(ctx(new Request(`https://petvilaclub.com.br/api/webhooks/whatsapp?${qs}`)));

  it('responde o hub.challenge quando o token confere', async () => {
    const res = await get('hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=1158201444');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('1158201444');
  });

  it('recusa token errado ou sem WHATSAPP_VERIFY_TOKEN', async () => {
    expect((await get('hub.mode=subscribe&hub.verify_token=errado&hub.challenge=1')).status).toBe(403);
    vi.stubEnv('WHATSAPP_VERIFY_TOKEN', '');
    expect((await get('hub.mode=subscribe&hub.verify_token=&hub.challenge=1')).status).toBe(403);
  });
});

describe('POST /api/webhooks/whatsapp', () => {
  const post = (payload: unknown, secret = 'app-secret') => {
    const raw = JSON.stringify(payload);
    const sig = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
    return hookApi.POST(
      ctx(new Request('https://petvilaclub.com.br/api/webhooks/whatsapp', { method: 'POST', body: raw, headers: { 'x-hub-signature-256': sig } })),
    );
  };

  it('atualiza o status do lead pelo wamid', async () => {
    vi.stubEnv('WHATSAPP_ENABLED', 'true');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => graphOk('wamid.HOOK'));
    await postLead(form());
    await settle();

    const res = await post(
      statusPayload([
        { id: 'wamid.HOOK', status: 'sent', timestamp: '1791374400', recipient_id: '5511912345678' },
        { id: 'wamid.HOOK', status: 'read', timestamp: '1791374460', recipient_id: '5511912345678' },
        { id: 'wamid.HOOK', status: 'delivered', timestamp: '1791374430', recipient_id: '5511912345678' },
      ]),
    );
    expect(res.status).toBe(200);
    await settle();
    expect((await allLeads())[0]).toMatchObject({
      welcome_message_status: 'read',
      welcome_sent_at: new Date(1791374400000).toISOString(),
      welcome_delivered_at: new Date(1791374430000).toISOString(),
      welcome_read_at: new Date(1791374460000).toISOString(),
    });
  });

  it('registra falha com código e mensagem', async () => {
    vi.stubEnv('WHATSAPP_ENABLED', 'true');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => graphOk('wamid.FAIL'));
    await postLead(form());
    await settle();
    await post(
      statusPayload([
        {
          id: 'wamid.FAIL',
          status: 'failed',
          timestamp: '1791374400',
          recipient_id: '5511912345678',
          errors: [{ code: 131026, title: 'Message undeliverable', message: 'Message undeliverable', error_data: { details: 'Unable to deliver' } }],
        },
      ]),
    );
    await settle();
    expect((await allLeads())[0]).toMatchObject({
      welcome_message_status: 'failed',
      welcome_error_code: '131026',
      welcome_error_message: 'Message undeliverable: Message undeliverable (Unable to deliver)',
    });
  });

  it('recusa assinatura inválida e JSON inválido', async () => {
    expect((await post(statusPayload([]), 'outro')).status).toBe(401);
    const raw = '{nao-json';
    const sig = 'sha256=' + createHmac('sha256', 'app-secret').update(raw).digest('hex');
    const res = await hookApi.POST(
      ctx(new Request('https://petvilaclub.com.br/api/webhooks/whatsapp', { method: 'POST', body: raw, headers: { 'x-hub-signature-256': sig } })),
    );
    expect(res.status).toBe(400);
  });

  it('sem WHATSAPP_APP_SECRET confirma o recebimento e não grava nada', async () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', '');
    const res = await post(statusPayload([{ id: 'wamid.X', status: 'sent', timestamp: '1' }]));
    expect(res.status).toBe(200);
    expect(pending).toHaveLength(0);
  });
});
