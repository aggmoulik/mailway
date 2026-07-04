import { ValidationError } from '@mailway/core';
import type { NormalizedWebhookEvent, NormalizedWebhookEventType, WebhookScheme } from '@mailway/core';

/**
 * useSend webhook scheme: hex HMAC-SHA256 over `"${timestamp}.${rawBody}"`, with
 * the signature in `X-UseSend-Signature` formatted `v1=<hex>` and a MILLISECOND
 * timestamp in `X-UseSend-Timestamp` (hence `timestampUnit: 'milliseconds'`).
 */
export const usesendWebhookScheme: WebhookScheme = {
  headers: { timestamp: 'x-usesend-timestamp', signature: 'x-usesend-signature' },
  algorithm: 'sha256',
  signatureEncoding: 'hex',
  timestampUnit: 'milliseconds',
  toleranceSeconds: 300,
  decodeSecret: (secret) => new Uint8Array(Buffer.from(secret, 'utf8')),
  buildSignedContent: ({ headers, rawBody }) => `${headers['x-usesend-timestamp']}.${rawBody}`,
  parseSignatureHeader: (value) => [value.startsWith('v1=') ? value.slice('v1='.length) : value],
};

const EVENT_TYPE_BY_USESEND: Record<string, NormalizedWebhookEventType> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.failed': 'failed',
};

interface UsesendWebhookPayload {
  type?: string;
  created_at?: string;
  data?: { emailId?: string; to?: string | string[]; email?: string };
}

/** Maps a raw useSend webhook body onto a {@link NormalizedWebhookEvent}. */
export function mapUsesendEvent(rawEvent: unknown): NormalizedWebhookEvent {
  const event = (rawEvent ?? {}) as UsesendWebhookPayload;
  const rawType = event.type ?? '';
  const type = EVENT_TYPE_BY_USESEND[rawType];
  if (type === undefined) {
    throw new ValidationError(`Unsupported useSend webhook event type "${rawType}"`);
  }
  const emailId = event.data?.emailId;
  const to = event.data?.to;
  const recipient = Array.isArray(to) ? to[0] : (to ?? event.data?.email);
  return {
    id: emailId ?? rawType,
    type,
    providerType: rawType,
    provider: 'usesend',
    timestamp: event.created_at ?? new Date().toISOString(),
    raw: rawEvent,
    ...(emailId !== undefined ? { emailId } : {}),
    ...(recipient !== undefined ? { recipient } : {}),
  };
}
