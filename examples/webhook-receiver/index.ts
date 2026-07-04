/**
 * Webhook receiver demo — one receiver per provider.
 *
 * Resend (Svix / base64), AutoSend (raw hex HMAC, no timestamp), and useSend
 * (timestamped hex HMAC) each sign webhooks differently. `createWebhookReceiver`
 * hides that behind one uniform loop: verify signature -> map to a
 * `NormalizedWebhookEvent` -> dispatch to typed `.on(...)` handlers.
 *
 * Runs hermetically (no network): we play the provider by signing a sample
 * event with the SAME `WebhookScheme` the receiver verifies against. In
 * production you pass the real signing secret and the untouched request body
 * and headers straight from your HTTP framework.
 */
import { createHmac } from 'node:crypto';
import { createWebhookReceiver } from '@mailway/core';
import type { NormalizedWebhookEvent, WebhookScheme } from '@mailway/core';
import { resendWebhookScheme, mapResendEvent } from '@mailway/resend';
import { autosendWebhookScheme, mapAutosendEvent } from '@mailway/autosend';
import { usesendWebhookScheme, mapUsesendEvent } from '@mailway/usesend';

interface ProviderDemo {
  name: string;
  scheme: WebhookScheme;
  map: (raw: unknown) => NormalizedWebhookEvent;
  secret: string;
  /** A raw event body shaped the way this provider posts it. */
  body: unknown;
  /** The id/timestamp headers this provider sends (signature is added after signing). */
  baseHeaders: (nowMs: number) => Record<string, string>;
  /** Wraps a raw signature in this provider's signature header. */
  signatureHeader: (signature: string) => Record<string, string>;
}

// Demo secrets — NOT real. Resend/Svix secrets are base64 after a `whsec_` prefix.
const demos: ProviderDemo[] = [
  {
    name: 'resend',
    scheme: resendWebhookScheme,
    map: mapResendEvent,
    secret: `whsec_${Buffer.from('resend-demo-secret').toString('base64')}`,
    body: {
      type: 'email.delivered',
      created_at: '2026-07-04T12:00:00.000Z',
      data: { email_id: 're_demo', to: 'user@example.com' },
    },
    baseHeaders: (nowMs) => ({
      'svix-id': 'msg_demo',
      'svix-timestamp': String(Math.floor(nowMs / 1000)),
    }),
    signatureHeader: (signature) => ({ 'svix-signature': `v1,${signature}` }),
  },
  {
    name: 'autosend',
    scheme: autosendWebhookScheme,
    map: mapAutosendEvent,
    secret: 'autosend-demo-secret',
    body: {
      type: 'email.bounced',
      timestamp: '2026-07-04T12:00:00.000Z',
      data: { emailId: 'as_demo', to: 'user@example.com' },
    },
    baseHeaders: () => ({}),
    signatureHeader: (signature) => ({ 'x-webhook-signature': signature }),
  },
  {
    name: 'usesend',
    scheme: usesendWebhookScheme,
    map: mapUsesendEvent,
    secret: 'usesend-demo-secret',
    body: {
      type: 'email.opened',
      created_at: '2026-07-04T12:00:00.000Z',
      data: { emailId: 'us_demo', to: 'user@example.com' },
    },
    baseHeaders: (nowMs) => ({ 'x-usesend-timestamp': String(nowMs) }), // milliseconds
    signatureHeader: (signature) => ({ 'x-usesend-signature': `v1=${signature}` }),
  },
];

/** Play the provider: sign `body` with `scheme` exactly as the receiver will verify it. */
function signRequest(demo: ProviderDemo): { rawBody: string; headers: Record<string, string> } {
  const rawBody = JSON.stringify(demo.body);
  const headers = demo.baseHeaders(Date.now());
  const signedContent = demo.scheme.buildSignedContent({ headers, rawBody });
  const key = demo.scheme.decodeSecret(demo.secret);
  const digest = createHmac(demo.scheme.algorithm, Buffer.from(key)).update(signedContent).digest();
  const signature =
    demo.scheme.signatureEncoding === 'hex' ? digest.toString('hex') : digest.toString('base64');
  return { rawBody, headers: { ...headers, ...demo.signatureHeader(signature) } };
}

function main(): void {
  for (const demo of demos) {
    console.log(`\n${demo.name}`);

    const receiver = createWebhookReceiver({
      scheme: demo.scheme,
      secret: demo.secret,
      map: demo.map,
    });

    // Typed dispatch: a specific handler plus a catch-all audit handler.
    receiver.on('bounced', (event) => {
      console.log(`  bounce   -> suppress ${event.recipient ?? 'unknown'}`);
    });
    receiver.on('*', (event) => {
      console.log(
        `  verified -> ${event.type} (${event.providerType}) for ${event.emailId ?? 'n/a'}`,
      );
    });

    // A signed request arrives; hand the raw body + headers to the receiver.
    const { rawBody, headers } = signRequest(demo);
    receiver.handle(rawBody, headers);

    // Verification actually gates: a tampered body is rejected.
    try {
      receiver.handle(`${rawBody} `, headers);
      console.log('  tamper   -> UNEXPECTEDLY accepted');
    } catch {
      console.log('  tamper   -> rejected (signature mismatch)');
    }
  }
}

main();
