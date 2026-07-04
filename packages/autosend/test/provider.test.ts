import { describe, it, expect, vi } from 'vitest';
import type { NormalizedMessage } from '@mailway/core';
import { AuthError, NetworkError, ValidationError } from '@mailway/core';
import type { SendEmailResponse } from 'autosendjs';
import { createAutosendProvider, type AutosendClient } from '../src/provider';

const msg: NormalizedMessage = { from: 'a@x.com', to: 'b@y.com', subject: 's', text: 't' };

function fakeClient(send: AutosendClient['emails']['send']): AutosendClient {
  return { emails: { send } };
}
const ok = (emailId: string): SendEmailResponse => ({ success: true, data: { emailId } });

describe('createAutosendProvider', () => {
  it('returns a SendResult on success', async () => {
    const send = vi.fn(async () => ok('em_1'));
    const provider = createAutosendProvider({ client: fakeClient(send) });
    const res = await provider.send(msg);
    expect(res.id).toBe('em_1');
    expect(res.provider).toBe('autosend');
    expect(send).toHaveBeenCalledOnce();
  });

  it('exposes the AutoSend webhook scheme', () => {
    const provider = createAutosendProvider({ client: fakeClient(async () => ok('e')) });
    expect(provider.webhook?.headers.signature).toBe('x-webhook-signature');
    expect(provider.webhook?.signatureEncoding).toBe('hex');
  });

  it('maps an unsuccessful response onto the taxonomy', async () => {
    const send = vi.fn(async (): Promise<SendEmailResponse> => ({ success: false, error: 'bad key', statusCode: 401 }));
    const provider = createAutosendProvider({ client: fakeClient(send) });
    await expect(provider.send(msg)).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects messages with attachments (unsupported) before calling the SDK', async () => {
    const send = vi.fn(async () => ok('e'));
    const provider = createAutosendProvider({ client: fakeClient(send) });
    await expect(provider.send({ ...msg, attachments: [{ filename: 'a', content: 'x' }] })).rejects.toBeInstanceOf(ValidationError);
    expect(send).not.toHaveBeenCalled();
  });

  it('wraps a thrown transport failure as NetworkError', async () => {
    const send = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const provider = createAutosendProvider({ client: fakeClient(send) });
    await expect(provider.send(msg)).rejects.toBeInstanceOf(NetworkError);
  });

  it('short-circuits when the signal is already aborted', async () => {
    const send = vi.fn(async () => ok('e'));
    const provider = createAutosendProvider({ client: fakeClient(send) });
    const controller = new AbortController();
    controller.abort();
    await expect(provider.send(msg, { signal: controller.signal })).rejects.toBeDefined();
    expect(send).not.toHaveBeenCalled();
  });
});
