import type { NormalizedMessage } from '@mailway/core';
import type { EmailAddress, SendEmailOptions } from 'autosendjs';

/** Parses `"Name <email>"` or `"email"` into an AutoSend {@link EmailAddress}. */
export function parseAddress(input: string): EmailAddress {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(input);
  const email = (match?.[2] ?? input).trim();
  const name = match?.[1]?.trim();
  return name ? { email, name } : { email };
}

function toAddressList(input: string | string[]): EmailAddress[] {
  return (Array.isArray(input) ? input : [input]).map(parseAddress);
}

function firstAddress(input: string | string[]): EmailAddress {
  return parseAddress(Array.isArray(input) ? (input[0] ?? '') : input);
}

/**
 * Maps a {@link NormalizedMessage} onto AutoSend's send options. AutoSend does
 * not support attachments, custom headers, or tags — those are handled/omitted
 * by the provider (attachments are rejected up front).
 */
export function toAutosendOptions(message: NormalizedMessage): SendEmailOptions {
  return {
    from: parseAddress(message.from),
    to: toAddressList(message.to),
    subject: message.subject,
    ...(message.html !== undefined ? { html: message.html } : {}),
    ...(message.text !== undefined ? { text: message.text } : {}),
    ...(message.cc !== undefined ? { cc: toAddressList(message.cc) } : {}),
    ...(message.bcc !== undefined ? { bcc: toAddressList(message.bcc) } : {}),
    ...(message.replyTo !== undefined ? { replyTo: firstAddress(message.replyTo) } : {}),
  };
}
