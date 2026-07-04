import { MailxError, RateLimitError } from './errors';

export interface RetryOptions {
  /** Maximum retries after the first attempt. Default 3 (=> up to 4 attempts). */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: 'full' | 'none';
  /** Honor {@link RateLimitError.retryAfter} as the wait. Default true. */
  respectRetryAfter?: boolean;
  /** Predicate deciding if an error is retryable. Default: `MailxError.retryable`. */
  isRetryable?: (error: unknown) => boolean;
  signal?: AbortSignal;
}

const defaultIsRetryable = (error: unknown): boolean => error instanceof MailxError && error.retryable;

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const sig = signal;
    const timer = setTimeout(() => {
      sig?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(timer);
      reject(abortReason(sig as AbortSignal));
    }
    sig?.addEventListener('abort', onAbort, { once: true });
  });
}

interface DelayParams {
  baseDelayMs: number;
  maxDelayMs: number;
  factor: number;
  jitter: 'full' | 'none';
  respectRetryAfter: boolean;
}

function computeDelay(attempt: number, error: unknown, o: DelayParams): number {
  if (o.respectRetryAfter && error instanceof RateLimitError && error.retryAfter !== undefined) {
    return error.retryAfter * 1000;
  }
  const exponential = Math.min(o.maxDelayMs, o.baseDelayMs * o.factor ** attempt);
  return o.jitter === 'none' ? exponential : Math.random() * exponential;
}

/**
 * Runs `fn` with exponential backoff + full jitter. Retries only errors deemed
 * retryable, honors `Retry-After` from {@link RateLimitError}, and short-circuits
 * on an aborted signal.
 */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 200,
    maxDelayMs = 30_000,
    factor = 2,
    jitter = 'full',
    respectRetryAfter = true,
    isRetryable = defaultIsRetryable,
    signal,
  } = options;

  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw abortReason(signal);
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) {
        throw error;
      }
      await delay(computeDelay(attempt, error, { baseDelayMs, maxDelayMs, factor, jitter, respectRetryAfter }), signal);
    }
  }
}
