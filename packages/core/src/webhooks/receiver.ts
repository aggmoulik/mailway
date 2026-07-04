import type { WebhookScheme } from './scheme';
import type { NormalizedWebhookEvent, NormalizedWebhookEventType } from './events';
import { verifyWebhook } from './verify';

type EventHandler = (event: NormalizedWebhookEvent) => void;
type HandlerKey = NormalizedWebhookEventType | '*';

export interface WebhookReceiverConfig {
  scheme: WebhookScheme;
  secret: string;
  /** Adapter-supplied mapping from a raw parsed event to a {@link NormalizedWebhookEvent}. */
  map: (rawEvent: unknown) => NormalizedWebhookEvent;
}

export interface WebhookReceiver {
  /** Verifies the signature, maps the body, dispatches to handlers, and returns the event. */
  handle(rawBody: string, headers: Record<string, string>): NormalizedWebhookEvent;
  on(type: HandlerKey, handler: EventHandler): void;
}

/** Creates a receiver that verifies -> maps -> dispatches provider webhooks. */
export function createWebhookReceiver(config: WebhookReceiverConfig): WebhookReceiver {
  const handlers = new Map<HandlerKey, Set<EventHandler>>();

  return {
    handle(rawBody, headers) {
      verifyWebhook(config.scheme, { rawBody, headers, secret: config.secret });
      const event = config.map(JSON.parse(rawBody));
      handlers.get(event.type)?.forEach((handler) => handler(event));
      handlers.get('*')?.forEach((handler) => handler(event));
      return event;
    },
    on(type, handler) {
      let set = handlers.get(type);
      if (set === undefined) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler);
    },
  };
}
