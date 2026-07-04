import type { EmailProvider, SendOptions, SendResult } from '@mailway/core';
import { NetworkError, ProviderError } from '@mailway/core';
import { UseSend } from 'usesend-js';
import { toUsesendPayload } from './message';
import { mapUsesendError } from './errors';
import { usesendWebhookScheme } from './webhook';
import type { UsesendCreateEmailResponse, UsesendSendPayload } from './types';

/** Minimal shape of the useSend client used by the adapter — the DI seam for tests. */
export interface UsesendClient {
  emails: { send(payload: UsesendSendPayload): Promise<UsesendCreateEmailResponse> };
}

export interface UsesendProviderConfig {
  apiKey?: string;
  /** Base URL for self-hosted useSend instances. */
  baseUrl?: string;
  client?: UsesendClient;
  name?: string;
}

/** Builds an {@link EmailProvider} backed by the `usesend-js` SDK. */
export function createUsesendProvider(config: UsesendProviderConfig = {}): EmailProvider {
  const name = config.name ?? 'usesend';
  const client: UsesendClient =
    config.client ?? (new UseSend(config.apiKey ?? '', config.baseUrl) as unknown as UsesendClient);

  return {
    name,
    webhook: usesendWebhookScheme,
    async send(message, options?: SendOptions): Promise<SendResult> {
      throwIfAborted(options?.signal);

      let response: UsesendCreateEmailResponse;
      try {
        response = await client.emails.send(toUsesendPayload(message));
      } catch (cause) {
        if (isAbortError(cause)) throw cause;
        throw new NetworkError('useSend request failed', { provider: name, cause });
      }

      throwIfAborted(options?.signal);
      if (response.error) {
        throw mapUsesendError(response.error, name);
      }
      const emailId = response.data?.emailId;
      if (emailId === undefined) {
        throw new ProviderError('useSend returned no email id', { provider: name, cause: response });
      }
      return { id: emailId, provider: name, raw: response.data };
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
