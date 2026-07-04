import type { EmailProvider, SendOptions, SendResult } from '@mailway/core';
import { NetworkError } from '@mailway/core';
import { Resend } from 'resend';
import type { CreateEmailOptions, CreateEmailRequestOptions, CreateEmailResponse } from 'resend';
import { toResendPayload } from './message';
import { mapResendError } from './errors';
import { resendWebhookScheme } from './webhook';

/** Minimal shape of the Resend client used by the adapter — the DI seam for tests. */
export interface ResendClient {
  emails: {
    send(payload: CreateEmailOptions, options?: CreateEmailRequestOptions): Promise<CreateEmailResponse>;
  };
}

export interface ResendProviderConfig {
  /** Used to construct a client when `client` is not injected. */
  apiKey?: string;
  /** Inject a client (e.g. a fake in tests). Overrides `apiKey`. */
  client?: ResendClient;
  /** Provider name reported on results/errors. Default `"resend"`. */
  name?: string;
}

/** Builds an {@link EmailProvider} backed by the official `resend` SDK. */
export function createResendProvider(config: ResendProviderConfig = {}): EmailProvider {
  const name = config.name ?? 'resend';
  const client: ResendClient = config.client ?? new Resend(config.apiKey);

  return {
    name,
    webhook: resendWebhookScheme,
    async send(message, options?: SendOptions): Promise<SendResult> {
      throwIfAborted(options?.signal);
      const payload = toResendPayload(message);
      const requestOptions: CreateEmailRequestOptions | undefined = options?.idempotencyKey
        ? { idempotencyKey: options.idempotencyKey }
        : undefined;

      let response: CreateEmailResponse;
      try {
        response = await client.emails.send(payload, requestOptions);
      } catch (cause) {
        if (isAbortError(cause)) throw cause;
        throw new NetworkError('Resend request failed', { provider: name, cause });
      }

      throwIfAborted(options?.signal);
      if (response.error) {
        throw mapResendError(response.error, name);
      }
      return { id: response.data.id, provider: name, raw: response.data };
    },
  };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
