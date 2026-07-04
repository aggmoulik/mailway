import { describe, it, expect, vi } from 'vitest';
import type { NormalizedMessage } from '@mailway/core';
import { AuthError, NetworkError } from '@mailway/core';
import type { CreateEmailResponse } from 'resend';
import { createResendProvider, type ResendClient } from '../src/provider';

const msg: NormalizedMessage = { from: 'a@x.com', to: 'b@y.com', subject: 's', text: 't' };

function fakeClient(send: ResendClient['emails']['send']): ResendClient {
  return { emails: { send } };
}

const ok = (id: string): CreateEmailResponse => ({ data: { id }, error: null });
const fail = (name: string, message: string): CreateEmailResponse =>
  ({ data: null, error: { name, message } }) as unknown as CreateEmailResponse;

describe('createResendProvider', () => {
  it('returns a SendResult on success', async () => {
    const send = vi.fn(async () => ok('email_123'));
    const provider = createResendProvider({ client: fakeClient(send) });
    const res = await provider.send(msg);
    expect(res).toEqual({ id: 'email_123', provider: 'resend', raw: { id: 'email_123' } });
    expect(send).toHaveBeenCalledOnce();
  });

  it('exposes the Resend webhook scheme', () => {
    const provider = createResendProvider({ client: fakeClient(async () => ok('e')) });
    expect(provider.webhook?.headers.signature).toBe('svix-signature');
  });

  it('forwards idempotencyKey to the SDK', async () => {
    const send = vi.fn(async () => ok('e1'));
    const provider = createResendProvider({ client: fakeClient(send) });
    await provider.send(msg, { idempotencyKey: 'key-1' });
    expect(send).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: 'key-1' });
  });

  it('maps an API error onto the taxonomy', async () => {
    const send = vi.fn(async () => fail('invalid_api_key', 'bad key'));
    const provider = createResendProvider({ client: fakeClient(send) });
    await expect(provider.send(msg)).rejects.toBeInstanceOf(AuthError);
  });

  it('wraps a thrown transport failure as NetworkError', async () => {
    const send = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const provider = createResendProvider({ client: fakeClient(send) });
    await expect(provider.send(msg)).rejects.toBeInstanceOf(NetworkError);
  });

  it('short-circuits when the signal is already aborted', async () => {
    const send = vi.fn(async () => ok('e'));
    const provider = createResendProvider({ client: fakeClient(send) });
    const controller = new AbortController();
    controller.abort();
    await expect(provider.send(msg, { signal: controller.signal })).rejects.toBeDefined();
    expect(send).not.toHaveBeenCalled();
  });
});
