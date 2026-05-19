# QA checklist — production readiness

**Build under test:** __________ · **Environment:** staging / local · **Tester:** __________

## Prerequisites

- [ ] `npm run start:all` (Vite `:8000` + Nest `:3000`) or staging equivalent
- [ ] Root `.env` from `.env.example` (`VITE_API_URL` empty for proxy mode)
- [ ] `backend/.env` from `backend/.env.example` (`FRONTEND_URL=http://localhost:8000`)
- [ ] Logged-in user with clinical tools permission

## Automated gates (run before manual QA)

```bash
npm run lint && npm run test:run && npm run build
npm run test:contract-matrix && npm run test:executor-mapping && npm run test:tool-render-smoke
npm run test:e2e-matrix
cd backend && npm run build
```

- [ ] All frontend commands above pass

## Catalog & launch (35 registry tools — sample)

Use [tool-render-execute-manual-qa.md](../tool-render-execute-manual-qa.md) for full list. Minimum sample:

| Tool | Tier | Deep link | Launch | Result / chat |
|------|------|-----------|--------|----------------|
| qSOFA | A | `/tools/calculators/qsofa` | Catalog search “qsofa” | Calculate → result visible |
| PHQ-9 | A | `/tools/calculators/phq9` | | |
| Wells PE | B | `/tools/calculators` + chat | Catalog “pe-score” | Chat opens on dashboard |
| Drug checker | C | `/tools/drug-checker` | | 2 meds → check → result or **error banner** (stop backend to test) |
| Lab interpreter | C | `/tools/lab-interpreter` | | |
| SOFA | C | `/tools/calculator/sofa` | | |
| Protocols | page | `/tools/protocols` | | Search / chip → content or **error banner** |
| Fleet command | fleet | `/fleet/command` | | Page loads, no horizontal scroll @ 390px |
| Dispatch AI | fleet-B | Catalog | | Hub/chat launch |

- [ ] No **blank white** tool pages
- [ ] Unknown catalog search → empty state + **Clear search** works
- [ ] Unknown URL `/tools/not-real-slug` → not found / fallback (not dashboard loop)

## API / degraded config

- [ ] With backend **stopped**: app shows config degraded banner or clear API error (not infinite spinner)
- [ ] With backend **running**: dashboard loads, tools catalog loads

## Executor negative tests

- [ ] Drug checker with backend down → user-visible error, no `alert()` for validation
- [ ] No browser console errors for `POST` to non-existent executor ids from calculator pages

## Responsive (viewport spot check)

| Viewport | Pages to check |
|----------|----------------|
| 390×844 | Catalog, Calculators hub, Drug checker, Fleet command |
| 768×1024 | Sidebar drawer, Tools overview |
| 1280×720 | Full shell, no horizontal page scroll |

- [ ] Sidebar opens/closes on mobile; focus trap acceptable
- [ ] Primary actions reachable without horizontal scroll

## Accessibility (quick)

- [ ] Catalog search has accessible name
- [ ] Error banners use `role="alert"`
- [ ] Calculator hub chat-assisted cards keyboard-focusable

## Regression

- [ ] Login / logout still works
- [ ] Dashboard chat send still works
- [ ] Deep link refresh on calculator route preserves calculator (e.g. `/tools/calculators/meld`)

## Sign-off

| Result | Notes |
|--------|-------|
| Pass / Fail | |

**Playwright (optional):** `npm run qa:responsive:chromium` — known timeout flakes on CKD/BMI; 0 overflow failures expected.
