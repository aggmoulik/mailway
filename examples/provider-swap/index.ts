/**
 * Provider swap + failover demo.
 *
 * Shows that switching or combining providers is a one-line config change: the
 * app code and the message never change. Runs with NO network / NO API keys by
 * injecting fake SDK clients. For real use, pass `{ apiKey }` instead of
 * `{ client }`.
 */
import { createMailer } from '@mailway/core';
import type { NormalizedMessage } from '@mailway/core';
import { createResendProvider } from '@mailway/resend';
import type { ResendClient } from '@mailway/resend';
import { createUsesendProvider } from '@mailway/usesend';
import type { UsesendClient } from '@mailway/usesend';
import { createAutosendProvider } from '@mailway/autosend';
import type { AutosendClient } from '@mailway/autosend';

const message: NormalizedMessage = {
  from: 'you@example.com',
  to: 'user@example.com',
  subject: 'Hello from mailway',
  text: 'The same message body, whichever provider sends it.',
};

// --- fake SDK clients (so the demo runs hermetically) ---
const downUsesend = {
  emails: { send: async () => { throw new TypeError('useSend is down'); } },
} as unknown as UsesendClient;
const workingResend = {
  emails: { send: async () => ({ data: { id: 're_123' }, error: null }) },
} as unknown as ResendClient;
const workingAutosend = {
  emails: { send: async () => ({ success: true, data: { emailId: 'as_456' } }) },
} as unknown as AutosendClient;

async function main(): Promise<void> {
  // Failover: useSend is primary but down -> createMailer advances to Resend.
  const usesend = createUsesendProvider({ client: downUsesend });
  const resend = createResendProvider({ client: workingResend });
  const mailer = createMailer({ providers: [usesend, resend], retry: { retries: 0 } });
  const result = await mailer.send(message);
  console.log(`failover  -> primary "useSend" failed, sent via "${result.provider}" (${result.id})`);

  // Swap: change the primary by reordering the providers array. Nothing else changes.
  const autosend = createAutosendProvider({ client: workingAutosend });
  const swapped = createMailer({ providers: [autosend, resend], retry: { retries: 0 } });
  const swappedResult = await swapped.send(message);
  console.log(`swap      -> primary is now "${swappedResult.provider}" (${swappedResult.id})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
