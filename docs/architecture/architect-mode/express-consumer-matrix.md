# Express API Consumer Matrix (FE)

**Generated:** 2026-07-15 (grep evidence, Architect Mode)  
**Purpose:** Phase 1 of Express→Nest decommission — who still calls legacy `/api/*` groups.

| Express group | FE / client consumers (examples) | Notes |
|---------------|----------------------------------|-------|
| `/api/capacity` | `src/services/configService.ts` (path list) | Also emergencyOsApi patterns |
| `/api/copilot` | `configService.ts` path list | Prefer Nest chat/ai-gateway |
| `/api/ems` | `configService.ts` path list | EMSPipeline / emergencyOsApi |
| `/api/governance/*` | `platformGovernanceApi.ts` (+ tests) | Nest platform-governance preferred for product governance; Express AI governance is separate under `/api/governance` routes-registry |

## Discovery commands

```bash
# Re-scan FE hard-coded legacy paths
rg "/api/(ems|capacity|intake|copilot|governance|boarding|reassessment|handover)" src --glob "*.{ts,tsx}"
```

## Nest-preferred product governance

`platformGovernanceApi.ts` already targets Nest-style `/api/governance/clinical/*` paths — confirm Nest controllers own these (not Express `governance.routes.ts` AI registry). Express `governance.routes.ts` is AI governance (registry, violations, evaluate-priority) — **P0 migrate**.

## Exit for Phase 1

- [x] Inventory document exists  
- [ ] Every consumer file listed with Nest replacement ticket  
- [ ] No new Express paths added without ADR  
