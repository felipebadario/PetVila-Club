import { describe, expect, it, vi } from 'vitest';
import { WhatsAppClient, WhatsAppError } from '../src/lib/whatsapp/client';
import { graphOk, makeConfig } from './helpers';

describe('WhatsAppClient.sendTemplate', () => {
  it('monta a chamada da Cloud API com template, idioma e nome do lead', async () => {
    const fetchMock = vi.fn(async () => graphOk('wamid.ABC'));
    const cfg = makeConfig();
    const res = await new WhatsAppClient(cfg, fetchMock).sendTemplate('5511912345678', 'boas_vindas', 'pt_BR', [{ text: 'Ana' }]);

    expect(res).toEqual({ messageId: 'wamid.ABC', status: 'accepted', waId: '5511912345678' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v99.0/100000000000001/messages');
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${cfg.accessToken}`);
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '5511912345678',
      type: 'template',
      template: {
        name: 'boas_vindas',
        language: { code: 'pt_BR' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Ana' }] }],
      },
    });
  });

  it('usa parameter_name para templates com variável nomeada', async () => {
    const fetchMock = vi.fn(async () => graphOk());
    await new WhatsAppClient(makeConfig(), fetchMock).sendTemplate('5511912345678', 't', 'pt_BR', [{ text: 'Ana', name: 'nome' }]);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.template.components[0].parameters[0]).toEqual({ type: 'text', text: 'Ana', parameter_name: 'nome' });
  });

  it('transforma o erro da Graph API em WhatsAppError sem vazar o token', async () => {
    const cfg = makeConfig();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message: `Invalid OAuth access token ${cfg.accessToken}`,
              type: 'OAuthException',
              code: 190,
              error_data: { details: 'token expirado' },
              fbtrace_id: 'trace1',
            },
          }),
          { status: 401 },
        ),
    );
    const err = await new WhatsAppClient(cfg, fetchMock).sendTemplate('5511912345678', 't', 'pt_BR').catch((e) => e);
    expect(err).toBeInstanceOf(WhatsAppError);
    expect(err.kind).toBe('api');
    expect(err.code).toBe('190');
    expect(err.title).toBe('OAuthException');
    expect(err.details).toBe('token expirado');
    expect(err.httpStatus).toBe(401);
    expect(err.message).not.toContain(cfg.accessToken);
  });

  it('não chama a Meta sem configuração', async () => {
    const fetchMock = vi.fn();
    const err = await new WhatsAppClient(makeConfig({ accessToken: '' }), fetchMock).sendTemplate('5511912345678', 't', 'pt_BR').catch((e) => e);
    expect(err.kind).toBe('config');
    expect(err.message).toContain('WHATSAPP_ACCESS_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('trata falha de rede e resposta sem message id', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect((await new WhatsAppClient(makeConfig(), down).sendText('5511912345678', 'oi').catch((e) => e)).kind).toBe('network');
    const empty = vi.fn(async () => new Response('{}', { status: 200 }));
    expect((await new WhatsAppClient(makeConfig(), empty).sendText('5511912345678', 'oi').catch((e) => e)).kind).toBe('invalid_response');
  });
});
