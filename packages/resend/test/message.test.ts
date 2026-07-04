import { describe, it, expect } from 'vitest';
import type { NormalizedMessage } from '@mailway/core';
import { toResendPayload } from '../src/message';

const base: NormalizedMessage = { from: 'a@x.com', to: 'b@y.com', subject: 's', text: 't' };

describe('toResendPayload', () => {
  it('maps required fields', () => {
    const p = toResendPayload(base);
    expect(p.from).toBe('a@x.com');
    expect(p.to).toBe('b@y.com');
    expect(p.subject).toBe('s');
    expect(p.text).toBe('t');
  });

  it('passes through array recipients, cc, bcc, replyTo', () => {
    const p = toResendPayload({ ...base, to: ['b@y.com', 'c@z.com'], cc: 'd@z.com', bcc: ['e@z.com'], replyTo: 'r@z.com' });
    expect(p.to).toEqual(['b@y.com', 'c@z.com']);
    expect(p.cc).toBe('d@z.com');
    expect(p.bcc).toEqual(['e@z.com']);
    expect(p.replyTo).toBe('r@z.com');
  });

  it('maps tags Record to Resend [{name,value}]', () => {
    const p = toResendPayload({ ...base, tags: { env: 'prod', team: 'x' } });
    expect(p.tags).toEqual([{ name: 'env', value: 'prod' }, { name: 'team', value: 'x' }]);
  });

  it('maps content, url (->path), and inline (contentId->inlineContentId) attachments', () => {
    const p = toResendPayload({
      ...base,
      attachments: [
        { filename: 'a.txt', content: 'aGk=' },
        { filename: 'b.pdf', url: 'https://x/b.pdf', contentType: 'application/pdf' },
        { filename: 'img.png', content: 'aGk=', contentId: 'cid1', disposition: 'inline' },
      ],
    });
    expect(p.attachments?.[0]).toEqual({ filename: 'a.txt', content: 'aGk=' });
    expect(p.attachments?.[1]).toMatchObject({ filename: 'b.pdf', path: 'https://x/b.pdf', contentType: 'application/pdf' });
    expect(p.attachments?.[2]).toMatchObject({ filename: 'img.png', inlineContentId: 'cid1' });
  });

  it('converts Uint8Array attachment content to Buffer', () => {
    const p = toResendPayload({ ...base, attachments: [{ filename: 'x', content: new Uint8Array([104, 105]) }] });
    expect(Buffer.isBuffer(p.attachments?.[0]?.content)).toBe(true);
  });

  it('omits undefined optionals', () => {
    const p = toResendPayload(base);
    expect('cc' in p).toBe(false);
    expect('attachments' in p).toBe(false);
    expect('tags' in p).toBe(false);
  });
});
