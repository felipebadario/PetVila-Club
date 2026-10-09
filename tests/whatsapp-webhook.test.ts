import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { mergeWelcomeStatus } from '../src/lib/whatsapp/status';
import { parseWebhook, verifySignature, verifySubscription } from '../src/lib/whatsapp/webhook';
import { statusPayload } from './helpers';

const q = (o: Record<string, string>) => new URLSearchParams(o);

describe('verifySubscription (GET da Meta)', () => {
  it('devolve o challenge quando o token confere', () => {
    expect(verifySubscription(q({ 'hub.mode': 'subscribe', 'hub.verify_token': 'abc', 'hub.challenge': '1158201444' }), 'abc')).toBe('1158201444');
  });
  it('recusa token errado, modo errado, sem challenge ou sem token configurado', () => {
    expect(verifySubscription(q({ 'hub.mode': 'subscribe', 'hub.verify_token': 'x', 'hub.challenge': '1' }), 'abc')).toBeNull();
    expect(verifySubscription(q({ 'hub.mode': 'unsubscribe', 'hub.verify_token': 'abc', 'hub.challenge': '1' }), 'abc')).toBeNull();
    expect(verifySubscription(q({ 'hub.mode': 'subscribe', 'hub.verify_token': 'abc' }), 'abc')).toBeNull();
    expect(verifySubscription(q({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '1' }), '')).toBeNull();
  });
});

describe('verifySignature (POST da Meta)', () => {
  const body = '{"object":"whatsapp_business_account"}';
  const sig = 'sha256=' + createHmac('sha256', 's3cret').update(body).digest('hex');
  it('aceita a assinatura correta', () => expect(verifySignature(body, sig, 's3cret')).toBe(true));
  it('recusa assinatura errada, ausente ou corpo alterado', () => {
    expect(verifySignature(body, sig, 'outro')).toBe(false);
    expect(verifySignature(body, null, 's3cret')).toBe(false);
    expect(verifySignature(body + ' ', sig, 's3cret')).toBe(false);
  });
});

describe('parseWebhook', () => {
  it('lê status sent, delivered, read e failed com erro', () => {
    const out = parseWebhook(
      statusPayload([
        { id: 'wamid.A', status: 'sent', timestamp: '1791374400', recipient_id: '5511912345678' },
        { id: 'wamid.A', status: 'delivered', timestamp: '1791374401', recipient_id: '5511912345678' },
        { id: 'wamid.A', status: 'read', timestamp: '1791374402', recipient_id: '5511912345678' },
        {
          id: 'wamid.B',
          status: 'failed',
          timestamp: '1791374403',
          recipient_id: '5511912345678',
          errors: [{ code: 131026, title: 'Message undeliverable', message: 'Message undeliverable', error_data: { details: 'sem WhatsApp' } }],
        },
      ]),
    );
    expect(out.ignored).toBe(0);
    expect(out.statuses.map((s) => s.status)).toEqual(['sent', 'delivered', 'read', 'failed']);
    expect(out.statuses[0].timestamp).toBe(new Date(1791374400 * 1000).toISOString());
    expect(out.statuses[3].error).toEqual({ code: '131026', title: 'Message undeliverable', message: 'Message undeliverable', details: 'sem WhatsApp' });
  });

  it('lê mensagens recebidas', () => {
    const p = statusPayload([]);
    (p.entry[0].changes[0].value as Record<string, unknown>).messages = [
      { from: '5511912345678', id: 'wamid.IN', timestamp: '1791374400', type: 'text', text: { body: 'oi' } },
    ];
    expect(parseWebhook(p).messages).toEqual([
      { id: 'wamid.IN', from: '5511912345678', type: 'text', timestamp: new Date(1791374400 * 1000).toISOString() },
    ]);
  });

  it('é defensivo com formatos inesperados', () => {
    expect(parseWebhook(null)).toEqual({ statuses: [], messages: [], ignored: 1 });
    expect(parseWebhook({ object: 'page' }).ignored).toBe(1);
    expect(parseWebhook({ object: 'whatsapp_business_account' }).statuses).toEqual([]);
    expect(parseWebhook({ object: 'whatsapp_business_account', entry: 'x' }).statuses).toEqual([]);
    const weird = parseWebhook(
      statusPayload([{ id: 'wamid.A', status: 'deleted' }, { status: 'sent' }, 'lixo' as unknown as Record<string, unknown>, { id: 'wamid.C', status: 'sent' }]),
    );
    expect(weird.statuses.map((s) => s.wamid)).toEqual(['wamid.C']);
    expect(weird.ignored).toBe(3);
    const otherField = statusPayload([{ id: 'wamid.A', status: 'sent' }]);
    otherField.entry[0].changes[0].field = 'account_update';
    expect(parseWebhook(otherField).statuses).toEqual([]);
  });
});

describe('mergeWelcomeStatus', () => {
  const at = (status: 'sent' | 'delivered' | 'read' | 'failed', timestamp = 't-' + status) => ({ wamid: 'w', status, timestamp, recipientId: '' });

  it('avança o status e grava o carimbo de cada etapa', () => {
    expect(mergeWelcomeStatus({ welcome_message_status: 'accepted' }, at('sent'))).toEqual({
      welcome_sent_at: 't-sent',
      welcome_message_status: 'sent',
    });
  });

  it('não regride quando os eventos chegam fora de ordem', () => {
    expect(mergeWelcomeStatus({ welcome_message_status: 'read', welcome_read_at: 'x' }, at('delivered'))).toEqual({
      welcome_delivered_at: 't-delivered',
    });
  });

  it('não regrava carimbo nem status repetidos', () => {
    expect(mergeWelcomeStatus({ welcome_message_status: 'sent', welcome_sent_at: 'x' }, at('sent'))).toEqual({});
  });

  it('failed prevalece e registra o erro', () => {
    const patch = mergeWelcomeStatus(
      { welcome_message_status: 'sent' },
      { ...at('failed'), error: { code: '131026', title: 'Message undeliverable', message: 'Falhou', details: 'sem WhatsApp' } },
    );
    expect(patch).toEqual({
      welcome_failed_at: 't-failed',
      welcome_message_status: 'failed',
      welcome_error_code: '131026',
      welcome_error_message: 'Message undeliverable: Falhou (sem WhatsApp)',
    });
    expect(mergeWelcomeStatus({ welcome_message_status: 'failed' }, at('read'))).toEqual({ welcome_read_at: 't-read' });
  });
});
