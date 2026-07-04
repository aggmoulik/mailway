# Example: webhook receiver

One `createWebhookReceiver` per provider. Resend (Svix / base64), AutoSend (raw
hex HMAC), and useSend (timestamped hex HMAC) all sign webhooks differently, but
the receiver gives you one uniform loop: **verify signature → map to a
`NormalizedWebhookEvent` → dispatch to typed `.on(type, handler)` handlers.**

```sh
pnpm --filter @mailway/example-webhook-receiver start
```

It runs with no network: the demo plays the provider by signing a sample event
with the same `WebhookScheme` the receiver verifies against, then also shows a
tampered body being rejected.

In production, pass the real signing secret and the untouched request body +
headers straight from your HTTP framework:

```ts
import { createWebhookReceiver } from '@mailway/core';
import { resendWebhookScheme, mapResendEvent } from '@mailway/resend';

const receiver = createWebhookReceiver({
  scheme: resendWebhookScheme,
  secret: process.env.RESEND_WEBHOOK_SECRET!,
  map: mapResendEvent,
});
receiver.on('bounced', (event) => suppress(event.recipient));

app.post('/webhooks/resend', (req, res) => {
  receiver.handle(req.rawBody, req.headers); // throws on a bad signature
  res.sendStatus(200);
});
```

Swap `resendWebhookScheme` / `mapResendEvent` for the `autosend*` or `usesend*`
pair to receive from a different provider — the handler code stays identical.
