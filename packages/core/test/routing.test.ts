import { describe, it, expect, vi } from 'vitest';
import { createMailer } from '../src/routing';
import type { EmailProvider } from '../src/provider';
import type { NormalizedMessage } from '../src/message';
import { NetworkError, AuthError } from '../src/errors';

const msg: NormalizedMessage = { from: 'a@x.com', to: 'b@y.com', subject: 's', text: 't' };

describe('createMailer failover', () => {
  it('returns the first provider result and skips later providers', async () => {
    const s1 = vi.fn(async () => ({ id: '1', provider: 'p1' }));
    const s2 = vi.fn(async () => ({ id: '2', provider: 'p2' }));
    const p1: EmailProvider = { name: 'p1', send: s1 };
    const p2: EmailProvider = { name: 'p2', send: s2 };
    const mailer = createMailer({ providers: [p1, p2] });
    const res = await mailer.send(msg);
    expect(res).toEqual({ id: '1', provider: 'p1' });
    expect(s2).not.toHaveBeenCalled();
  });

  it('fails over to the next provider when the first fails', async () => {
    const s1 = vi.fn(async () => {
      throw new NetworkError('down');
    });
    const s2 = vi.fn(async () => ({ id: '2', provider: 'p2' }));
    const p1: EmailProvider = { name: 'p1', send: s1 };
    const p2: EmailProvider = { name: 'p2', send: s2 };
    const mailer = createMailer({ providers: [p1, p2], retry: { retries: 0 } });
    const res = await mailer.send(msg);
    expect(res.provider).toBe('p2');
    expect(s1).toHaveBeenCalledTimes(1);
    expect(s2).toHaveBeenCalledTimes(1);
  });

  it('aggregates per-provider errors when all providers fail', async () => {
    const p1: EmailProvider = {
      name: 'p1',
      send: vi.fn(async () => {
        throw new NetworkError('down');
      }),
    };
    const p2: EmailProvider = {
      name: 'p2',
      send: vi.fn(async () => {
        throw new AuthError('bad');
      }),
    };
    const mailer = createMailer({ providers: [p1, p2], retry: { retries: 0 } });
    await expect(mailer.send(msg)).rejects.toBeInstanceOf(AggregateError);
    try {
      await mailer.send(msg);
      expect.unreachable('should have thrown');
    } catch (e) {
      const agg = e as AggregateError;
      expect(agg.errors).toHaveLength(2);
      expect(agg.errors[0]).toBeInstanceOf(NetworkError);
      expect(agg.errors[1]).toBeInstanceOf(AuthError);
    }
  });

  it('applies a custom RoutingStrategy order', async () => {
    const s1 = vi.fn(async () => ({ id: '1', provider: 'p1' }));
    const s2 = vi.fn(async () => ({ id: '2', provider: 'p2' }));
    const p1: EmailProvider = { name: 'p1', send: s1 };
    const p2: EmailProvider = { name: 'p2', send: s2 };
    const mailer = createMailer({
      providers: [p1, p2],
      strategy: { order: (ps) => [...ps].reverse() },
    });
    const res = await mailer.send(msg);
    expect(res.provider).toBe('p2');
    expect(s1).not.toHaveBeenCalled();
  });

  it('throws when no providers are configured', () => {
    expect(() => createMailer({ providers: [] })).toThrow();
  });
});
