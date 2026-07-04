# @mailway/usesend

[useSend](https://usesend.com) adapter for [mailway](../../README.md) (formerly
Unosend; self-hostable). Implements `@mailway/core`'s `EmailProvider` on the
`usesend-js` SDK.

```sh
pnpm add @mailway/usesend @mailway/core usesend-js
```

```ts
import { createUsesendProvider } from '@mailway/usesend';
const usesend = createUsesendProvider({ apiKey: process.env.USESEND_API_KEY });
// self-hosted: createUsesendProvider({ apiKey, baseUrl: 'https://app.example.com' })
```

Exports `createUsesendProvider`, `usesendWebhookScheme`, `mapUsesendEvent`,
`mapUsesendError`, `toUsesendPayload`.

**Webhooks:** hex HMAC-SHA256 over `"${timestamp}.${rawBody}"`, signature in
`X-UseSend-Signature` (`v1=<hex>`), with a **millisecond** timestamp — the scheme
sets `timestampUnit: 'milliseconds'`. **Attachments** must carry base64 `content`
(useSend has no URL/path attachments); URL-only attachments throw a `ValidationError`.
