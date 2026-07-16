# Validation Command Log — Architect Mode

## 2026-07-15 Stage 0

| Command | Result |
|---------|--------|
| `npx vitest run src/contracts/results.test.ts src/store/emergency-store.test.ts src/config/emsHandoffPermission.contract.test.ts src/components/dashboard/dashboardBundleContract.test.ts` | **99 passed** |
| `npx vitest run src/store/emergencyStore.workflowActions.test.ts src/pages/tools/lazySpecialtyCalculators.test.ts lib/ai/providers/transportSafety.test.ts lib/ai/providers/groqAdapter.test.ts` | **26 passed** |
| `cd backend && npm test -- --testPathPattern="runtime-auth\|retrieval.tenant\|pgvector.store"` | **13 passed** (3 suites) |
| `cd backend && npx vitest run …` | FAIL setup (not project runner) |

Artifacts: `baseline/vitest-stage0.json`, `vitest-stage0b.json`

## 2026-07-15 Stage B + D (early)

| Command | Result |
|---------|--------|
| `npx vitest run src/services/receptionCharacterization.test.ts src/config/emergencyNestRbacGap.characterization.test.ts src/config/emergencyNestPermissionMap.test.ts` | **25 passed** |

## 2026-07-15 Stage H (early) synchronize guard

| Command | Result |
|---------|--------|
| `cd backend && npm test -- --testPathPattern="synchronize-guard"` | **3 passed** |

## 2026-07-15 continued session (D/C/E/F/G/H)

### Frontend

```
npx vitest run src/services/receptionCharacterization.test.ts \
  src/contracts/accountableAi.test.ts \
  src/styles/medicalLightTheme.test.ts \
  src/store/emergencyStore.kpiConsistency.characterization.test.ts \
  src/config/emergencyNestPermissionMap.test.ts \
  src/services/ocrFieldValidation.test.ts \
  src/services/apiErrorHandling.test.ts \
  src/services/aiFailureAbstention.test.ts
```

**Result: 46 passed**

### Backend

```
cd backend && npm test -- --testPathPattern="jwt-claims|runtime-auth|ocr.service|accountable-recommendation|synchronize-guard|tenant-scope"
```

**Final Architect suite:** FE **54 passed** | BE **27 passed** (jwt-claims, runtime-auth, ocr, accountable, synchronize, tenant-scope, ai-gateway)

### Production builds

| Command | Result |
|---------|--------|
| `npm run build` (Vite FE) | **PASS** (~23s) |
| `cd backend && npm run build` (Nest) | **PASS** |

## 2026-07-15 continued wave 2

| Command | Result |
|---------|--------|
| Accountable card + gateway util + shell density + KPI store tests | **35 passed** |
| BE tenant-isolation.http + tenant-scope + ai-gateway | **16 passed** |
| AppShell.r12 | **1 passed** |
| `npm run test:contract-matrix` | **19 passed** |
| `npm run test:cohesion-security` | **30 passed** |

## 2026-07-15 wave 3 (Stage J)

| Command | Result |
|---------|--------|
| `npm run test:redirect-parity` | **58 passed** |
| `npm run test:cohesion-full` | **PASS** (cohesion-security 30 + deep-link 25) |
| it_admin + shellEngineCatalog + nest map | **19 passed** |
| BE jwt-claims | **7 passed** |

## 2026-07-15 wave 4 (Stage I expand + engine gate)

| Command | Result |
|---------|--------|
| clinicalRoles + edManager + triage + it_admin + shellEngine + reception + density | **49 passed** |
| Experimental engines prod default OFF | covered in shellEngineCatalog tests |
| AppShell uses `shouldStartShellEngine` | source + catalog |

## 2026-07-15 wave 6 (keep fixing)

| Command | Result |
|---------|--------|
| KPI + emergency-store | **13 passed** |
| retrieval.tenant-adversarial + rag.service | **15 passed** (incl. leak post-filter) |
| tenant-scope + isolation.http family | **16 passed** earlier |

## 2026-07-15 FINAL CONSOLIDATION MEASUREMENT

| Battery | Result |
|---------|--------|
| Architect FE 19 suites | **100 passed** → `baseline/vitest-architect-full.json` |
| Architect BE 12 suites | **51 passed** |
| `test:contract-matrix` | **19 passed** |
| `test:cohesion-security` | **30 passed** |
| `test:redirect-parity` | **58 passed** |
| `npm run build` | **PASS** (~37s) |
| `backend npm run build` | **PASS** |
| `test:cohesion-full` | **PASS** (security 30 + deep-link 25) |

**Composite structural readiness: 97/100** — see [PROOF-PACK.md](./PROOF-PACK.md)

## 2026-07-16 wave 7 (e2e + Express plan)

| Command | Result |
|---------|--------|
| Playwright EMS–Copilot (Edge) | **3 passed** (was 2 fail / 1 pass) |
| Fix: `apiClient` offline short-circuit only for GET/HEAD/OPTIONS | unit 23 pass |
| `express-nest-parity` + tenant-isolation.guard | **11 passed** |

## Optional remaining

```
# Docker Postgres multi-tenant e2e when available
# Full Playwright interaction + a11y + ems-copilot before release
# npm run test:cohesion-full (includes deep-link)
```
