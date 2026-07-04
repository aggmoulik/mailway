import type { Attachment, NormalizedMessage } from '@mailway/core';
import type { Attachment as ResendAttachment, CreateEmailOptions, Tag as ResendTag } from 'resend';

/** Maps a {@link NormalizedMessage} onto Resend's `emails.send` payload. */
export function toResendPayload(message: NormalizedMessage): CreateEmailOptions {
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
    ...(message.tags !== undefined ? { tags: toResendTags(message.tags) } : {}),
    ...(message.attachments !== undefined
      ? { attachments: message.attachments.map(toResendAttachment) }
      : {}),
  } as CreateEmailOptions;
}

function toResendTags(tags: Record<string, string>): ResendTag[] {
  return Object.entries(tags).map(([name, value]) => ({ name, value }));
}

function toResendAttachment(attachment: Attachment): ResendAttachment {
  return {
    filename: attachment.filename,
    ...(attachment.content !== undefined
      ? {
          content:
            typeof attachment.content === 'string' ? attachment.content : Buffer.from(attachment.content),
        }
      : {}),
    ...(attachment.url !== undefined ? { path: attachment.url } : {}),
    ...(attachment.contentType !== undefined ? { contentType: attachment.contentType } : {}),
    ...(attachment.contentId !== undefined ? { inlineContentId: attachment.contentId } : {}),
  };
}
