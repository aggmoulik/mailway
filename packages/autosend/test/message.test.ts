import { describe, it, expect } from 'vitest';
import type { NormalizedMessage } from '@mailway/core';
import { parseAddress, toAutosendOptions } from '../src/message';

describe('parseAddress', () => {
  it('parses a bare email', () => {
    expect(parseAddress('a@x.com')).toEqual({ email: 'a@x.com' });
  });
  it('parses "Name <email>"', () => {
    expect(parseAddress('Bob Jones <b@y.com>')).toEqual({ email: 'b@y.com', name: 'Bob Jones' });
  });
});

describe('toAutosendOptions', () => {
  const base: NormalizedMessage = { from: 'Ada <a@x.com>', to: 'b@y.com', subject: 's', html: '<p>h</p>' };

  it('maps addresses to objects and preserves subject/html', () => {
    const o = toAutosendOptions(base);
    expect(o.from).toEqual({ email: 'a@x.com', name: 'Ada' });
    expect(o.to).toEqual([{ email: 'b@y.com' }]);
    expect(o.subject).toBe('s');
    expect(o.html).toBe('<p>h</p>');
  });

  it('maps array recipients, cc, bcc, and a single replyTo', () => {
    const o = toAutosendOptions({ ...base, to: ['b@y.com', 'c@z.com'], cc: 'd@z.com', bcc: ['e@z.com'], replyTo: ['r@z.com'] });
    expect(o.to).toEqual([{ email: 'b@y.com' }, { email: 'c@z.com' }]);
    expect(o.cc).toEqual([{ email: 'd@z.com' }]);
    expect(o.bcc).toEqual([{ email: 'e@z.com' }]);
    expect(o.replyTo).toEqual({ email: 'r@z.com' });
  });
});
