import { ValidationError } from '@mailway/core';
import type { NormalizedWebhookEvent, NormalizedWebhookEventType, WebhookScheme } from '@mailway/core';

/**
 * AutoSend webhook scheme: hex HMAC-SHA256 over the raw JSON body, in the
 * `x-webhook-signature` header. The secret is used as raw UTF-8 bytes and there
 * is no timestamp header (no replay window). A very different axis from Svix.
 */
export const autosendWebhookScheme: WebhookScheme = {
  headers: { signature: 'x-webhook-signature' },
  algorithm: 'sha256',
  signatureEncoding: 'hex',
  toleranceSeconds: null,
  decodeSecret: (secret) => new Uint8Array(Buffer.from(secret, 'utf8')),
  buildSignedContent: ({ rawBody }) => rawBody,
  parseSignatureHeader: (value) => [value.trim()],
};

const EVENT_TYPE_BY_AUTOSEND: Record<string, NormalizedWebhookEventType> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.failed': 'failed',
  'email.unsubscribed': 'unsubscribed',
};

interface AutosendWebhookPayload {
  type?: string;
  timestamp?: string;
  data?: { emailId?: string; email?: string; to?: string };
}

/** Maps a raw AutoSend webhook body onto a {@link NormalizedWebhookEvent}. */
export function mapAutosendEvent(rawEvent: unknown): NormalizedWebhookEvent {
  const event = (rawEvent ?? {}) as AutosendWebhookPayload;
  const rawType = event.type ?? '';
  const type = EVENT_TYPE_BY_AUTOSEND[rawType];
  if (type === undefined) {
    throw new ValidationError(`Unsupported AutoSend webhook event type "${rawType}"`);
  }
  const emailId = event.data?.emailId;
  const recipient = event.data?.to ?? event.data?.email;
  return {
    id: emailId ?? rawType,
    type,
    providerType: rawType,
    provider: 'autosend',
    timestamp: event.timestamp ?? new Date().toISOString(),
    raw: rawEvent,
    ...(emailId !== undefined ? { emailId } : {}),
    ...(recipient !== undefined ? { recipient } : {}),
  };
}
