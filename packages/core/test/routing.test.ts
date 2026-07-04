import { describe, it, expect, vi } from 'vitest';
import { createMailer, roundRobinStrategy, weightedStrategy } from '../src/routing';
import type { EmailProvider } from '../src/provider';
import type { NormalizedMessage } from '../src/message';
import { NetworkError, AuthError, ValidationError } from '../src/errors';

const msg: NormalizedMessage = { from: 'a@x.com', to: 'b@y.com', subject: 's', text: 't' };

/** A provider whose send echoes its own name, for asserting which one was chosen. */
const provider = (name: string): EmailProvider => ({
  name,
  send: vi.fn(async () => ({ id: name, provider: name })),
});

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

describe('roundRobinStrategy', () => {
  it('rotates the primary provider across successive sends', async () => {
    const p1 = provider('p1');
    const p2 = provider('p2');
    const p3 = provider('p3');
    const mailer = createMailer({ providers: [p1, p2, p3], strategy: roundRobinStrategy() });
    const results = [
      await mailer.send(msg),
      await mailer.send(msg),
      await mailer.send(msg),
      await mailer.send(msg),
    ];
    expect(results.map((r) => r.provider)).toEqual(['p1', 'p2', 'p3', 'p1']);
  });

  it('returns a full rotation so every provider stays available for failover', () => {
    const providers = [provider('p1'), provider('p2'), provider('p3')];
    const strategy = roundRobinStrategy();
    expect(strategy.order(providers).map((p) => p.name)).toEqual(['p1', 'p2', 'p3']);
    expect(strategy.order(providers).map((p) => p.name)).toEqual(['p2', 'p3', 'p1']);
    expect(strategy.order(providers).map((p) => p.name)).toEqual(['p3', 'p1', 'p2']);
    expect(strategy.order(providers).map((p) => p.name)).toEqual(['p1', 'p2', 'p3']);
  });

  it('fails over to the next provider in the rotation', async () => {
    const p1: EmailProvider = {
      name: 'p1',
      send: vi.fn(async () => {
        throw new NetworkError('down');
      }),
    };
    const p2 = provider('p2');
    const mailer = createMailer({
      providers: [p1, p2],
      strategy: roundRobinStrategy(),
      retry: { retries: 0 },
    });
    const res = await mailer.send(msg);
    expect(res.provider).toBe('p2');
  });

  it('always returns the sole provider when only one is configured', () => {
    const strategy = roundRobinStrategy();
    const only = [provider('p1')];
    expect(strategy.order(only).map((p) => p.name)).toEqual(['p1']);
    expect(strategy.order(only).map((p) => p.name)).toEqual(['p1']);
  });

  it('does not mutate the input array', () => {
    const input = [provider('p1'), provider('p2')];
    roundRobinStrategy().order(input);
    expect(input.map((p) => p.name)).toEqual(['p1', 'p2']);
  });
});

describe('weightedStrategy', () => {
  it('routes the primary slot into the correct weight band', () => {
    const p1 = provider('p1');
    const p2 = provider('p2');
    // weights 1:3 → total 4; p1 band is r in [0,1), p2 band is r in [1,4)
    const first = (r: number) =>
      weightedStrategy({ p1: 1, p2: 3 }, { random: () => r }).order([p1, p2])[0]!.name;
    expect(first(0)).toBe('p1');
    expect(first(0.2)).toBe('p1'); // r = 0.8 → p1 band
    expect(first(0.25)).toBe('p2'); // r = 1.0 → p2 band
    expect(first(0.99)).toBe('p2'); // r ≈ 3.96 → p2 band
  });

  it('places zero-weight and unweighted providers last, as failover only', () => {
    const p1 = provider('p1');
    const p2 = provider('p2');
    const p3 = provider('p3');
    // p2 explicitly 0, p3 omitted → both are fallback-only, after weighted p1
    const strategy = weightedStrategy({ p1: 5, p2: 0 }, { random: () => 0 });
    const order = strategy.order([p1, p2, p3]).map((p) => p.name);
    expect(order[0]).toBe('p1');
    expect(order.slice(1)).toEqual(['p2', 'p3']);
  });

  it('fails over from the weighted primary to the remaining provider', async () => {
    const p1: EmailProvider = {
      name: 'p1',
      send: vi.fn(async () => {
        throw new NetworkError('down');
      }),
    };
    const p2 = provider('p2');
    const mailer = createMailer({
      providers: [p1, p2],
      strategy: weightedStrategy({ p1: 10, p2: 1 }, { random: () => 0 }),
      retry: { retries: 0 },
    });
    const res = await mailer.send(msg);
    expect(res.provider).toBe('p2');
  });

  it('does not mutate the input array', () => {
    const input = [provider('p1'), provider('p2')];
    weightedStrategy({ p1: 1, p2: 1 }, { random: () => 0 }).order(input);
    expect(input.map((p) => p.name)).toEqual(['p1', 'p2']);
  });

  it('throws on a negative weight', () => {
    expect(() => weightedStrategy({ p1: -1 })).toThrow(ValidationError);
  });

  it('throws on a non-finite weight', () => {
    expect(() => weightedStrategy({ p1: Infinity })).toThrow(ValidationError);
    expect(() => weightedStrategy({ p1: NaN })).toThrow(ValidationError);
  });

  it('throws when no provider has a positive weight', () => {
    expect(() => weightedStrategy({ p1: 0, p2: 0 })).toThrow(ValidationError);
    expect(() => weightedStrategy({})).toThrow(ValidationError);
  });
});
