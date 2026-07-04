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
 * Round-robin routing: each send starts with the next provider in sequence,
 * cycling through the list. The returned ordering is a full rotation, so every
 * provider stays available for failover after the chosen primary. State is
 * per-strategy — build one strategy and reuse it across sends.
 */
export function roundRobinStrategy(): RoutingStrategy {
  let counter = 0;
  return {
    order(providers) {
      const n = providers.length;
      if (n === 0) return providers;
      const offset = counter % n;
      counter += 1;
      return [...providers.slice(offset), ...providers.slice(0, offset)];
    },
  };
}

/** Options for {@link weightedStrategy}. */
export interface WeightedStrategyOptions {
  /**
   * RNG returning a float in `[0, 1)`, injectable for deterministic tests.
   * Defaults to `Math.random`.
   */
  random?: () => number;
}

/**
 * Weighted-random routing: on each send, providers with a positive weight are
 * ordered by weighted sampling without replacement, so the primary slot is
 * chosen proportional to weight. Providers with no weight (or weight `0`) are
 * appended after, in their original order, as failover-only fallbacks.
 *
 * Weights are keyed by {@link EmailProvider.name}.
 *
 * @throws ValidationError if any weight is negative or non-finite, or if no
 * weight is positive.
 */
export function weightedStrategy(
  weights: Record<string, number>,
  options: WeightedStrategyOptions = {},
): RoutingStrategy {
  let hasPositive = false;
  for (const [name, weight] of Object.entries(weights)) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new ValidationError(
        `weightedStrategy: weight for '${name}' must be a finite number >= 0`,
      );
    }
    if (weight > 0) hasPositive = true;
  }
  if (!hasPositive) {
    throw new ValidationError(
      'weightedStrategy: at least one provider must have a positive weight',
    );
  }
  const random = options.random ?? Math.random;

  return {
    order(providers) {
      const pool: { provider: EmailProvider; weight: number }[] = [];
      const rest: EmailProvider[] = [];
      let total = 0;
      for (const provider of providers) {
        const weight = weights[provider.name] ?? 0;
        if (weight > 0) {
          pool.push({ provider, weight });
          total += weight;
        } else {
          rest.push(provider);
        }
      }

      const ordered: EmailProvider[] = [];
      while (pool.length > 0) {
        let r = random() * total;
        let i = 0;
        for (; i < pool.length - 1; i += 1) {
          r -= pool[i]!.weight;
          if (r < 0) break;
        }
        const [picked] = pool.splice(i, 1);
        ordered.push(picked!.provider);
        total -= picked!.weight;
      }
      return [...ordered, ...rest];
    },
  };
}

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
