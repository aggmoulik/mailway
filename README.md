# mailway

A maintained, framework-agnostic TypeScript library that puts multiple email
providers behind one interface and owns the hard cross-provider parts — webhook
normalization and failover.

This is a pnpm monorepo. **Milestone 1** ships [`@mailway/core`](packages/core) —
the stable public contract, error taxonomy, retry, failover routing, and webhook
framework — with **no provider adapters yet**, so the contract can be signed off
in isolation.

## Development

```sh
pnpm install
pnpm lint          # oxlint
pnpm typecheck     # tsc --noEmit (strict)
pnpm test          # vitest
pnpm -r build      # tsup: dual ESM+CJS + .d.ts
pnpm schema:check  # re-emit JSON Schema and assert no drift
```

## Packages

| Package | Description |
| --- | --- |
| [`@mailway/core`](packages/core) | Stable contract: `EmailProvider`, normalized message + webhook schemas, error taxonomy, retry, failover. Zero runtime deps beyond TypeBox. |

The `@mailway` scope lives as a single exported `SCOPE` constant so the project
can be renamed with one edit plus a find/replace.
