# @mailway/autosend

[AutoSend](https://autosend.com) adapter for [mailway](../../README.md). Implements
`@mailway/core`'s `EmailProvider` on the `autosendjs` SDK.

```sh
pnpm add @mailway/autosend @mailway/core autosendjs
```

```ts
import { createAutosendProvider } from '@mailway/autosend';
const autosend = createAutosendProvider({ apiKey: process.env.AUTOSEND_API_KEY });
```

Exports `createAutosendProvider`, `autosendWebhookScheme`, `mapAutosendEvent`,
`mapAutosendError`, `toAutosendOptions`, `parseAddress`.

**Webhooks:** hex HMAC-SHA256 over the raw body in `x-webhook-signature` (no
timestamp/replay window). Wire `autosendWebhookScheme` + `mapAutosendEvent` into
`createWebhookReceiver`.

**Limitations:** AutoSend's SDK has no attachment/custom-header/tag support;
`send()` throws a `ValidationError` if a message carries attachments. Addresses
are parsed from the normalized `"Name <email>"` / `"email"` strings into AutoSend's
`{ email, name }` objects.
