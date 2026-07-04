import type { EmailProvider, SendOptions, SendResult } from '@mailway/core';
import { NetworkError, ValidationError } from '@mailway/core';
import { Autosend } from 'autosendjs';
import type { SendEmailOptions, SendEmailResponse } from 'autosendjs';
import { toAutosendOptions } from './message';
import { mapAutosendError } from './errors';
import { autosendWebhookScheme } from './webhook';

/** Minimal shape of the AutoSend client used by the adapter — the DI seam for tests. */
export interface AutosendClient {
  emails: { send(options: SendEmailOptions): Promise<SendEmailResponse> };
}

export interface AutosendProviderConfig {
  apiKey?: string;
  client?: AutosendClient;
  name?: string;
}

/** Builds an {@link EmailProvider} backed by the `autosendjs` SDK. */
export function createAutosendProvider(config: AutosendProviderConfig = {}): EmailProvider {
  const name = config.name ?? 'autosend';
  const client: AutosendClient = config.client ?? new Autosend(config.apiKey ?? '');

  return {
    name,
    webhook: autosendWebhookScheme,
    async send(message, options?: SendOptions): Promise<SendResult> {
      throwIfAborted(options?.signal);
      if (message.attachments !== undefined && message.attachments.length > 0) {
        throw new ValidationError('AutoSend does not support attachments', { provider: name });
      }

      let response: SendEmailResponse;
      try {
        response = await client.emails.send(toAutosendOptions(message));
      } catch (cause) {
        if (isAbortError(cause)) throw cause;
        const statusCode = readStatusCode(cause);
        if (statusCode !== undefined) {
          throw mapAutosendError({ message: readMessage(cause), statusCode, provider: name, cause });
        }
        throw new NetworkError('AutoSend request failed', { provider: name, cause });
      }

      throwIfAborted(options?.signal);
      if (!response.success || response.data === undefined) {
        throw mapAutosendError({
          message: response.error ?? 'AutoSend request failed',
          provider: name,
          cause: response,
          ...(response.statusCode !== undefined ? { statusCode: response.statusCode } : {}),
        });
      }
      return { id: response.data.emailId, provider: name, raw: response };
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

function readStatusCode(cause: unknown): number | undefined {
  if (cause !== null && typeof cause === 'object' && 'statusCode' in cause) {
    const value = (cause as { statusCode: unknown }).statusCode;
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
}

function readMessage(cause: unknown): string {
  if (cause !== null && typeof cause === 'object' && 'message' in cause) {
    const value = (cause as { message: unknown }).message;
    if (typeof value === 'string') return value;
  }
  return 'AutoSend request failed';
}
