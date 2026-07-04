import type { NormalizedMessage } from './message';
import type { EmailProvider, SendOptions, SendResult } from './provider';
import type { RetryOptions } from './retry';
import { withRetry } from './retry';
import { MailxError, ProviderError, ValidationError } from './errors';

/** Strategy for ordering providers per send. Ordered (identity) is the default; leaves room for weighted / round-robin. */
export interface RoutingStrategy {
  order(providers: EmailProvider[]): EmailProvider[];
}

export interface Mailer {
  send(message: NormalizedMessage, options?: SendOptions): Promise<SendResult>;
}

export interface MailerConfig {
  providers: EmailProvider[];
  strategy?: RoutingStrategy;
  /** Retry policy applied to each provider attempt. */
  retry?: RetryOptions;
}

const orderedStrategy: RoutingStrategy = { order: (providers) => providers };

/**
 * Builds a {@link Mailer} that tries providers in strategy order, wrapping each
 * attempt in {@link withRetry}. If every provider fails, it throws an
 * `AggregateError` of the per-provider {@link MailxError}s.
 */
export function createMailer(config: MailerConfig): Mailer {
  const { providers, strategy = orderedStrategy, retry } = config;
  if (providers.length === 0) {
    throw new ValidationError('createMailer requires at least one provider');
  }

  return {
    async send(message, options) {
      const ordered = strategy.order([...providers]);
      const errors: MailxError[] = [];
      for (const provider of ordered) {
        try {
          return await withRetry((): Promise<SendResult> => provider.send(message, options), {
            ...retry,
            ...(options?.signal ? { signal: options.signal } : {}),
          });
        } catch (error) {
          errors.push(toMailxError(error, provider.name));
          if (options?.signal?.aborted) break;
        }
      }
      throw new AggregateError(errors, `All ${errors.length} email provider(s) failed`);
    },
  };
}

function toMailxError(error: unknown, provider: string): MailxError {
  if (error instanceof MailxError) return error;
  return new ProviderError('Provider send failed', { provider, cause: error });
}
