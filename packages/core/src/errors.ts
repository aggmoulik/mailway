/**
 * Stable, provider-agnostic error taxonomy. Adapters map their raw failures
 * onto these types; the raw provider payload is kept on {@link MailxError.cause}
 * and is never interpolated into `message`.
 */
export type MailxErrorCode = 'auth' | 'validation' | 'rate_limit' | 'provider' | 'network' | 'timeout';

export interface MailxErrorOptions {
  /** The provider that produced the error, when known. */
  provider?: string;
  /** Raw provider payload. Lives here and is never put into `message`. */
  cause?: unknown;
}

export abstract class MailxError extends Error {
  abstract readonly code: MailxErrorCode;
  abstract readonly retryable: boolean;
  readonly provider?: string;

  constructor(message: string, options: MailxErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    if (options.provider !== undefined) {
      this.provider = options.provider;
    }
  }
}

export class AuthError extends MailxError {
  readonly code = 'auth';
  readonly retryable = false;
}

export class ValidationError extends MailxError {
  readonly code = 'validation';
  readonly retryable = false;
}

export interface RateLimitErrorOptions extends MailxErrorOptions {
  /** Seconds to wait before retrying, from the provider's Retry-After. */
  retryAfter?: number;
}

export class RateLimitError extends MailxError {
  readonly code = 'rate_limit';
  readonly retryable = true;
  readonly retryAfter?: number;

  constructor(message: string, options: RateLimitErrorOptions = {}) {
    super(message, options);
    if (options.retryAfter !== undefined) {
      this.retryAfter = options.retryAfter;
    }
  }
}

export interface ProviderErrorOptions extends MailxErrorOptions {
  statusCode?: number;
  providerCode?: string;
  /** Whether the request may be retried. Defaults to `false`. */
  retryable?: boolean;
}

export class ProviderError extends MailxError {
  readonly code = 'provider';
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly providerCode?: string;

  constructor(message: string, options: ProviderErrorOptions = {}) {
    super(message, options);
    this.retryable = options.retryable ?? false;
    if (options.statusCode !== undefined) {
      this.statusCode = options.statusCode;
    }
    if (options.providerCode !== undefined) {
      this.providerCode = options.providerCode;
    }
  }
}

export class NetworkError extends MailxError {
  readonly code = 'network';
  readonly retryable = true;
}

export class TimeoutError extends MailxError {
  readonly code = 'timeout';
  readonly retryable = true;
}

/**
 * Maps an HTTP status code to a {@link MailxErrorCode}. Adapters reuse this so
 * status-to-category mapping stays consistent across providers.
 */
export function httpStatusToCategory(status: number): MailxErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 408) return 'timeout';
  if (status === 429) return 'rate_limit';
  if (status >= 400 && status < 500) return 'validation';
  if (status >= 500) return 'provider';
  return 'provider';
}
