import { Type } from '@sinclair/typebox';

const StringOrArray = Type.Union([Type.String(), Type.Array(Type.String())]);

const AttachmentBaseProps = {
  filename: Type.String(),
  contentType: Type.Optional(Type.String()),
  contentId: Type.Optional(Type.String()),
  disposition: Type.Optional(Type.Union([Type.Literal('attachment'), Type.Literal('inline')])),
};

/**
 * JSON Schema (SSOT) for {@link Attachment}. Invariant: exactly one of `content`
 * or `url`, expressed natively as a discriminated union where the excluded field
 * is `never`. In the schema `content` is the base64 wire form; the TypeScript
 * {@link Attachment} type additionally accepts `Uint8Array` (not representable
 * in JSON Schema) for ergonomics.
 */
export const AttachmentSchema = Type.Union(
  [
    Type.Object({ ...AttachmentBaseProps, content: Type.String(), url: Type.Optional(Type.Never()) }),
    Type.Object({ ...AttachmentBaseProps, url: Type.String(), content: Type.Optional(Type.Never()) }),
  ],
  { title: 'Attachment' },
);

/**
 * JSON Schema (SSOT) for {@link NormalizedMessage}. Invariant: at least one of
 * `html` or `text`, expressed natively via `allOf` + `anyOf`.
 */
export const NormalizedMessageSchema = Type.Intersect(
  [
    Type.Object({
      from: Type.String(),
      to: StringOrArray,
      cc: Type.Optional(StringOrArray),
      bcc: Type.Optional(StringOrArray),
      subject: Type.String(),
      html: Type.Optional(Type.String()),
      text: Type.Optional(Type.String()),
      replyTo: Type.Optional(StringOrArray),
      attachments: Type.Optional(Type.Array(AttachmentSchema)),
      headers: Type.Optional(Type.Record(Type.String(), Type.String())),
      tags: Type.Optional(Type.Record(Type.String(), Type.String())),
    }),
    Type.Union([Type.Object({ html: Type.String() }), Type.Object({ text: Type.String() })]),
  ],
  { title: 'NormalizedMessage' },
);

type Recipients = string | string[];

/**
 * A single attachment. Invariant: exactly one of {@link content} or {@link url}.
 * `content` is base64 or raw bytes; `disposition: 'inline'` with a `contentId`
 * embeds the attachment (e.g. `cid:` images).
 */
export interface Attachment {
  filename: string;
  content?: string | Uint8Array;
  url?: string;
  contentType?: string;
  contentId?: string;
  disposition?: 'attachment' | 'inline';
}

/**
 * A provider-agnostic email message. Invariant: at least one of `html` or `text`.
 */
export interface NormalizedMessage {
  from: string;
  to: Recipients;
  cc?: Recipients;
  bcc?: Recipients;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: Recipients;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}
