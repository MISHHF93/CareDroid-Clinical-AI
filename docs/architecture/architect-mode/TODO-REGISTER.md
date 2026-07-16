# Living TODO Register — Architect Mode

**Updated:** 2026-07-15 final consolidation  
**Master:** [PROOF-PACK.md](./PROOF-PACK.md)

---

## Verified complete (measured)

| Item | Evidence |
|------|----------|
| Stage 0–J program documentation | This folder |
| Architect FE 100 tests | `baseline/vitest-architect-full.json` |
| Architect BE 51 tests | validation log |
| contract-matrix / cohesion / redirect | 19 + 30 + 58 |
| FE + BE production builds | PASS |
| JWT permissions + emergencyRole claims | jwt-claims + auth.service |
| FE↔Nest permission map (all roles incl. it_admin) | emergencyNestPermissionMap |
| Capacity dual-counter repair (init/set/WS/refresh) | emergencyStore + KPI tests |
| Accountable AI (contract, DTO, gateway, Copilot, chat) | accountableAi + composer + UI |
| OCR validation before apply | ocrFieldValidation + ocr.service |
| Experimental engines prod OFF | shellEngineCatalog |
| Medical Light + reception density | medical-light-theme + AppShell |
| StateSourceNotice on Capacity | emergencyRoutePages |
| RAG tenant defense-in-depth | applyTenantOrganizationDefenseFilter |
| Role characterization matrix (ED core) | *Characterization* tests |
| Synchronize banned | synchronize-guard |
| EMS–Copilot Playwright **3/3** | Edge; apiClient no longer swallows POST offline |
| Express→Nest inventory + parity contract | express-nest-parity.spec + decommission plan |

## Partial / next engineering

| Item | Priority | Next |
|------|----------|------|
| Live Postgres multi-tenant HTTP e2e | P0 | Docker compose CI |
| Remaining Playwright (a11y, interaction, responsive, canonical) | P0 | Pre-release; EMS-copilot **done** |
| Express → Nest decommission | P1 | Plan + inventory done; Nest parity PRs |
| Accountable UI on every remaining AI surface | P1 | Audit non-Copilot panels |
| Residual CSS namespace merge | P2 | Gradual `--cd-*` only |
| Engine durability → durable when API proven | P2 | Workflow log backend |
| Root SCORECARD.md full rewrite | P2 | Pointer added; full rewrite after commit |

## Blocked / external

| Item | Blocker |
|------|---------|
| Live cloud embed/rerank quality | API keys / cost |
| Production tenant CI | Docker Postgres in agent env |
| Auto-commit Cycles 63–68 | **User decision** |

## Commit checklist (when you approve)

```
# Review
git status
git diff --stat

# Suggested branch
git checkout -b architect-mode/consolidation-2026-07-15

# Do not force-push main
```

Include: Cycles 63–68 + Architect Mode docs + code; exclude secrets.
