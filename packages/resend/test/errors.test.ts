import { describe, it, expect } from 'vitest';
import { AuthError, ProviderError, RateLimitError, ValidationError } from '@mailway/core';
import type { ErrorResponse } from 'resend';
import { mapResendError } from '../src/errors';

const err = (name: string, message: string, extra: Record<string, unknown> = {}): ErrorResponse =>
  ({ name, message, ...extra }) as unknown as ErrorResponse;

describe('mapResendError', () => {
  it('maps auth error names to AuthError (non-retryable)', () => {
    const e = mapResendError(err('invalid_api_key', 'API key is invalid'), 'resend');
    expect(e).toBeInstanceOf(AuthError);
    expect(e.retryable).toBe(false);
    expect(e.provider).toBe('resend');
  });

  it('maps validation error names to ValidationError', () => {
    expect(mapResendError(err('validation_error', 'bad'), 'resend')).toBeInstanceOf(ValidationError);
    expect(mapResendError(err('missing_required_field', 'bad'), 'resend')).toBeInstanceOf(ValidationError);
  });

  it('maps rate limit names to RateLimitError (retryable)', () => {
    const e = mapResendError(err('rate_limit_exceeded', 'slow down'), 'resend');
    expect(e).toBeInstanceOf(RateLimitError);
    expect(e.retryable).toBe(true);
  });

  it('maps server/unknown names to retryable ProviderError', () => {
    const e = mapResendError(err('internal_server_error', 'boom'), 'resend');
    expect(e).toBeInstanceOf(ProviderError);
    expect(e.retryable).toBe(true);
    const unknown = mapResendError(err('some_new_code', 'huh'), 'resend');
    expect(unknown).toBeInstanceOf(ProviderError);
  });

  it('prefers a runtime statusCode when present', () => {
    const e = mapResendError(err('application_error', 'x', { statusCode: 401 }), 'resend');
    expect(e).toBeInstanceOf(AuthError);
  });

  it('keeps the raw error on cause, never in message', () => {
    const raw = err('validation_error', 'Invalid field', { secret_token: 'sk_leak' });
    const e = mapResendError(raw, 'resend');
    expect(e.message).toBe('Invalid field');
    expect(e.message).not.toContain('sk_leak');
    expect(e.cause).toBe(raw);
  });
});
