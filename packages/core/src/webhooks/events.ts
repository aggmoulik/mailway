import { Type } from '@sinclair/typebox';

/** The normalized webhook event types every adapter maps its events onto. */
export const NORMALIZED_WEBHOOK_EVENT_TYPES = [
  'sent',
  'delivered',
  'delivery_delayed',
  'bounced',
  'complained',
  'opened',
  'clicked',
  'failed',
  'unsubscribed',
] as const;

export type NormalizedWebhookEventType = (typeof NORMALIZED_WEBHOOK_EVENT_TYPES)[number];

export const NormalizedWebhookEventTypeSchema = Type.Union(
  NORMALIZED_WEBHOOK_EVENT_TYPES.map((value) => Type.Literal(value)),
  { title: 'NormalizedWebhookEventType' },
);

/** JSON Schema (SSOT) for {@link NormalizedWebhookEvent}. */
export const NormalizedWebhookEventSchema = Type.Object(
  {
    id: Type.String(),
    type: NormalizedWebhookEventTypeSchema,
    providerType: Type.String(),
    provider: Type.String(),
    emailId: Type.Optional(Type.String()),
    recipient: Type.Optional(Type.String()),
    timestamp: Type.String(),
    raw: Type.Unknown(),
  },
  { title: 'NormalizedWebhookEvent' },
);

/** A provider-agnostic webhook event. `providerType` keeps the original type string. */
export interface NormalizedWebhookEvent {
  id: string;
  type: NormalizedWebhookEventType;
  providerType: string;
  provider: string;
  emailId?: string;
  recipient?: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  raw: unknown;
}
