# Releasing

How mailway packages get published, plus the state of the packaging open
questions (closed in Milestone 4).

## Packages & versioning

Published packages, versioned and released together via [Changesets]:

- `@mailway/core`
- `@mailway/resend`
- `@mailway/autosend`
- `@mailway/usesend`

(`examples/*` are `private: true` and never publish.) Every package currently
sits at the placeholder `0.0.0` and is unpublished; the first release cuts real
versions from the accumulated changesets.

## Release flow

1. Land changes, each with a changeset (`pnpm changeset`) when they touch a
   published package.
2. `pnpm changeset version` — applies the bumps, rewrites `workspace:^` ranges to
   concrete `^x.y.z`, and updates changelogs. Pending as of M4: two `@mailway/core`
   changesets (`timestampUnit`, routing strategies) → a `0.1.0` minor.
3. Run the full validation gate (see [CONTRIBUTING.md](CONTRIBUTING.md)).
4. `pnpm -r build`, then `pnpm changeset publish` (publishes with the configured
   `access: public`). Requires an npm account authenticated (`npm login`) with
   publish rights to the `@mailway` scope.

## Publish-readiness (verified in M4)

- **Tarball contents** (`npm pack --dry-run`): each package ships `dist/` +
  `README.md` + `package.json`; core additionally ships `schemas/*.json`. No
  `src/`, tests, or tsconfig leak into the tarball. Verified for all four packages.
- **Types resolution** (`pnpm attw`): all green across node10, node16 (CJS + ESM),
  and bundler resolution, for every package.
- **Workspace ranges**: adapters peer-depend on `@mailway/core` as `workspace:^`,
  which `changeset version` / `pnpm publish` rewrite to a concrete caret range
  (`^0.0.0` today, `^0.1.0` after the first bump). Confirmed by inspecting the
  packed manifest.
- Note (non-blocking): published tarballs include `.map` source maps that
  reference `../src` (not shipped). Harmless; set tsup `sourcemap: false` if a
  clean map story is wanted later.

## Open questions — closed

- **npm scope / name.** The `@mailway/*` package paths are unclaimed on the public
  registry (`@mailway/core`, `/resend`, `/autosend`, `/usesend` all resolve to
  404), and the unscoped `mailway` name is free too; only the unrelated `mailx`
  name is taken (and we don't use it). The scope is centralized in one place — the
  exported `SCOPE` constant in `@mailway/core` — so if `@mailway` turns out to be
  unavailable at claim time, renaming is one constant edit plus a find/replace.
  **Maintainer action (needs npm credentials, not scriptable here):** create the
  `@mailway` organization on npmjs.com and `npm login`, then publish.
- **Cross-registry name.** Packages publish under the `@mailway` scope on
  npmjs.org; no conflicting owner was found. Keep the scope identical if you also
  mirror to GitHub Packages.
- **Second adapter.** Resolved — the project ships `resend`, `autosend`, and
  `usesend` adapters.

[Changesets]: https://github.com/changesets/changesets
