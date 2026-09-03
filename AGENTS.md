# Agent instructions

**The rules live in [`.github/copilot-instructions.md`](.github/copilot-instructions.md). Read it before changing anything.**

This file is a pointer, not a second copy. Three files stating the same rules
drift, and a drifted rule is worse than a missing one — so everything is
maintained there and only the few things you need in the first minute are
repeated here.

## Orientation

| Question | Answer |
|---|---|
| Where does the frontend live? | `src/` (React 18 + TypeScript + Vite) |
| Where does the backend live? | `backend/` (NestJS + TypeORM) — a **separate** package tree, not a workspace |
| How do they talk? | HTTP only. `src/` must never import `backend/src/`; `architecture:check` enforces it |
| Where are routes declared? | `src/config/routes.config.ts` — `CANONICAL_ROUTE_MAP` is the registry driving navigation and authorization |
| Who decides access? | `src/lib/users/canonicalAccess.ts`. Do not add a second role system |
| Where do I find a page? | `npm start`, then `/navigator` — it answers "where do I manage X?" from the canonical route catalog and cannot invent a route |

## Before you start

```bash
npm install && npm --prefix backend install
npm run doctor      # diagnoses the environment; changes nothing
npm start           # frontend :3000, backend :8000, /api proxied
```

## Before you say it's done

```bash
npm run verify      # typecheck BOTH sides + lint + docs + deps + architecture
```

`npm run verify:full` adds the whole test suite; `npm run production:check` adds
both builds. Run the whole frontend suite with `npm run test:run:parallel` —
plain `vitest run` is serial. `npm run validate:ci` is a **subset**, so a green
CI is a weaker claim than a green `verify:full`. Never edit source while a full
suite run is in flight.

## Adding a page file? Update the inventory pins

Every `.tsx`/`.css` you add under `src/pages/` is counted by
`src/data/pageDispositionFixture.ts`, which pins the totals so new pages get
noticed rather than accumulating silently. Adding a page without bumping
`PAGE_INVENTORY_EXPECTED_TOTAL` / `PAGE_SOURCE_EXPECTED_TOTAL` /
`PAGE_STYLE_EXPECTED_TOTAL` fails `pageDispositionFixture.test.ts`.

It is easy to miss because targeted test runs selected by keyword usually do
not match that file — it surfaces only in the full suite, as one failure among
thousands. If you added a page, run:

```bash
npx vitest run src/data/pageDispositionFixture.test.ts
```

## Two traps that have each cost real time

- **A route redirects and neither access-denied panel renders.** Check
  `ED_EXTENSION_ROUTE_REDIRECTS` in `src/config/edApplication.config.ts` first.
  It matches by *prefix*, above the route tree, so grepping the redirect tables
  for your path finds nothing. It has silently swallowed a real route three times.
- **Unwired is not dead.** A module with no importers is usually a function not
  linked yet. Read what it does, then wire it or label it. Delete only what
  actively contradicts the live implementation — and grep tests twice first, once
  for imports and once for files that read it from disk (`readFileSync`), because
  contract tests do the latter.

## Non-negotiables

Never disable backend authorization, compile production bypass credentials, or
allow query-string activation of privileged modes in production. Never log or
display protected health information — log operational metadata only. Never
commit secrets; `.env.example` carries names and documentation, never values.
All test and demo data is synthetic.
