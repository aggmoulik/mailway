# mailway

A maintained, framework-agnostic TypeScript library that puts multiple email
providers behind one interface and owns the hard cross-provider parts — webhook
normalization and failover.

This is a pnpm monorepo. Switching providers or adding failover is a one-line
config change; the app code and the `NormalizedMessage` never change.

## Packages

| Package                                  | Description                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@mailway/core`](packages/core)         | Stable contract: `EmailProvider`, normalized message + webhook schemas, error taxonomy, retry, failover. Zero runtime deps beyond TypeBox. |
| [`@mailway/resend`](packages/resend)     | Resend adapter (official `resend` SDK). Svix webhooks.                                                                                     |
| [`@mailway/autosend`](packages/autosend) | AutoSend adapter (`autosendjs`). Raw-body hex HMAC webhooks.                                                                               |
| [`@mailway/usesend`](packages/usesend)   | useSend adapter (`usesend-js`, self-hostable). Hex HMAC webhooks with millisecond timestamps.                                              |

## Examples

- [`examples/provider-swap`](examples/provider-swap) — swap providers / add failover as a one-line config change.
- [`examples/webhook-receiver`](examples/webhook-receiver) — verify, normalize, and dispatch signed webhooks from each provider.

Both run with no network and no API keys.

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the local workflow, the full
validation gate, and how to add a provider adapter.
