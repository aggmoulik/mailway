# Contributing to mailway

Thanks for helping! mailway is a pnpm monorepo of small, framework-agnostic
packages. This guide covers the local workflow, the validation gate every change
must pass, and how to add a new provider adapter.

## Prerequisites

- **Node.js** — the packages target `>=18.18` (see the root `engines`). Running
  the examples directly (`node index.ts`) additionally needs Node ≥ 22.6 for
  native TypeScript stripping; CI runs Node 24.
- **pnpm** — pinned via `packageManager` in the root `package.json`; run
  `corepack enable` to pick up the right version automatically.

```sh
pnpm install
```

## Layout

- `packages/core` — `@mailway/core`, the stable contract (`EmailProvider`,
  normalized message + webhook schemas, error taxonomy, `withRetry`,
  `createMailer` + routing strategies, the webhook framework). Zero runtime deps
  beyond TypeBox.
- `packages/{resend,autosend,usesend}` — provider adapters. Each peer-depends on
  `@mailway/core` plus that provider's SDK.
- `examples/*` — runnable, network-free demos.

## Development workflow

We practice **TDD**: write a failing test, watch it fail, then write the minimal
code to pass. New behavior needs a test; bug fixes start with a test that
reproduces the bug.

```sh
pnpm -r build      # tsup: dual ESM+CJS + .d.ts, in topological order
pnpm lint          # oxlint
pnpm typecheck     # tsc --noEmit (strict)
pnpm test          # vitest
pnpm attw          # are-the-types-wrong, per package
pnpm schema:check  # re-emit core JSON Schema and assert no drift
```

> **Build first.** `pnpm -r build` MUST run before `typecheck`/`test`: the
> adapters resolve `@mailway/core` through its built `dist`, not its source. If
> typecheck or tests fail with unresolved `@mailway/core` types, you skipped the
> build.

Strict TypeScript is non-negotiable — `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, and `verbatimModuleSyntax` are all on. Formatting is
Prettier (`pnpm format` to write, `pnpm format:check` to verify).

### The full validation gate

Run this before opening a PR; it mirrors CI:

```sh
pnpm -r build && pnpm lint && pnpm typecheck && pnpm test && pnpm attw && pnpm schema:check
```

## Changesets

Any change that affects a published package needs a changeset:

```sh
pnpm changeset
```

Pick the bump (`patch`/`minor`/`major`) per semver and write a user-facing
summary. Additive API is `minor`; contract-breaking changes to `@mailway/core`
are `major`. Docs/tests/examples-only changes don't need one.

## Adding a provider adapter

Mirror an existing adapter (e.g. `packages/resend`). An adapter is four small
modules over `@mailway/core`:

- `provider.ts` — `create<Name>Provider(config)` returning an `EmailProvider`.
  Accept either `{ apiKey }` (real) or `{ client }` (an injected SDK client, so
  tests stay hermetic).
- `message.ts` — map a `NormalizedMessage` to the provider's send payload.
- `errors.ts` — map provider/HTTP errors onto the `@mailway/core` error taxonomy.
- `webhook.ts` — export a `WebhookScheme` describing how the provider signs
  webhooks, plus a `map<Name>Event` that normalizes a raw body to a
  `NormalizedWebhookEvent`. Core's `verifyWebhook` handles the crypto — you only
  describe the scheme (headers, algorithm, encoding, signed content, tolerance).

Tests inject a fake client (no network). Add the adapter to the root `attw`
script and the README table, and wire it into the examples if relevant.

## Commit conventions

- Conventional-commit subjects: `feat(core): …`, `fix(resend): …`, `docs: …`,
  `chore: …`.
- End every commit body with the standard trailers:

  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: <session url>
  ```

Keep commits focused — one logical change each, green at every step.
