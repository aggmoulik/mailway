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
import type { UsesendErrorResponse } from './types';

/** Maps a useSend error (`{ message, code }`) onto the core taxonomy. */
export function mapUsesendError(error: UsesendErrorResponse, provider: string): MailxError {
  const message = error.message || 'useSend request failed';
  const statusCode = readStatusCode(error);
  const category: MailxErrorCode =
    statusCode !== undefined ? httpStatusToCategory(statusCode) : categoryFromCode(error.code);

  switch (category) {
    case 'auth':
      return new AuthError(message, { provider, cause: error });
    case 'validation':
      return new ValidationError(message, { provider, cause: error });
    case 'rate_limit':
      return new RateLimitError(message, { provider, cause: error });
    case 'timeout':
      return new TimeoutError(message, { provider, cause: error });
    case 'network':
      return new NetworkError(message, { provider, cause: error });
    case 'provider':
    default:
      return new ProviderError(message, {
        provider,
        cause: error,
        providerCode: error.code,
        retryable: statusCode === undefined ? true : statusCode >= 500,
        ...(statusCode !== undefined ? { statusCode } : {}),
      });
  }
}

function categoryFromCode(code: string): MailxErrorCode {
  const c = code.toUpperCase();
  if (c.includes('UNAUTH') || c.includes('FORBIDDEN') || c.includes('API_KEY')) return 'auth';
  if (c.includes('RATE') || c.includes('QUOTA') || c.includes('LIMIT')) return 'rate_limit';
  if (
    c.includes('VALIDATION') ||
    c.includes('INVALID') ||
    c.includes('BAD_REQUEST') ||
    c.includes('NOT_FOUND') ||
    c.includes('REQUIRED')
  ) {
    return 'validation';
  }
  return 'provider';
}

function readStatusCode(error: UsesendErrorResponse): number | undefined {
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === 'number' ? value : undefined;
}
