# CareDroid Architect Mode — Unified Proof Pack

**Date:** 2026-07-15  
**Program:** Living clinical system consolidation (discover → baseline → characterize → normalize → consolidate → reconnect → rebuild → test → measure → rescore)  
**Success criterion:** Not cosmetics — **one coherent, observable, secure, evidence-grounded, testable ED OS**

This document is the **index of proof**. Every claim below is backed by source paths and measured gates in this folder.

---

## 1. Executive score (measured)

| Dimension | Score | Evidence |
|-----------|------:|----------|
| Structural coherence (Architect Mode) | **97/100** | This pack + green gates below |
| Prior narrative readiness | ~94/95 | Pre-Architect SCORECARD cycles |
| **Net structural gain** | **+2–3 pts** | Dual counters fixed, AI accountable, RBAC mapped, engines gated, roles characterized |

### Deduction ledger (remaining ~2–3 pts)

| Pts | Gap | Path to close |
|----:|-----|---------------|
| −1 | Dual Nest + Express HTTP still flag-mounted | [express-nest-decommission-plan.md](./express-nest-decommission-plan.md) |
| −1 | Live Postgres multi-tenant HTTP e2e not run here | Docker CI job |
| −0.5 | Full Playwright matrix (a11y/responsive/interaction) not fully re-run | Pre-release; **EMS–Copilot e2e now green 3/3** |

---

## 2. Measured gate results (final consolidation run)

### Architect FE battery

```
npx vitest run [19 architect suites]
→ 100 passed / 0 failed
→ docs/architecture/architect-mode/baseline/vitest-architect-full.json
```

Covers: roles (reception, triage, charge, physician, EMS, ED manager, IT admin, display), Nest map, engines, OCR, AI abstention, accountable AI, Medical Light, shell density, KPI capacity, EMS handoff, API errors.

### Architect BE battery

```
cd backend && npm test -- --testPathPattern="jwt-claims|runtime-auth|retrieval.tenant|tenant-scope|tenant-isolation|synchronize-guard|accountable-recommendation|ocr.service|pgvector.store|ai-gateway.service" --runInBand
→ 12 suites, 51 passed
```

### Platform gates

| Gate | Result |
|------|--------|
| `npm run test:contract-matrix` | **19 passed** |
| `npm run test:cohesion-security` | **30 passed** |
| `npm run test:redirect-parity` | **58 passed** |
| `npm run build` (Vite) | **PASS** |
| `cd backend && npm run build` | **PASS** |
| Playwright EMS–Copilot (Edge) | **3/3 passed** |

**Aggregate measured tests this program (architect + platform gates):**  
100 + 51 + 19 + 30 + 58 ≈ **258** unit/integration + **3 e2e** EMS–Copilot (fixed after offline POST short-circuit).

---

## 3. Organism map (what is real)

| Layer | Canonical | Status |
|-------|-----------|--------|
| FE entry | `src/main.tsx` → `src/app/App.tsx` | VERIFIED ACTIVE |
| Router | `src/app/router.tsx` + `routes.config.ts` | VERIFIED ACTIVE |
| Shell | `src/components/AppShell.tsx` | VERIFIED ACTIVE + Medical Light |
| State | `emergencyStore` + capacity sync | VERIFIED IMPROVED |
| Nest API | `backend/src/modules/**` | VERIFIED ACTIVE |
| Express legacy | `routes-registry` + `runtime-auth` | ACTIVE behind flag; auth hardened |
| RAG | chunk→embed→retrieve→rerank→cite | VERIFIED + tenant post-filter |
| AI | gateway + accountable envelope | VERIFIED foundation |
| Auth | Nest Permission + JWT claims | VERIFIED IMPROVED |
| Design | Medical Light + tokens | VERIFIED CONTRACT |

Full map: [architecture-map.md](./architecture-map.md) · [dependency-graph.md](./dependency-graph.md)

---

## 4. Capability matrix summary

| Class | Meaning | Examples |
|-------|---------|----------|
| VERIFIED ACTIVE | Proven by test/trace | Reception path, JWT claims, accountable AI card, OCR gate, capacity KPI sync |
| APPEARS COMPLETE | Exists; partial proof | Some Nest modules without FE consumer matrix |
| DUPLICATE | Multiple impls | Nest vs Express (justified legacy), vector adapters |
| UNFINISHED | Residual | Live Postgres e2e, Playwright full, Nest-only HTTP |
| UNSAFE residual | Mitigated not eliminated | Express dual mount if Mongoose on |

Detail: [capability-matrix.md](./capability-matrix.md)

---

## 5. Role contracts (Stage I complete for ED core)

| Role | Characterized | Nest map | PHI write | Notes |
|------|:-------------:|:--------:|:---------:|-------|
| registration_clerk | ✓ | nurse container | yes | Golden Reception path |
| triage_nurse | ✓ | nurse | yes | Acuity/vitals/reassess |
| charge_nurse | ✓ | nurse + ops | yes | Flow + EMS handoff |
| physician | ✓ | physician | yes + export | No EMS handoff complete |
| ems_user / dispatcher / coordinator | ✓ | nurse | limited | Dispatcher no handoff complete |
| ed_manager | ✓ | admin | limited | Ops not bedside |
| it_admin | ✓ | admin **no PHI** | **no** | Settings only |
| read_only_viewer | ✓ | student | no | Boards/analytics |
| public_display | ✓ | student empty | no | Waitboard only |

Sources: `role-contracts.md`, `role-extension-progress.md`, characterization test files under `src/config/*Characterization*`.

---

## 6. Permission & AI safety

| Control | Status |
|---------|--------|
| FE emergency → Nest permission map | `emergencyNestPermissionMap.ts` + tests |
| JWT embeds `permissions[]` + `emergencyRole` | `jwt-claims.util.ts` → `generateTokens` |
| runtime-auth uses claim permissions | Express legacy |
| Accountable AI response envelope | FE contract + Nest DTO + gateway compose + Copilot UI |
| AI failure → abstain | `aiFailureAbstention.ts` |
| OCR not authoritative without human review | FE + BE gates |
| Experimental engines OFF in production | `VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES` |
| RAG tenant post-filter defense-in-depth | `applyTenantOrganizationDefenseFilter` |
| TypeORM synchronize false | `synchronize-guard.spec.ts` |
| Dev offline does not swallow POST mutations | `apiClient` GET-only graceful offline |
| Express→Nest inventory contract | `express-nest-parity.spec.ts` + decommission plan |
| Dev offline must not swallow POST mutations | `apiClient` GET-only graceful offline |
| Express→Nest inventory | `express-nest-parity.spec.ts` + decommission plan |

---

## 7. Design system (Medical Light)

- Token contract: `src/styles/medical-light-theme.css` (imported by design-system)
- AI purple labelled (`.cd-ai-badge`)
- Semantic amber/red; clinical blue/teal
- Reception density: less chrome stack on simple-fast
- Ultrawide readable measure
- Capacity route shows `StateSourceNotice` (session-engine honesty)

---

## 8. Repaired execution paths (high signal)

| Defect | Fix |
|--------|-----|
| capacity.score 42 vs capacityMetrics.score 0 | Seed + setCapacity + WS + refreshAllData sync |
| Fake success on missing EMS arrival | `Result` NOT_FOUND |
| AI outage as free-text “ok” | Accountable abstain card |
| OCR apply without validation | Client gate + BE validate |
| it_admin missing from grants | Full map + no PHI |
| Experimental engines always on | Prod OFF default |
| StateSourceNotice orphaned | Wired on Capacity route |
| RAG tenant leak if store mis-filters | Post-filter drops foreign org |
| Governance bare error strings | Structured envelope |

Detail: [repaired-execution-paths.md](./repaired-execution-paths.md)

---

## 9. Catalogues & inventories

| Artifact | Path |
|----------|------|
| Architecture map | [architecture-map.md](./architecture-map.md) |
| Dependency graph | [dependency-graph.md](./dependency-graph.md) |
| Capability matrix | [capability-matrix.md](./capability-matrix.md) |
| API catalogue | [api-catalogue.md](./api-catalogue.md) |
| Event catalogue | [event-catalogue.md](./event-catalogue.md) |
| Permission matrix | [permission-matrix.md](./permission-matrix.md) |
| Role contracts | [role-contracts.md](./role-contracts.md) |
| Type inventory | [canonical-type-inventory.md](./canonical-type-inventory.md) |
| Config ADRs | [configuration-decisions.md](./configuration-decisions.md) |
| Rollback | [rollback-instructions.md](./rollback-instructions.md) |
| Unresolved risks | [unresolved-risks.md](./unresolved-risks.md) |
| TODO register | [TODO-REGISTER.md](./TODO-REGISTER.md) |
| Command log | [validation-command-log.md](./validation-command-log.md) |
| Stage J detail | [STAGE-J-RESCORE.md](./STAGE-J-RESCORE.md) |

---

## 10. Fail conditions (program rules) — status

| Fail condition | Status |
|----------------|--------|
| Visible action with no result | Monitored; characterization covers key Reception/EMS paths |
| Swallowed errors | Hardened on critical paths (governance, convert, OCR, AI) |
| Contradictory counters | Capacity dual-counter **fixed** |
| Stale as live | SESSION_ENGINE + StateSourceNotice |
| Inaccessible controls | Shell density; residual a11y via prior axe work |
| Duplicate architecture unjustified | Documented dual HTTP; shell re-exports only |
| Critical path requires unavailable AI | Abstain + offline paths |
| Cross-tenant data | Unit + defense filter; live Postgres e2e residual |
| Production synchronize | Guard tested false |
| Hide defects via any/ts-ignore/disabled tests | Not used in Architect work |

---

## 11. Rollback

See [rollback-instructions.md](./rollback-instructions.md).  
Working tree includes Cycles 63–68 + Architect Mode — **commit is user-controlled**.

---

## 12. What must happen next

1. **Commit** feature branch: Cycles 63–68 + Architect Mode  
2. Docker Postgres tenant isolation CI  
3. Full Playwright (interaction, a11y, ems-copilot, responsive)  
4. Nest-primary Express decommission plan  
5. Optional: rescore root `SCORECARD.md` from this pack only after commit  

---

## 13. One-command re-verification

```bash
# Architect FE
npx vitest run src/config/shellEngineCatalog.test.ts src/config/clinicalRolesCharacterization.test.ts src/config/displayRolesCharacterization.test.ts src/config/triageRoleCharacterization.test.ts src/config/itAdminPermission.contract.test.ts src/config/emergencyNestPermissionMap.test.ts src/services/receptionCharacterization.test.ts src/services/ocrFieldValidation.test.ts src/contracts/accountableAi.test.ts src/store/emergencyStore.kpiConsistency.characterization.test.ts src/styles/medicalLightTheme.test.ts

# Architect BE
cd backend && npm test -- --testPathPattern="jwt-claims|runtime-auth|retrieval.tenant|tenant-scope|tenant-isolation|synchronize-guard|accountable-recommendation|ocr.service|pgvector.store|ai-gateway" --runInBand

# Platform
npm run test:contract-matrix
npm run test:cohesion-security
npm run test:redirect-parity
npm run build
cd backend && npm run build
```

---

**Bottom line:** CareDroid is not “prettier only.” Frontend, backend auth, RAG tenant safety, capacity state, accountable AI, OCR, role contracts, Medical Light, and measurement gates **move together as one engineered program**, with residual risk explicitly scored and owned.
