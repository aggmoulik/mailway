import { describe, it, expect, vi } from 'vitest';
import type { NormalizedMessage } from '@mailway/core';
import { AuthError, NetworkError } from '@mailway/core';
import { createUsesendProvider, type UsesendClient } from '../src/provider';
import type { UsesendCreateEmailResponse } from '../src/types';

const msg: NormalizedMessage = { from: 'a@x.com', to: 'b@y.com', subject: 's', text: 't' };

function fakeClient(send: UsesendClient['emails']['send']): UsesendClient {
  return { emails: { send } };
}
const ok = (emailId: string): UsesendCreateEmailResponse => ({ data: { emailId }, error: null });
const fail = (message: string, code: string): UsesendCreateEmailResponse => ({ data: null, error: { message, code } });

describe('createUsesendProvider', () => {
  it('returns a SendResult on success', async () => {
    const send = vi.fn(async () => ok('em_1'));
    const provider = createUsesendProvider({ client: fakeClient(send) });
    const res = await provider.send(msg);
    expect(res.id).toBe('em_1');
    expect(res.provider).toBe('usesend');
    expect(send).toHaveBeenCalledOnce();
  });

  it('exposes the useSend webhook scheme with millisecond timestamps', () => {
    const provider = createUsesendProvider({ client: fakeClient(async () => ok('e')) });
    expect(provider.webhook?.headers.signature).toBe('x-usesend-signature');
    expect(provider.webhook?.timestampUnit).toBe('milliseconds');
  });

  it('maps an API error onto the taxonomy', async () => {
    const send = vi.fn(async () => fail('no access', 'UNAUTHORIZED'));
    const provider = createUsesendProvider({ client: fakeClient(send) });
    await expect(provider.send(msg)).rejects.toBeInstanceOf(AuthError);
  });

  it('wraps a thrown transport failure as NetworkError', async () => {
    const send = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const provider = createUsesendProvider({ client: fakeClient(send) });
    await expect(provider.send(msg)).rejects.toBeInstanceOf(NetworkError);
  });

  it('short-circuits when the signal is already aborted', async () => {
    const send = vi.fn(async () => ok('e'));
    const provider = createUsesendProvider({ client: fakeClient(send) });
    const controller = new AbortController();
    controller.abort();
    await expect(provider.send(msg, { signal: controller.signal })).rejects.toBeDefined();
    expect(send).not.toHaveBeenCalled();
  });
});
