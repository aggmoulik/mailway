import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { createWebhookReceiver, verifyWebhook } from '@mailway/core';
import { mapResendEvent, resendWebhookScheme } from '../src/webhook';

const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';

function sign(body: string, id = 'msg_1', timestamp = String(Math.floor(Date.now() / 1000))) {
  const key = Buffer.from(SECRET.slice('whsec_'.length), 'base64');
  const signature = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` };
}

describe('resendWebhookScheme', () => {
  it('interoperates with core.verifyWebhook for a valid signature', () => {
    const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'e1' } });
    expect(() => verifyWebhook(resendWebhookScheme, { rawBody: body, headers: sign(body), secret: SECRET })).not.toThrow();
  });

  it('rejects a tampered body', () => {
    const body = JSON.stringify({ type: 'email.delivered' });
    expect(() => verifyWebhook(resendWebhookScheme, { rawBody: `${body} `, headers: sign(body), secret: SECRET })).toThrow();
  });
});

describe('mapResendEvent', () => {
  it('maps Resend event types onto normalized types', () => {
    const e = mapResendEvent({
      type: 'email.bounced',
      created_at: '2026-01-01T00:00:00.000Z',
      data: { email_id: 'em_1', to: ['b@y.com'] },
    });
    expect(e.type).toBe('bounced');
    expect(e.providerType).toBe('email.bounced');
    expect(e.provider).toBe('resend');
    expect(e.emailId).toBe('em_1');
    expect(e.recipient).toBe('b@y.com');
    expect(e.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('throws on an unsupported event type', () => {
    expect(() => mapResendEvent({ type: 'contact.created' })).toThrow();
  });
});

describe('createWebhookReceiver end-to-end with the Resend scheme', () => {
  it('verifies, maps, and dispatches', () => {
    const receiver = createWebhookReceiver({ scheme: resendWebhookScheme, secret: SECRET, map: mapResendEvent });
    const seen: string[] = [];
    receiver.on('delivered', (e) => seen.push(e.type));
    const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'e1', to: 'b@y.com' } });
    const event = receiver.handle(body, sign(body));
    expect(event.type).toBe('delivered');
    expect(seen).toEqual(['delivered']);
  });
});
