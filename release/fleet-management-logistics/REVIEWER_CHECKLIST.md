# Reviewer checklist — Fleet Management + Logistics AI Foundation

Use this checklist during PR review. Check items as verified; leave notes on any failure.

**PR title:** Add Fleet Management + Logistics AI Foundation  
**Test command:** `npm run test:pr6-fleet`

---

## Scope & diff hygiene

- [ ] Diff is limited to fleet foundation (no unrelated clinical calculator refactors)
- [ ] No secrets, `.env`, or credentials in the diff
- [ ] Naming uses `PR_FLEET_*` / `pr6Fleet*` for fleet (not confused with clinical `PR6` / COPD GOLD)
- [ ] No snapshot test files added

---

## 1. Fleet dashboard (`fleet-command`)

- [ ] `/fleet/command` loads without console errors (authenticated)
- [ ] Loading → ready transition shows summary, maintenance section, vehicle list
- [ ] Empty and error states render with retry/refresh actions
- [ ] Operational alert appears when maintenance/low-energy counts > 0
- [ ] Safety banner and “human dispatchers must approve” footer visible
- [ ] Skip link focuses main content
- [ ] Refresh disables button while in-flight (`aria-busy`)

---

## 2. Predictive maintenance (`predictive-maintenance`)

- [ ] `/fleet/predictive-maintenance` form submits with minimal input (age or mileage)
- [ ] Validation error shows for empty substantive submit
- [ ] Critical/high input produces risk card + ops warning with bullet reasons
- [ ] Reset clears form and results
- [ ] Footer states no automatic work orders

---

## 3. Route optimization (`route-optimizer`)

- [ ] `/fleet/route-optimizer` requires at least one labeled stop
- [ ] Optimize produces ordered sequence and savings cards
- [ ] Late window scenario shows ops alert (tight window + long leg)
- [ ] Add/remove stop controls work; remove disabled for last stop
- [ ] Footer states no live navigation/telematics updates

---

## 4. Dispatch intelligence (`dispatch-ai`)

- [ ] Tool appears under **Fleet dispatch intelligence** on `/tools/calculators`
- [ ] Safety pill: “Human approval required — no auto-assign”
- [ ] Launch opens dashboard chat (not a dedicated fleet page)
- [ ] `aria-label` on launch button mentions no auto-assign
- [ ] Chat seed (if testing chat) states dispatcher authority limits in STEP 0

---

## 5. Registry & catalog

- [ ] Four tools in sidebar with Fleet category
- [ ] `toolRegistry` paths match `PR_FLEET_TOOL_SPECS` in `prFleetTestConstants.js`
- [ ] Each tool has exactly one medical catalog row (`category: fleet`)
- [ ] Catalog search finds each tool (fleet command, predictive maintenance, route optimization, dispatch intelligence)
- [ ] `dispatch-ai`: `panelTool: calculators`, `backendExecutable: true` in catalog
- [ ] `dispatch-ai`: **no** `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` entry

---

## 6. Discovery & NLU

- [ ] Aliases resolve: `fleet dashboard` → `fleet-command`, `dispatch` → `dispatch-ai`
- [ ] `tool.patterns.ts` contains all four `toolId`s with `category: 'fleet'`
- [ ] Backend tests (if run): `dispatch-ai` classified as unsupported for POST execute

---

## 7. Routing

- [ ] Tier A tools **not** in `Calculators.jsx` switch/cases
- [ ] `dispatch-ai` **not** registered as `/fleet/dispatch-ai` in `App.jsx`
- [ ] Unknown `/fleet/unknown` hits `ToolsAreaFallback`

---

## 8. Safety & accessibility (spot check)

- [ ] No UI control implies one-click dispatch or auto-assignment
- [ ] Keyboard can reach back button, primary actions, and skip link
- [ ] Focus ring visible on buttons/inputs (`focus-visible`)
- [ ] Alerts use `role="alert"` where appropriate

---

## 9. Tests (CI)

- [ ] `npm run test:pr6-fleet` passes locally or in CI
- [ ] No new flaky tests (re-run comprehensive suite once if needed)
- [ ] `pr6FleetComprehensive.test.jsx` covers all 8 sections (dashboard, scoring, routing, dispatch, registry, catalog, discovery, routes)

---

## 10. Documentation

- [ ] `release/fleet-management-logistics/PR.md` read for rollout/rollback alignment
- [ ] Changelog entries match actual behavior (mock telemetry called out)

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Code reviewer | | | ☐ |
| QA (optional smoke) | | | ☐ |
| Product / ops (safety copy) | | | ☐ |

**Review notes:**

```
(leave comments here)
```
