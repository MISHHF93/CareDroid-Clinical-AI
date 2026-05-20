# Responsive regression test coverage

Automated guards complement the Playwright responsive QA matrix (`npm run qa:responsive`).  
Vitest tests focus on **semantic render smoke**, **route non-emptiness**, and **CSS/layout contracts** — not pixel snapshots.

## Automated (Vitest)

| Suite | Command path | What it protects |
| --- | --- | --- |
| Route page smoke | `src/test/routePagesSmoke.test.jsx` | Dashboard, catalog, calculators hub, fleet pages render headings and non-empty DOM |
| Catalog launches | `src/pages/tools/ClinicalToolCatalog.launchButtons.test.jsx` | Search, filters, Launch/Open/Start guided chat buttons |
| Calculator forms | `src/pages/tools/Calculators.formSmoke.test.jsx` | Tier-A interfaces, inputs, calculate actions; hub chat cards |
| Sidebar mobile | `src/components/Sidebar.mobileRender.test.jsx` | Compact drawer `aria-hidden`, open dialog, close control |
| Sidebar contracts | `src/components/Sidebar.responsive.test.js` | Drawer CSS, focus trap wiring, label wrap |
| Catalog layout | `src/pages/tools/ClinicalToolCatalog.responsive.test.js` | Stacked tables, chips, touch targets |
| Calculator layout | `src/pages/tools/Calculators.responsive.test.js` | Responsive grids, disclaimers, touch targets |
| Fleet layout | `src/pages/fleet/fleet.responsive.test.js` | Grids, table scroll hosts |
| Global UX tokens | `src/styles/responsiveUx.test.js` | Typography, touch targets, callout compaction |
| App shell | `src/layout/AppShell.layout.test.js` | Page body scroll, compact chrome offset |
| Coverage inventory | `src/test/responsiveRegression.coverage.test.js` | QA matrix ↔ smoke route alignment |
| Backend exposure scan | `src/data/backendFrontendExposure.test.js` | Frontend API ↔ Nest routes, executor parity, Vite proxy |

**Run:**

```bash
npm run test:responsive-regression
```

## Automated (Playwright)

| Asset | Purpose |
| --- | --- |
| `src/data/responsiveQaMatrix.js` | 32+ pages × 11 viewports (9 Android widths incl. 412px Pixel) × 4 browsers |
| `e2e/responsive-qa.spec.mjs` | Fails on document-level horizontal overflow |
| `qa/RESPONSIVE_QA_MATRIX.md` | Human-readable matrix |
| `qa/RESPONSIVE_QA_REPORT.md` | Last run summary |

**Run:**

```bash
npm run qa:responsive
npm run qa:responsive:retry   # re-run failed cells only
```

## Manual visual checks (not automated)

Perform on **320**, **412** (Pixel 7 / 7 Pro CSS width), **430**, and **768×1024** after UI changes:

1. **Sidebar** — Open/close drawer; backdrop dismiss; focus returns to menu button; tool names wrap; no horizontal page scroll.
2. **Dashboard chat** — Composer visible; message list scrolls; keyboard does not cover send on mobile.
3. **Clinical catalog** — Stacked table cards; launch buttons tappable; filter chips wrap; stat row readable.
4. **Calculators** — Two-column form/results at desktop; single column ≤1024px; disclaimers visible but not oversized on 320px.
5. **Fleet dashboards** — Metric cards wrap; route stop list readable; maintenance telemetry grid stacks.
6. **Long clinical strings** — Tool names and disclaimer paragraphs wrap (no clipped text).
7. **Data tables only** — Catalog medical table (desktop), audit logs, fleet tables scroll horizontally inside their wrappers, not the page.
8. **Dispatch assistant** — Chat-assisted card on calculators hub; fleet group lead readable.
9. **Theme / contrast** — Light and dark mode legibility for warning callouts and badges.
10. **Real devices** — Spot-check Safari iOS and Chrome Android for `100dvh` / safe-area padding.

Record outcomes in `qa/RESPONSIVE_QA_REPORT.md` when running the full Playwright matrix.

## Intentionally not automated

- Pixel-perfect visual regression (brittle snapshots).
- Gesture swipe-to-close drawer (use manual + Playwright tap).
- Backend API latency under load (Playwright uses stubs).
- Print/PDF layouts.
