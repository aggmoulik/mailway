import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhook } from '@mailway/core';
import { mapUsesendEvent, usesendWebhookScheme } from '../src/webhook';

const SECRET = 'usesend_wh_secret';

function sign(body: string, ts = String(Date.now())) {
  const signature = createHmac('sha256', Buffer.from(SECRET, 'utf8')).update(`${ts}.${body}`).digest('hex');
  return { 'x-usesend-timestamp': ts, 'x-usesend-signature': `v1=${signature}` };
}

describe('usesendWebhookScheme', () => {
  it('verifies a valid signature with a fresh millisecond timestamp', () => {
    const body = JSON.stringify({ type: 'email.delivered', data: { emailId: 'e1' } });
    expect(() => verifyWebhook(usesendWebhookScheme, { rawBody: body, headers: sign(body), secret: SECRET })).not.toThrow();
  });

  it('rejects a stale millisecond timestamp', () => {
    const body = JSON.stringify({ type: 'email.delivered' });
    const staleTs = String(Date.now() - 10 * 60 * 1000);
    expect(() => verifyWebhook(usesendWebhookScheme, { rawBody: body, headers: sign(body, staleTs), secret: SECRET })).toThrow();
  });

  it('rejects a tampered body', () => {
    const body = JSON.stringify({ type: 'email.delivered' });
    expect(() => verifyWebhook(usesendWebhookScheme, { rawBody: `${body} `, headers: sign(body), secret: SECRET })).toThrow();
  });
});

describe('mapUsesendEvent', () => {
  it('maps event types and fields', () => {
    const e = mapUsesendEvent({ type: 'email.complained', created_at: '2026-01-01T00:00:00.000Z', data: { emailId: 'em_1', to: ['b@y.com'] } });
    expect(e.type).toBe('complained');
    expect(e.providerType).toBe('email.complained');
    expect(e.provider).toBe('usesend');
    expect(e.emailId).toBe('em_1');
    expect(e.recipient).toBe('b@y.com');
  });

  it('throws on an unsupported event type', () => {
    expect(() => mapUsesendEvent({ type: 'domain.verified' })).toThrow();
  });
});
