# mailway

A maintained, framework-agnostic TypeScript library that puts multiple email
providers behind one interface and owns the hard cross-provider parts — webhook
normalization and failover.

This is a pnpm monorepo.

## Packages

| Package | Description |
| --- | --- |
| [`@mailway/core`](packages/core) | Stable contract: `EmailProvider`, normalized message + webhook schemas, error taxonomy, retry, failover. Zero runtime deps beyond TypeBox. |
| [`@mailway/resend`](packages/resend) | Resend adapter — implements `EmailProvider` on the official `resend` SDK, with error mapping and Svix webhook support. |

## Development

```sh
pnpm install
pnpm -r build      # tsup: dual ESM+CJS + .d.ts (topological order)
pnpm lint          # oxlint
pnpm typecheck     # tsc --noEmit (strict)
pnpm test          # vitest
pnpm schema:check  # re-emit core JSON Schema and assert no drift
```

The `@mailway` scope lives as a single exported `SCOPE` constant so the project
can be renamed with one edit plus a find/replace.
