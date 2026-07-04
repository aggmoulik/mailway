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
import type { ErrorResponse } from 'resend';

// Resend's typed error surface is `{ name, message }` only. Map by name; if a
// runtime `statusCode` is present on the payload, prefer it.
const CATEGORY_BY_NAME: Record<string, MailxErrorCode> = {
  missing_api_key: 'auth',
  invalid_api_key: 'auth',
  restricted_api_key: 'auth',
  invalid_access: 'auth',
  rate_limit_exceeded: 'rate_limit',
  daily_quota_exceeded: 'rate_limit',
  validation_error: 'validation',
  missing_required_field: 'validation',
  invalid_parameter: 'validation',
  invalid_from_address: 'validation',
  invalid_attachment: 'validation',
  invalid_idempotency_key: 'validation',
  invalid_idempotent_request: 'validation',
  not_found: 'validation',
  internal_server_error: 'provider',
  application_error: 'provider',
};

/** Maps a Resend {@link ErrorResponse} onto the `@mailway/core` error taxonomy. */
export function mapResendError(error: ErrorResponse, provider: string): MailxError {
  const message = error.message || 'Resend request failed';
  const statusCode = readStatusCode(error);
  const category: MailxErrorCode =
    statusCode !== undefined ? httpStatusToCategory(statusCode) : (CATEGORY_BY_NAME[error.name] ?? 'provider');

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
        providerCode: error.name,
        retryable: statusCode === undefined ? true : statusCode >= 500,
        ...(statusCode !== undefined ? { statusCode } : {}),
      });
  }
}

function readStatusCode(error: ErrorResponse): number | undefined {
  const maybe = (error as { statusCode?: unknown }).statusCode;
  return typeof maybe === 'number' ? maybe : undefined;
}
