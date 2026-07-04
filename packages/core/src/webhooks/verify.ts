import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WebhookScheme } from './scheme';
import { ValidationError } from '../errors';

export interface VerifyWebhookInput {
  rawBody: string;
  headers: Record<string, string>;
  secret: string;
}

/**
 * Verifies a webhook signature against a declarative {@link WebhookScheme} using
 * only Node's `crypto`. Throws a {@link ValidationError} on any failure (missing
 * header, stale timestamp, or signature mismatch).
 */
export function verifyWebhook(scheme: WebhookScheme, input: VerifyWebhookInput): void {
  const headers = lowercaseKeys(input.headers);

  const signatureHeader = headers[scheme.headers.signature.toLowerCase()];
  if (signatureHeader === undefined || signatureHeader === '') {
    throw new ValidationError(`Missing webhook signature header "${scheme.headers.signature}"`);
  }

  verifyTimestamp(scheme, headers);

  const signedContent = scheme.buildSignedContent({ headers, rawBody: input.rawBody });
  const key = scheme.decodeSecret(input.secret);
  const digest = createHmac(scheme.algorithm, Buffer.from(key)).update(signedContent).digest();
  const expected = scheme.signatureEncoding === 'hex' ? digest.toString('hex') : digest.toString('base64');

  const candidates = scheme.parseSignatureHeader(signatureHeader);
  const matched = candidates.some((candidate) => constantTimeEqual(candidate, expected));
  if (!matched) {
    throw new ValidationError('Webhook signature verification failed');
  }
}

function verifyTimestamp(scheme: WebhookScheme, headers: Record<string, string>): void {
  const timestampHeader = scheme.headers.timestamp;
  const tolerance = scheme.toleranceSeconds;
  if (timestampHeader === undefined || tolerance === undefined || tolerance === null) {
    return;
  }
  const raw = headers[timestampHeader.toLowerCase()];
  if (raw === undefined) {
    throw new ValidationError('Missing webhook timestamp header');
  }
  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) {
    throw new ValidationError('Invalid webhook timestamp header');
  }
  const unit = scheme.timestampUnit ?? 'seconds';
  const now = unit === 'milliseconds' ? Date.now() : Math.floor(Date.now() / 1000);
  const toleranceInUnit = unit === 'milliseconds' ? tolerance * 1000 : tolerance;
  if (Math.abs(now - timestamp) > toleranceInUnit) {
    throw new ValidationError('Webhook timestamp is outside the tolerance window');
  }
}

function lowercaseKeys(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Equal-length compare to avoid leaking length differences via early-return timing.
    timingSafeEqual(bb, bb);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
