/**
 * Local structural types for useSend's email API. The `usesend-js` package
 * declares these (openapi-generated) but does not export them, so the adapter
 * defines the minimal shapes it needs.
 */
export interface UsesendSendPayload {
  from: string;
  to: string | string[];
  subject?: string;
  html?: string | null;
  text?: string | null;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  headers?: Record<string, string>;
  attachments?: Array<{ filename: string; content: string }>;
  scheduledAt?: string;
}

export interface UsesendErrorResponse {
  message: string;
  code: string;
}

export interface UsesendCreateEmailResponse {
  data: { emailId?: string } | null;
  error: UsesendErrorResponse | null;
}
