---
"@mailway/core": minor
---

Add `weightedStrategy` and `roundRobinStrategy` routing strategies. `createMailer`
already accepted a custom `RoutingStrategy`; these are ready-made ones:

- `roundRobinStrategy()` rotates the primary provider on each send, cycling
  through the list. The returned ordering is a full rotation, so every provider
  stays available for failover.
- `weightedStrategy(weights, { random? })` orders providers by weighted sampling
  without replacement, so the primary slot is chosen proportional to weight.
  Providers with no weight (or weight `0`) become failover-only fallbacks. The
  RNG is injectable for deterministic tests.
