import { ValidationError } from '@mailway/core';
import type { Attachment, NormalizedMessage } from '@mailway/core';
import type { UsesendSendPayload } from './types';

/** Maps a {@link NormalizedMessage} onto useSend's `emails.send` payload. */
export function toUsesendPayload(message: NormalizedMessage): UsesendSendPayload {
  return {
    from: message.from,
    to: message.to,
    subject: message.subject,
    ...(message.cc !== undefined ? { cc: message.cc } : {}),
    ...(message.bcc !== undefined ? { bcc: message.bcc } : {}),
    ...(message.replyTo !== undefined ? { replyTo: message.replyTo } : {}),
    ...(message.html !== undefined ? { html: message.html } : {}),
    ...(message.text !== undefined ? { text: message.text } : {}),
    ...(message.headers !== undefined ? { headers: message.headers } : {}),
    ...(message.attachments !== undefined
      ? { attachments: message.attachments.map(toUsesendAttachment) }
      : {}),
  };
}

function toUsesendAttachment(attachment: Attachment): { filename: string; content: string } {
  if (attachment.content === undefined) {
    throw new ValidationError(
      `useSend requires attachment content (base64); "${attachment.filename}" has only a URL`,
    );
  }
  const content =
    typeof attachment.content === 'string'
      ? attachment.content
      : Buffer.from(attachment.content).toString('base64');
  return { filename: attachment.filename, content };
}
