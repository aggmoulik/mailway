import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhook } from '@mailway/core';
import { autosendWebhookScheme, mapAutosendEvent } from '../src/webhook';

const SECRET = 'wh_secret_value';
const sign = (body: string): string => createHmac('sha256', Buffer.from(SECRET, 'utf8')).update(body).digest('hex');

describe('autosendWebhookScheme', () => {
  it('verifies a valid hex signature over the raw body', () => {
    const body = JSON.stringify({ type: 'email.delivered', data: { emailId: 'e1' } });
    const headers = { 'x-webhook-signature': sign(body) };
    expect(() => verifyWebhook(autosendWebhookScheme, { rawBody: body, headers, secret: SECRET })).not.toThrow();
  });

  it('rejects a tampered body', () => {
    const body = JSON.stringify({ type: 'email.delivered' });
    const headers = { 'x-webhook-signature': sign(body) };
    expect(() => verifyWebhook(autosendWebhookScheme, { rawBody: `${body} `, headers, secret: SECRET })).toThrow();
  });
});

describe('mapAutosendEvent', () => {
  it('maps event types and fields', () => {
    const e = mapAutosendEvent({ type: 'email.opened', timestamp: '2026-01-01T00:00:00.000Z', data: { emailId: 'em_1', to: 'b@y.com' } });
    expect(e.type).toBe('opened');
    expect(e.providerType).toBe('email.opened');
    expect(e.provider).toBe('autosend');
    expect(e.emailId).toBe('em_1');
    expect(e.recipient).toBe('b@y.com');
  });

  it('throws on an unsupported event type', () => {
    expect(() => mapAutosendEvent({ type: 'contact.created' })).toThrow();
  });
});
