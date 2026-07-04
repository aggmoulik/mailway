export { SCOPE } from './constants';

export { AttachmentSchema, NormalizedMessageSchema } from './message';
export type { Attachment, NormalizedMessage } from './message';

export {
  MailxError,
  AuthError,
  ValidationError,
  RateLimitError,
  ProviderError,
  NetworkError,
  TimeoutError,
  httpStatusToCategory,
} from './errors';
export type {
  MailxErrorCode,
  MailxErrorOptions,
  RateLimitErrorOptions,
  ProviderErrorOptions,
} from './errors';

export type { EmailProvider, SendOptions, SendResult } from './provider';

export { withRetry } from './retry';
export type { RetryOptions } from './retry';

export { createMailer, roundRobinStrategy, weightedStrategy } from './routing';
export type { Mailer, MailerConfig, RoutingStrategy, WeightedStrategyOptions } from './routing';

export type { WebhookScheme } from './webhooks/scheme';
export { verifyWebhook } from './webhooks/verify';
export type { VerifyWebhookInput } from './webhooks/verify';
export {
  NORMALIZED_WEBHOOK_EVENT_TYPES,
  NormalizedWebhookEventSchema,
  NormalizedWebhookEventTypeSchema,
} from './webhooks/events';
export type { NormalizedWebhookEvent, NormalizedWebhookEventType } from './webhooks/events';
export { createWebhookReceiver } from './webhooks/receiver';
export type { WebhookReceiver, WebhookReceiverConfig } from './webhooks/receiver';
