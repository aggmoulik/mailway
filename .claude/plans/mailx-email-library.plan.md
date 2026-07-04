# Plan: `@mailway/core` — Stable Public Contract (Milestone 1)

**Status: COMPLETE** (implemented on `main`).

Framework-agnostic core for multi-provider email. Milestone 1 = pnpm monorepo
scaffold + a complete, tested `@mailway/core` with **no provider adapters**, so
the contract can be signed off in isolation.

## Decisions (locked)
- Schema SSOT: **TypeBox 0.34** (types via hand-authored interfaces mirroring the
  schemas; JSON Schema emitted natively). Cross-field invariants expressed in
  **draft-07** (`allOf`/`anyOf` for ≥1-of-html|text; `anyOf` + `not:{}` for
  exactly-one-of-content|url) and enforced at runtime via TypeBox `Value.Check`.
- JSON Schema **draft-07**, portable subset, `$schema`-stamped, CI drift-checked.
- Linter **Oxlint**; formatter **Prettier**.
- Webhooks **zero-dependency**: HMAC via `node:crypto`; adapters supply a
  declarative `WebhookScheme`. Proven against a fixed **Svix** signature vector.
- `SCOPE` is a single rename-able constant in `constants.ts`.
- Dual ESM+CJS build via tsup; `attw` clean.
- Committed directly to `main` (per session decision); no PR.

## Repo layout
Monorepo root (pnpm workspaces) + `packages/core` (the only package this
milestone ships). Source under `packages/core/src` (constants, message, errors,
provider, retry, routing, webhooks/{scheme,verify,events,receiver}, schema/emit),
emitted schemas in `packages/core/schemas`, tests in `packages/core/test`.

## Public surface (signed off — see `packages/core/src/index.ts`)
`EmailProvider` / `SendOptions` / `SendResult`; `NormalizedMessage` / `Attachment`
(+ schemas); `MailxError` taxonomy + `httpStatusToCategory`; `withRetry` /
`RetryOptions`; `createMailer` / `RoutingStrategy` / `Mailer`; `WebhookScheme` /
`verifyWebhook` / `NormalizedWebhookEvent(Type)` / `createWebhookReceiver`.

## Tasks (all done)
1. Scaffold monorepo — done.
2. `@mailway/core` skeleton + dual build — done.
3. Schemas + types (TDD) — done.
4. Error taxonomy (TDD) — done.
5. Retry w/ backoff + jitter (TDD) — done.
6. Failover routing (TDD) — done.
7. Webhook framework (TDD, fixed Svix vector) — done.
8. Public barrel + CI + changesets — done.

## Validation (all green)
`pnpm install` clean; `oxlint` clean; `tsc --noEmit` (strict) clean;
`vitest` 37 tests pass; `tsup` dual ESM+CJS+dts; `attw --pack` clean;
`schemas/*.json` emitted (draft-07) and idempotent (drift = 0).

## Deferred
Resend adapter (M2); AutoSend/Unosend adapters + swap demo (M3); examples,
publish dry-run, weighted/round-robin routing (M4); PRD open questions.
