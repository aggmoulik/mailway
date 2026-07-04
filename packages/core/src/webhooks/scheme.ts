/**
 * Declarative description of how a provider signs its webhooks. An adapter
 * supplies one of these; core verifies signatures generically (see
 * {@link verifyWebhook}) with zero third-party dependencies. The axes here
 * cover Svix/Resend, Stripe-style, and raw-HMAC schemes.
 */
export interface WebhookScheme {
  /** Header NAMES (not values) carrying the signature and optional id/timestamp. */
  headers: { id?: string; timestamp?: string; signature: string };
  algorithm: 'sha256' | 'sha1';
  /** Builds the exact string that was signed, from raw body + (lowercased) headers. */
  buildSignedContent(ctx: { headers: Record<string, string>; rawBody: string }): string;
  /** Decodes the signing secret into raw key bytes (e.g. strip a prefix + base64-decode). */
  decodeSecret(secret: string): Uint8Array;
  signatureEncoding: 'base64' | 'hex';
  /** Extracts one or more candidate signatures (supports rotated / multi-sig headers). */
  parseSignatureHeader(value: string): string[];
  /** Replay window in seconds; `null` or omitted skips the timestamp check. */
  toleranceSeconds?: number | null;
  /** Unit of the timestamp header for the replay check. Defaults to `'seconds'`. */
  timestampUnit?: 'seconds' | 'milliseconds';
}
