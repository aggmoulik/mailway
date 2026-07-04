import type { NormalizedMessage } from './message';
import type { WebhookScheme } from './webhooks/scheme';

export interface SendOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
}

export interface SendResult {
  id: string;
  provider: string;
  raw?: unknown;
}

/**
 * The contract every provider adapter implements — the stable public surface
 * third parties build against. `webhook` is present only for providers that
 * sign their webhooks.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: NormalizedMessage, opts?: SendOptions): Promise<SendResult>;
  readonly webhook?: WebhookScheme;
}
