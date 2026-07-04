# Design: `@mailway/resend` (Milestone 2)

**Status:** approved 2026-07-04.

## Goal
First real adapter. Implements `@mailway/core`'s `EmailProvider` on the official
`resend` SDK, maps failures onto the M1 error taxonomy, and supplies the
Svix-shaped `WebhookScheme` + event mapper. Core's webhook framework is already
proven against the real Svix vector and Resend signs with Svix, so verification
is done — M2 wires it.

## Decisions
- Package `@mailway/resend`; `@mailway/core` and `resend` are **peerDependencies**
  (+ devDependencies for the monorepo). Adds no runtime deps to core.
- Tests hermetic by default: inject a fake client (no module mocking). A live
  round-trip test is `skipIf(!RESEND_API_KEY)`.
- Examples deferred to M4.

## Public surface
```ts
createResendProvider(config: { apiKey?; client?; name? }): EmailProvider
resendWebhookScheme: WebhookScheme
mapResendEvent(raw: unknown): NormalizedWebhookEvent
```

## Behaviors
- Send: `client.emails.send(payload, { idempotencyKey })`. SDK returns
  `{ data, error }` (no throw on API errors) -> on `error`, map & throw; on
  `data`, return `{ id, provider, raw }`. Thrown fetch failures -> `NetworkError`;
  `signal.aborted` short-circuits.
- Message mapping (`toResendPayload`): recipients pass-through; `tags` Record ->
  `[{name,value}]`; attachments `content`->`content`, `url`->`path`, plus
  `filename`/`contentType`/`contentId`.
- Error mapping (`mapResendError`): `statusCode` via `httpStatusToCategory` +
  Resend error `name` -> the right `MailxError`; raw payload on `cause`.
- Webhook: `resendWebhookScheme` (Svix descriptor) + `mapResendEvent`, wired via
  core `createWebhookReceiver`.

## Layout
`packages/resend/src/{index,provider,message,errors,webhook}.ts`;
`test/{message,errors,provider,webhook}.test.ts` + gated `live.test.ts`.

## Validation gate
lint, strict `tsc --noEmit`, vitest, tsup dual ESM+CJS+dts, `attw`.
