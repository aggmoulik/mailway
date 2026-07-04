import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhook } from '../src/webhooks/verify';
import { createWebhookReceiver } from '../src/webhooks/receiver';
import type { WebhookScheme } from '../src/webhooks/scheme';
import type { NormalizedWebhookEvent } from '../src/webhooks/events';

// Publicly documented Svix test vector. Proves a Resend/Svix-shaped scheme
// verifies WITHOUT a dependency on the `svix` package.
const SVIX_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
const SVIX_ID = 'msg_p5jXN8AQM9LWM0D4loKWxJek';
const SVIX_TIMESTAMP = '1614265330';
const SVIX_BODY = '{"test": 2432232314}';
const SVIX_SIGNATURE = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=';

function svixScheme(toleranceSeconds: number | null = null): WebhookScheme {
  return {
    headers: { id: 'svix-id', timestamp: 'svix-timestamp', signature: 'svix-signature' },
    algorithm: 'sha256',
    signatureEncoding: 'base64',
    toleranceSeconds,
    decodeSecret: (secret) => {
      const b64 = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
      return new Uint8Array(Buffer.from(b64, 'base64'));
    },
    buildSignedContent: ({ headers, rawBody }) =>
      `${headers['svix-id']}.${headers['svix-timestamp']}.${rawBody}`,
    parseSignatureHeader: (value) =>
      value
        .split(' ')
        .map((part) => {
          const [version, sig] = part.split(',');
          return version === 'v1' ? sig : undefined;
        })
        .filter((s): s is string => s !== undefined),
  };
}

const validHeaders = (): Record<string, string> => ({
  'svix-id': SVIX_ID,
  'svix-timestamp': SVIX_TIMESTAMP,
  'svix-signature': SVIX_SIGNATURE,
});

describe('verifyWebhook (fixed Svix vector, no svix dependency)', () => {
  it('verifies a valid Svix signature', () => {
    expect(() => verifyWebhook(svixScheme(), { rawBody: SVIX_BODY, headers: validHeaders(), secret: SVIX_SECRET })).not.toThrow();
  });

  it('is case-insensitive on header names', () => {
    const headers = { 'Svix-Id': SVIX_ID, 'Svix-Timestamp': SVIX_TIMESTAMP, 'Svix-Signature': SVIX_SIGNATURE };
    expect(() => verifyWebhook(svixScheme(), { rawBody: SVIX_BODY, headers, secret: SVIX_SECRET })).not.toThrow();
  });

  it('throws when the body is tampered', () => {
    expect(() => verifyWebhook(svixScheme(), { rawBody: `${SVIX_BODY} `, headers: validHeaders(), secret: SVIX_SECRET })).toThrow();
  });

  it('throws on a wrong secret', () => {
    expect(() => verifyWebhook(svixScheme(), { rawBody: SVIX_BODY, headers: validHeaders(), secret: 'whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAA' })).toThrow();
  });

  it('throws when the signature header is missing', () => {
    const headers = { 'svix-id': SVIX_ID, 'svix-timestamp': SVIX_TIMESTAMP };
    expect(() => verifyWebhook(svixScheme(), { rawBody: SVIX_BODY, headers, secret: SVIX_SECRET })).toThrow();
  });

  it('throws when the timestamp is outside the tolerance window', () => {
    expect(() => verifyWebhook(svixScheme(300), { rawBody: SVIX_BODY, headers: validHeaders(), secret: SVIX_SECRET })).toThrow();
  });

  it('accepts multiple space-separated signatures when one matches', () => {
    const headers = { ...validHeaders(), 'svix-signature': `v1,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa= ${SVIX_SIGNATURE}` };
    expect(() => verifyWebhook(svixScheme(), { rawBody: SVIX_BODY, headers, secret: SVIX_SECRET })).not.toThrow();
  });
});

describe('createWebhookReceiver', () => {
  const map = (raw: unknown): NormalizedWebhookEvent => ({
    id: 'evt_1',
    type: 'bounced',
    providerType: 'email.bounced',
    provider: 'resend',
    recipient: 'b@y.com',
    timestamp: '2021-02-25T16:22:10.000Z',
    raw,
  });

  it('verifies, maps, and dispatches to type-specific and wildcard handlers', () => {
    const receiver = createWebhookReceiver({ scheme: svixScheme(), secret: SVIX_SECRET, map });
    const seen: string[] = [];
    receiver.on('bounced', (e) => seen.push(`bounced:${e.id}`));
    receiver.on('*', (e) => seen.push(`*:${e.type}`));
    const event = receiver.handle(SVIX_BODY, validHeaders());
    expect(event.type).toBe('bounced');
    expect(seen).toEqual(['bounced:evt_1', '*:bounced']);
  });

  it('throws and does not dispatch when verification fails', () => {
    const receiver = createWebhookReceiver({ scheme: svixScheme(), secret: SVIX_SECRET, map });
    const seen: string[] = [];
    receiver.on('*', () => seen.push('x'));
    expect(() => receiver.handle(SVIX_BODY, { ...validHeaders(), 'svix-signature': 'v1,bad' })).toThrow();
    expect(seen).toEqual([]);
  });
});

describe('verifyWebhook timestampUnit (millisecond timestamps)', () => {
  const msScheme = (toleranceSeconds: number | null): WebhookScheme => ({
    headers: { timestamp: 'x-ts', signature: 'x-sig' },
    algorithm: 'sha256',
    signatureEncoding: 'hex',
    timestampUnit: 'milliseconds',
    toleranceSeconds,
    decodeSecret: (secret) => new Uint8Array(Buffer.from(secret, 'utf8')),
    buildSignedContent: ({ headers, rawBody }) => `${headers['x-ts']}.${rawBody}`,
    parseSignatureHeader: (value) => [value],
  });

  const signMs = (secret: string, ts: string, body: string): string =>
    createHmac('sha256', Buffer.from(secret, 'utf8')).update(`${ts}.${body}`).digest('hex');

  it('accepts a fresh millisecond timestamp within tolerance', () => {
    const body = '{"ok":true}';
    const ts = String(Date.now());
    const sig = signMs('sek', ts, body);
    expect(() => verifyWebhook(msScheme(300), { rawBody: body, headers: { 'x-ts': ts, 'x-sig': sig }, secret: 'sek' })).not.toThrow();
  });

  it('rejects a stale millisecond timestamp outside tolerance', () => {
    const body = '{"ok":true}';
    const ts = String(Date.now() - 10 * 60 * 1000);
    const sig = signMs('sek', ts, body);
    expect(() => verifyWebhook(msScheme(300), { rawBody: body, headers: { 'x-ts': ts, 'x-sig': sig }, secret: 'sek' })).toThrow();
  });
});
