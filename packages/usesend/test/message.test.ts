import { describe, it, expect } from 'vitest';
import type { NormalizedMessage } from '@mailway/core';
import { toUsesendPayload } from '../src/message';

const base: NormalizedMessage = { from: 'a@x.com', to: 'b@y.com', subject: 's', text: 't' };

describe('toUsesendPayload', () => {
  it('maps string recipients and body', () => {
    const p = toUsesendPayload({ ...base, to: ['b@y.com', 'c@z.com'], cc: 'd@z.com', replyTo: 'r@z.com', html: '<p>h</p>' });
    expect(p.to).toEqual(['b@y.com', 'c@z.com']);
    expect(p.from).toBe('a@x.com');
    expect(p.cc).toBe('d@z.com');
    expect(p.replyTo).toBe('r@z.com');
    expect(p.html).toBe('<p>h</p>');
  });

  it('maps base64 and Uint8Array attachment content', () => {
    const p = toUsesendPayload({
      ...base,
      attachments: [
        { filename: 'a.txt', content: 'aGk=' },
        { filename: 'b.bin', content: new Uint8Array([104, 105]) },
      ],
    });
    expect(p.attachments?.[0]).toEqual({ filename: 'a.txt', content: 'aGk=' });
    expect(p.attachments?.[1]).toEqual({ filename: 'b.bin', content: Buffer.from([104, 105]).toString('base64') });
  });

  it('throws for URL-only attachments (useSend needs content)', () => {
    expect(() => toUsesendPayload({ ...base, attachments: [{ filename: 'x', url: 'https://x/y' }] })).toThrow();
  });
});
