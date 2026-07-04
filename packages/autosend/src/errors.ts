import {
  AuthError,
  type MailxError,
  type MailxErrorCode,
  NetworkError,
  ProviderError,
  RateLimitError,
  TimeoutError,
  ValidationError,
  httpStatusToCategory,
} from '@mailway/core';

export interface AutosendErrorInput {
  message: string;
  provider: string;
  cause: unknown;
  statusCode?: number;
}

/** Maps an AutoSend failure (status code + message) onto the core taxonomy. */
export function mapAutosendError(input: AutosendErrorInput): MailxError {
  const { message, provider, cause, statusCode } = input;
  const category: MailxErrorCode = statusCode !== undefined ? httpStatusToCategory(statusCode) : 'provider';
  switch (category) {
    case 'auth':
      return new AuthError(message, { provider, cause });
    case 'validation':
      return new ValidationError(message, { provider, cause });
    case 'rate_limit':
      return new RateLimitError(message, { provider, cause });
    case 'timeout':
      return new TimeoutError(message, { provider, cause });
    case 'network':
      return new NetworkError(message, { provider, cause });
    case 'provider':
    default:
      return new ProviderError(message, {
        provider,
        cause,
        retryable: statusCode === undefined ? true : statusCode >= 500,
        ...(statusCode !== undefined ? { statusCode } : {}),
      });
  }
}
