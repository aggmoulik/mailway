import { describe, it, expect } from 'vitest';
import { Resend } from 'resend';
import { createResendProvider } from '../src/provider';

// Gated live round-trip. Skipped unless RESEND_API_KEY and RESEND_TO are set.
const apiKey = process.env.RESEND_API_KEY;
const to = process.env.RESEND_TO;
const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

describe.skipIf(!apiKey || !to)('live Resend send', () => {
  it('sends a real email and returns an id', async () => {
    const provider = createResendProvider({ client: new Resend(apiKey) });
    const res = await provider.send({ from, to: to as string, subject: 'mailway live test', text: 'hello from mailway' });
    expect(res.id).toBeTruthy();
    expect(res.provider).toBe('resend');
  }, 30_000);
});
