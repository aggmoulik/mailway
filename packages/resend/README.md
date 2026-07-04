# @mailway/resend

[Resend](https://resend.com) adapter for [mailway](../../README.md). Implements
`@mailway/core`'s `EmailProvider` on the official `resend` SDK, maps failures onto
the core error taxonomy, and ships the Svix-shaped webhook scheme + event mapper.

## Install

```sh
pnpm add @mailway/resend @mailway/core resend
```

`@mailway/core` and `resend` are peer dependencies.

## Send

```ts
import { createResendProvider } from '@mailway/resend';
import { createMailer } from '@mailway/core';

const resend = createResendProvider({ apiKey: process.env.RESEND_API_KEY });
const mailer = createMailer({ providers: [resend] });

await mailer.send({
  from: 'you@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hi</p>',
});
```

Inject a client for tests instead of an API key: `createResendProvider({ client })`.

## Webhooks

Resend signs webhooks with Svix. The adapter exports the scheme + mapper; core
verifies and dispatches:

```ts
import { createWebhookReceiver } from '@mailway/core';
import { resendWebhookScheme, mapResendEvent } from '@mailway/resend';

const receiver = createWebhookReceiver({
  scheme: resendWebhookScheme,
  secret: process.env.RESEND_WEBHOOK_SECRET!,
  map: mapResendEvent,
});
receiver.on('bounced', (e) => console.log('bounced', e.emailId));

// in your HTTP handler:
receiver.handle(rawBody, headers); // throws on invalid signature
```

## Exports

`createResendProvider`, `resendWebhookScheme`, `mapResendEvent`, `mapResendError`,
`toResendPayload`, and the `ResendClient` / `ResendProviderConfig` types.
