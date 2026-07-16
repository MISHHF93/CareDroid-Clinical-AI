# Architect Mode — Proof Pack Hub

**Status:** Program measured and consolidated (2026-07-15)  
**Start here:** **[PROOF-PACK.md](./PROOF-PACK.md)** — unified score, gates, organism map, roles, risks, next steps

## Structural readiness: **97/100** (measured)

Prior narrative ~94/95. Gain from dual-counter fix, RBAC/JWT, accountable AI, OCR gate, engine prod defaults, multi-role characterization, RAG tenant defense-in-depth.

## Final measurement snapshot

| Battery | Result |
|---------|--------|
| Architect FE (19 suites) | **100 passed** (`baseline/vitest-architect-full.json`) |
| Architect BE (12 suites) | **51 passed** |
| contract-matrix | **19 passed** |
| cohesion-security | **30 passed** |
| redirect-parity | **58 passed** |
| FE + BE production build | **PASS** |
| Playwright EMS–Copilot | **3/3 PASS** |

## Document index

| Doc | Purpose |
|-----|---------|
| [PROOF-PACK.md](./PROOF-PACK.md) | **Master deliverable** |
| [STAGE-J-RESCORE.md](./STAGE-J-RESCORE.md) | Dimension scores + deductions |
| [architecture-map.md](./architecture-map.md) | Implemented organism map |
| [dependency-graph.md](./dependency-graph.md) | Module edges |
| [capability-matrix.md](./capability-matrix.md) | VERIFIED / DUPLICATE / … |
| [api-catalogue.md](./api-catalogue.md) | Nest + Express |
| [event-catalogue.md](./event-catalogue.md) | Events + durability |
| [permission-matrix.md](./permission-matrix.md) | Actions × Nest |
| [role-contracts.md](./role-contracts.md) | FE × Nest roles |
| [role-extension-progress.md](./role-extension-progress.md) | Stage I progress |
| [canonical-type-inventory.md](./canonical-type-inventory.md) | Shared types |
| [configuration-decisions.md](./configuration-decisions.md) | ADRs |
| [repaired-execution-paths.md](./repaired-execution-paths.md) | Before/after fixes |
| [unresolved-risks.md](./unresolved-risks.md) | Ranked residual |
| [rollback-instructions.md](./rollback-instructions.md) | Reversibility |
| [TODO-REGISTER.md](./TODO-REGISTER.md) | Living backlog |
| [validation-command-log.md](./validation-command-log.md) | Exact commands |
| [baseline/](./baseline/) | Stage 0 + full FE JSON |

## Code touchpoints (high signal)

| Area | Path |
|------|------|
| JWT claims | `backend/src/modules/auth/config/jwt-claims.util.ts` |
| Nest permission map | `src/config/emergencyNestPermissionMap.ts` |
| Engine prod gate | `src/config/shellEngineCatalog.ts` |
| Accountable AI | `src/contracts/accountableAi.ts`, gateway composer, Copilot |
| OCR gate | `src/services/ocrFieldValidation.ts` |
| Capacity sync | `src/store/emergencyStore.ts` (`applyCapacityPatch`) |
| RAG tenant | `backend/src/modules/rag/utils/tenant-scope.ts`, retrieval post-filter |
| Medical Light | `src/styles/medical-light-theme.css` |

## Do not trust as runtime truth alone

- Planning `docs/architecture/architecture-map.md` (2026-06-26) — use **this** folder’s map  
- Stale header inventories that predate shell re-exports  

## Next

1. Commit Cycles 63–68 + Architect Mode on a feature branch  
2. Docker Postgres tenant e2e CI  
3. Full Playwright before release  
4. Express → Nest decommission  
