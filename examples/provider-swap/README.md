# Example: provider swap + failover

Demonstrates that switching providers or adding failover is a one-line config
change — the app code and the `NormalizedMessage` never change.

```sh
pnpm --filter @mailway/example-provider-swap start
```

It runs with no network and no API keys by injecting fake SDK clients. For real
use, construct providers with `{ apiKey }` instead of `{ client }` and pass them
to `createMailer({ providers: [...] })`. `createMailer` tries providers in order
and fails over on error; reorder the array to swap the primary.
