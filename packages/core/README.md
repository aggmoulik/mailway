# @mailway/core

Framework-agnostic core contract for multi-provider email. Puts providers behind
one interface and owns the hard cross-provider parts — **webhook normalization**
and **failover** — with **zero runtime dependencies beyond TypeBox**.

> Milestone 1 ships the stable contract only. **No provider adapters yet.**

## Install

```sh
pnpm add @mailway/core
```

## The contract

```ts
import type { EmailProvider, NormalizedMessage } from '@mailway/core';
import { createMailer, withRetry, verifyWebhook, createWebhookReceiver } from '@mailway/core';
```

- **`EmailProvider`** — the interface every adapter implements: `name`,
  `send(message, opts?)`, and an optional `webhook` scheme.
- **`NormalizedMessage` / `Attachment`** — provider-agnostic message shape.
  Invariants: a message has **≥1 of `html`|`text`**; an attachment has
  **exactly one of `content`|`url`**. Both are expressed natively in the emitted
  JSON Schema and enforced at runtime via TypeBox `Value.Check`.
- **Error taxonomy** — `MailxError` base + `AuthError`, `ValidationError`,
  `RateLimitError`, `ProviderError`, `NetworkError`, `TimeoutError`. Each carries
  a `code` and `retryable` flag; the **raw provider payload lives on `cause`**
  and is never interpolated into `message`. `httpStatusToCategory(status)` maps
  HTTP statuses to categories for adapters to reuse.
- **`withRetry(fn, opts?)`** — exponential backoff + full jitter, honors
  `RateLimitError.retryAfter`, and short-circuits on an `AbortSignal`.
- **`createMailer({ providers, strategy?, retry? })`** — tries providers in
  strategy order (ordered by default), each attempt wrapped in `withRetry`;
  all-fail throws an `AggregateError` of per-provider `MailxError`s.
- **Webhooks** — supply a declarative `WebhookScheme`; `verifyWebhook` does
  HMAC verification (constant-time, multi-sig, replay tolerance) with **no
  `svix` dependency**; `createWebhookReceiver` wires verify → map → dispatch.

## Conventions (for adapter authors — M2+)

An adapter is a package that **depends only on `@mailway/core`** and its provider
SDK, and exports an object implementing `EmailProvider`:

1. **Map into `NormalizedMessage`** on the way in; return a `SendResult`
   (`{ id, provider, raw? }`) on the way out.
2. **Map failures onto the error taxonomy.** Use `httpStatusToCategory` to pick
   the class; put the raw payload on `cause`, never in the message.
3. **For webhooks**, export a `WebhookScheme` describing header names, algorithm,
   signed-content construction, secret decoding, and signature parsing — then map
   raw events to `NormalizedWebhookEvent`. Core verifies generically.
4. **JSON Schemas** for the normalized types are emitted to `schemas/*.json`
   (draft-07) as the SSOT for cross-language ports.

See `src/index.ts` for the complete public surface (treated as the public API).
