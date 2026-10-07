/**
 * Cliente da WhatsApp Cloud API (Graph API da Meta). Único ponto do projeto que
 * fala com graph.facebook.com: autenticação, envio, leitura da resposta e erros.
 */
import type { WhatsAppConfig } from './config';
import { missingSendConfig } from './config';
import { redact } from './log';

const GRAPH = 'https://graph.facebook.com';

export interface SendResult {
  /** wamid retornado pela Meta. */
  messageId: string;
  /** Status inicial informado pela Meta (normalmente "accepted"). */
  status: string;
  waId: string;
}

export type WhatsAppErrorKind = 'config' | 'api' | 'network' | 'invalid_response';

/** Erro já sanitizado: pode ir para log e planilha, nunca para o navegador. */
export class WhatsAppError extends Error {
  constructor(
    readonly kind: WhatsAppErrorKind,
    message: string,
    readonly code = '',
    readonly title = '',
    readonly details = '',
    readonly httpStatus = 0,
    readonly fbtraceId = '',
  ) {
    super(redact(message).slice(0, 300));
    this.name = 'WhatsAppError';
  }
}

export interface TemplateParam {
  text: string;
  /** Para templates com variáveis nomeadas ({{nome}}). */
  name?: string;
}

type Fetch = typeof fetch;

export class WhatsAppClient {
  constructor(
    private cfg: WhatsAppConfig,
    private fetchImpl: Fetch = fetch,
  ) {}

  /** Envia qualquer mensagem aceita pelo endpoint /messages (corpo sem messaging_product/to). */
  async sendMessage(to: string, message: Record<string, unknown>): Promise<SendResult> {
    const missing = missingSendConfig(this.cfg);
    // Template não é necessário para mensagens que não são template.
    const blocking = missing.filter((k) => k !== 'WHATSAPP_WELCOME_TEMPLATE_NAME');
    if (blocking.length) throw new WhatsAppError('config', `configuração ausente: ${blocking.join(', ')}`);
    if (!/^\d{10,15}$/.test(to)) throw new WhatsAppError('config', 'telefone de destino inválido');

    const url = `${GRAPH}/${encodeURIComponent(this.cfg.apiVersion)}/${encodeURIComponent(this.cfg.phoneNumberId)}/messages`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.cfg.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, ...message }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      throw new WhatsAppError('network', err instanceof Error ? `${err.name}: ${err.message}` : 'falha de rede');
    }

    const body = (await res.json().catch(() => null)) as Record<string, any> | null;
    if (!res.ok || body?.error) throw apiError(res.status, body);

    const msg = Array.isArray(body?.messages) ? body!.messages[0] : undefined;
    if (!msg || typeof msg.id !== 'string' || !msg.id) {
      throw new WhatsAppError('invalid_response', 'resposta sem message id', '', '', '', res.status);
    }
    const contact = Array.isArray(body?.contacts) ? body!.contacts[0] : undefined;
    return {
      messageId: msg.id,
      status: typeof msg.message_status === 'string' ? msg.message_status : 'accepted',
      waId: typeof contact?.wa_id === 'string' ? contact.wa_id : '',
    };
  }

  /** Envia um template aprovado. Os parâmetros vão no corpo (body) do template. */
  async sendTemplate(to: string, name: string, language: string, params: TemplateParam[] = []) {
    if (!name) throw new WhatsAppError('config', 'nome do template ausente');
    const template: Record<string, unknown> = { name, language: { code: language } };
    if (params.length) {
      template.components = [
        {
          type: 'body',
          parameters: params.map((p) => ({ type: 'text', text: p.text, ...(p.name ? { parameter_name: p.name } : {}) })),
        },
      ];
    }
    return this.sendMessage(to, { type: 'template', template });
  }

  /**
   * Texto livre. A Meta só entrega fora de template dentro da janela de 24h aberta
   * pelo próprio usuário; não use para boas-vindas nem campanhas.
   */
  sendText(to: string, text: string) {
    return this.sendMessage(to, { type: 'text', text: { body: text, preview_url: false } });
  }
}

function apiError(status: number, body: Record<string, any> | null): WhatsAppError {
  const e = body?.error && typeof body.error === 'object' ? body.error : {};
  const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
  const code = str(e.code) + (e.error_subcode ? `/${str(e.error_subcode)}` : '');
  return new WhatsAppError(
    'api',
    str(e.message) || `http_${status}`,
    code,
    str(e.type) || str(e.error_user_title),
    str(e.error_data?.details) || str(e.error_user_msg),
    status,
    str(e.fbtrace_id),
  );
}
