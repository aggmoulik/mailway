import { ValidationError } from '@mailway/core';
import type { NormalizedWebhookEvent, NormalizedWebhookEventType, WebhookScheme } from '@mailway/core';

/**
 * The Svix-shaped webhook scheme Resend uses. Core's {@link verifyWebhook}
 * verifies against it with no `svix` dependency.
 */
export const resendWebhookScheme: WebhookScheme = {
  headers: { id: 'svix-id', timestamp: 'svix-timestamp', signature: 'svix-signature' },
  algorithm: 'sha256',
  signatureEncoding: 'base64',
  toleranceSeconds: 300,
  decodeSecret: (secret) => {
    const base64 = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
    return new Uint8Array(Buffer.from(base64, 'base64'));
  },
  buildSignedContent: ({ headers, rawBody }) =>
    `${headers['svix-id']}.${headers['svix-timestamp']}.${rawBody}`,
  parseSignatureHeader: (value) =>
    value
      .split(' ')
      .map((part) => {
        const [version, signature] = part.split(',');
        return version === 'v1' ? signature : undefined;
      })
      .filter((candidate): candidate is string => candidate !== undefined),
};

const EVENT_TYPE_BY_RESEND: Record<string, NormalizedWebhookEventType> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.complained': 'complained',
  'email.bounced': 'bounced',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.failed': 'failed',
};

interface ResendWebhookPayload {
  type?: string;
  created_at?: string;
  data?: { email_id?: string; to?: string | string[]; created_at?: string };
}

/** Maps a raw Resend webhook body onto a {@link NormalizedWebhookEvent}. */
export function mapResendEvent(rawEvent: unknown): NormalizedWebhookEvent {
  const event = (rawEvent ?? {}) as ResendWebhookPayload;
  const rawType = event.type ?? '';
  const type = EVENT_TYPE_BY_RESEND[rawType];
  if (type === undefined) {
    throw new ValidationError(`Unsupported Resend webhook event type "${rawType}"`);
  }

  const emailId = event.data?.email_id;
  const to = event.data?.to;
  const recipient = Array.isArray(to) ? to[0] : to;
  const timestamp = event.created_at ?? event.data?.created_at ?? new Date().toISOString();

  return {
    id: emailId ?? rawType,
    type,
    providerType: rawType,
    provider: 'resend',
    timestamp,
    raw: rawEvent,
    ...(emailId !== undefined ? { emailId } : {}),
    ...(recipient !== undefined ? { recipient } : {}),
  };
}
