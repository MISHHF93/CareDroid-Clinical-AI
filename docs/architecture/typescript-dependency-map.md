# TypeScript Dependency Map

Generated: 2026-06-12T03:27:29.433Z

## Summary

- Code files scanned for imports: 1624
- TypeScript/TSX files inventoried: 581
- Runtime circular dependencies found: 0
- Backend barrel files found: 18

## Circular Dependencies

No runtime circular dependencies detected in the local import graph after excluding comments/JSDoc-only type references.

## Barrel Files

| File | Exports | Action |
| --- | --- | --- |
| backend/src/modules/ai-gateway/index.ts | * from ./ai-gateway.module, * from ./ai-gateway.service, * from ./context-builder.service, * from ./response-composer.service | verify exported modules remain current |
| backend/src/modules/ai/foundation/index.ts | * from ./ai-context-manager.service, * from ./ai-expert-descriptors, * from ./ai-foundation.types, * from ./ai-gateway.service, * from ./ai-response-composer.service, * from ./ai-routing-engine.service | verify exported modules remain current |
| backend/src/modules/auth/entities/index.ts | * from ./biometric-config.entity | verify exported modules remain current |
| backend/src/modules/auth/services/index.ts | * from ./biometric.service | verify exported modules remain current |
| backend/src/modules/cost-optimizer/index.ts | * from ./cache.service, * from ./complexity-scorer.service, * from ./cost-optimizer.module, * from ./cost-optimizer.types, * from ./cost-prediction.service, * from ./routing-optimizer.service | verify exported modules remain current |
| backend/src/modules/evaluation/index.ts | * from ./evaluation.module, * from ./evaluation.service, * from ./evaluation.types | verify exported modules remain current |
| backend/src/modules/fleet/index.ts | * from ./fleet.module, * from ./fleet.service, * from ./vehicle-tracking.service | verify exported modules remain current |
| backend/src/modules/hospital-map/index.ts | * from ./device-location.service, * from ./floor.service, * from ./hospital-map.module, * from ./room.service | verify exported modules remain current |
| backend/src/modules/memory/index.ts | * from ./clinical-memory.service, * from ./long-memory.service, * from ./memory-fabric.constants, * from ./memory-fabric.service, * from ./memory.module, * from ./short-memory.service | verify exported modules remain current |
| backend/src/modules/moe-router/index.ts | * from ./expert-registry, * from ./expert-selector.service, * from ./moe-router.module, * from ./moe-router.service, * from ./moe-router.types | verify exported modules remain current |
| backend/src/modules/notifications/entities/index.ts | * from ./notification.entity, * from ./device-token.entity, * from ./notification-preference.entity | verify exported modules remain current |
| backend/src/modules/notifications/services/index.ts | * from ./notification.service, * from ./firebase.service, * from ./device-token.service, * from ./notification-preference.service | verify exported modules remain current |
| backend/src/modules/platform-governance/index.ts | * from ./platform-governance.module, * from ./platform-governance.service, * from ./entities/platform-governance.entities, * from ./dto/platform-governance.dto | verify exported modules remain current |
| backend/src/modules/simulation/index.ts | * from ./simulation.module, * from ./simulation.controller, * from ./simulation-scenario.service, * from ./simulation-run.service, * from ./simulation-outcome.service, * from ./debrief.service, * from ./competency.service, * from ./simulation.types | verify exported modules remain current |
| backend/src/modules/telemetry/index.ts | * from ./alert.service, * from ./device-registry.service, * from ./telemetry.module, * from ./telemetry.service | verify exported modules remain current |
| backend/src/modules/tool-calling/index.ts | * from ./parameter-collector.service, * from ./tool-calling.module, * from ./tool-calling.types, * from ./tool-execution.service, * from ./tool-resolver.service, * from ./validation.service | verify exported modules remain current |
| backend/src/modules/training/index.ts | * from ./training.controller, * from ./training.module, * from ./training.service, * from ./training.types | verify exported modules remain current |
| backend/src/services/index.ts | { capacityService, CapacityService }, { copilotService, CopilotService }, { emsService, EMSService }, { fhirService, FHIRService }, { mpiService, MPIService }, { ocrService, OCRService }, { reassessmentService, ReassessmentService }, { smartIntakeService, SmartIntakeService }, { textMiningService, TextMiningService } | created/active registry |

## Path Alias Notes

- Frontend TS config exposes only `@/* -> src/*`.
- Backend TS/Jest config exposes `@/*`, `@modules/*`, `@common/*`, and `@config/*`.
- Active root JS/JSX uses mostly relative imports, so alias drift is lower risk in the active Emergency OS surface.

## Duplicate / Conflict Hotspots

- Duplicate notification service implementations remain: `src/services/NotificationService.js` and `src/services/notifications/NotificationService.js`.
- Route ownership remains duplicated across `src/config/routes.config.js`, `src/App.jsx`, `src/config/navigation.config.js`, tool route manifests, and route health tests.
- Backend platform modules remain broad by design; they should not be deleted by keyword while `AppModule` imports them.

