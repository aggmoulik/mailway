import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { NormalizedMessageSchema, AttachmentSchema } from '../src/message';

const base = { from: 'a@x.com', to: 'b@y.com', subject: 'Hi' };

describe('NormalizedMessage schema', () => {
  it('accepts html-only, text-only, and both', () => {
    expect(Value.Check(NormalizedMessageSchema, { ...base, html: '<p>hi</p>' })).toBe(true);
    expect(Value.Check(NormalizedMessageSchema, { ...base, text: 'hi' })).toBe(true);
    expect(Value.Check(NormalizedMessageSchema, { ...base, html: '<p>', text: 'hi' })).toBe(true);
  });

  it('rejects a message with neither html nor text (>=1 invariant)', () => {
    expect(Value.Check(NormalizedMessageSchema, { ...base })).toBe(false);
  });

  it('accepts string and array recipients', () => {
    expect(Value.Check(NormalizedMessageSchema, { ...base, to: ['b@y.com', 'c@z.com'], text: 'hi' })).toBe(true);
    expect(Value.Check(NormalizedMessageSchema, { ...base, cc: 'c@z.com', bcc: ['d@z.com'], replyTo: 'r@z.com', text: 'hi' })).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(Value.Check(NormalizedMessageSchema, { from: 'a@x.com', to: 'b@y.com', text: 'hi' })).toBe(false); // no subject
  });

  it('accepts headers and tags as string maps', () => {
    expect(
      Value.Check(NormalizedMessageSchema, { ...base, text: 'hi', headers: { 'X-A': '1' }, tags: { env: 'prod' } }),
    ).toBe(true);
  });

  it('rejects non-string header values', () => {
    expect(Value.Check(NormalizedMessageSchema, { ...base, text: 'hi', headers: { 'X-A': 1 } })).toBe(false);
  });
});

describe('Attachment schema', () => {
  it('accepts content-only and url-only attachments', () => {
    expect(Value.Check(AttachmentSchema, { filename: 'a.txt', content: 'aGk=' })).toBe(true);
    expect(Value.Check(AttachmentSchema, { filename: 'a.txt', url: 'https://x/a.txt' })).toBe(true);
  });

  it('rejects both content and url together (exactly-one invariant)', () => {
    expect(Value.Check(AttachmentSchema, { filename: 'a.txt', content: 'aGk=', url: 'https://x' })).toBe(false);
  });

  it('rejects neither content nor url', () => {
    expect(Value.Check(AttachmentSchema, { filename: 'a.txt' })).toBe(false);
  });

  it('accepts inline disposition with contentId; rejects invalid disposition', () => {
    expect(
      Value.Check(AttachmentSchema, { filename: 'img.png', content: 'aGk=', disposition: 'inline', contentId: 'cid1' }),
    ).toBe(true);
    expect(Value.Check(AttachmentSchema, { filename: 'a', content: 'x', disposition: 'nope' })).toBe(false);
  });

  it('validates attachments nested inside a message', () => {
    const msg = { ...base, text: 't', attachments: [{ filename: 'a', content: 'x' }] };
    expect(Value.Check(NormalizedMessageSchema, msg)).toBe(true);
    expect(Value.Check(NormalizedMessageSchema, { ...msg, attachments: [{ filename: 'a' }] })).toBe(false);
  });
});
