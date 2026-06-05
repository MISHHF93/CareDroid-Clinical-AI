# Plan Scan Battery Report

Started: 2026-06-05T05:41:21.247Z
Completed: 2026-06-05T05:44:29.192Z

## Summary

- Suites run: 10
- Passed: 10
- Failed: 0

## Suite Results

### test:alias-sync — PASS (exit 0)

Command: `npm run test:alias-sync`

```text
> caredroid-clinical-ai@1.0.0 test:alias-sync
> vitest run src/data/clinicalToolAliasSync.test.js


 RUN  v4.0.18 C:/Users/borah/CareDroid-Clinical-AI

 ✓ src/data/clinicalToolAliasSync.test.js (498 tests) 282ms

 Test Files  1 passed (1)
      Tests  498 passed (498)
   Start at  01:41:21
   Duration  2.89s (transform 401ms, setup 211ms, import 1.61s, tests 282ms, environment 644ms)
```

### test:catalog-launch — PASS (exit 0)

Command: `npm run test:catalog-launch`

```text
> caredroid-clinical-ai@1.0.0 test:catalog-launch
> vitest run src/data/clinicalCatalogLaunch.test.js


 RUN  v4.0.18 C:/Users/borah/CareDroid-Clinical-AI

 ✓ src/data/clinicalCatalogLaunch.test.js (540 tests) 63ms

 Test Files  1 passed (1)
      Tests  540 passed (540)
   Start at  01:41:25
   Duration  2.27s (transform 259ms, setup 205ms, import 1.22s, tests 63ms, environment 636ms)
```

### test:registry-launch — PASS (exit 0)

Command: `npm run test:registry-launch`

```text
> caredroid-clinical-ai@1.0.0 test:registry-launch
> vitest run src/navigation/registryToolLaunch.test.js src/routes/clinicalToolRoutes.test.js


 RUN  v4.0.18 C:/Users/borah/CareDroid-Clinical-AI

 ✓ src/navigation/registryToolLaunch.test.js (271 tests) 56ms
 ✓ src/routes/clinicalToolRoutes.test.js (30 tests) 23ms

 Test Files  2 passed (2)
      Tests  301 passed (301)
   Start at  01:41:28
   Duration  3.33s (transform 295ms, setup 352ms, import 1.34s, tests 79ms, environment 1.28s)
```

### test:executor-mapping — PASS (exit 0)

Command: `npm run test:executor-mapping`

```text
> caredroid-clinical-ai@1.0.0 test:executor-mapping
> vitest run src/data/executorMappingAudit.test.js src/data/unsupportedOrchestratorTools.test.js src/data/clinicalToolIdContract.test.js src/data/orchestratorMappingHardening.test.js src/services/clinicalOrchestratorApi.test.js


 RUN  v4.0.18 C:/Users/borah/CareDroid-Clinical-AI

 ✓ src/data/orchestratorMappingHardening.test.js (10 tests) 25ms
 ✓ src/data/clinicalToolIdContract.test.js (25 tests) 21ms
 ✓ src/data/executorMappingAudit.test.js (6 tests) 10ms
 ✓ src/services/clinicalOrchestratorApi.test.js (5 tests) 7ms
 ✓ src/data/unsupportedOrchestratorTools.test.js (3 tests) 3ms

 Test Files  5 passed (5)
      Tests  49 passed (49)
   Start at  01:41:32
   Duration  6.21s (transform 322ms, setup 779ms, import 1.51s, tests 66ms, environment 3.19s)
```

### test:contract-matrix — PASS (exit 0)

Command: `npm run test:contract-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:contract-matrix
> vitest run src/data/backendFrontendToolContract.test.js src/data/backendFrontendToolContract.report.test.js src/data/toolContractMatrix.test.js


 RUN  v4.0.18 C:/Users/borah/CareDroid-Clinical-AI

 ✓ src/data/toolContractMatrix.test.js (7 tests) 9613ms
     ✓ maps every backendFrontendContract row to matrix columns  2473ms
     ✓ includes every NLU profile id  1226ms
     ✓ marks exactly three NLU tools with POST executors  1127ms
     ✓ uses only allowed status values  1143ms
     ✓ marks share-results row as frontend-only (gated)  1247ms
     ✓ generates markdown with required headers  2394ms
 ✓ src/data/backendFrontendToolContract.test.js (10 tests) 2446ms
     ✓ assigns POST executor only to registered orchestrator ids  1110ms
     ✓ documents procedures NLU profile with frontend-only status  1306ms
 ✓ src/data/backendFrontendToolContract.report.test.js (2 tests) 1093ms
     ✓ covers every NLU profile and three POST executors  1092ms

 Test Files  3 passed (3)
      Tests  19 passed (19)
   Start at  01:41:39
   Duration  18.59s (transform 417ms, setup 512ms, import 2.28s, tests 13.15s, environment 2.23s)
```

### test:backend-exposure — PASS (exit 0)

Command: `npm run test:backend-exposure`

```text
> vitest run src/data/backendFrontendExposure.test.js src/data/backendFrontendExposure.report.test.js src/data/backendFrontendToolContract.test.js src/data/executorMappingAudit.test.js src/data/backendOrphanAudit.test.js src/data/backendControllerRouteScan.test.js src/config/backendApiCapabilities.test.js src/services/clinicalOrchestratorApi.test.js src/services/clinicalToolsApi.test.js src/services/complianceApi.test.js


 RUN  v4.0.18 C:/Users/borah/CareDroid-Clinical-AI

 ✓ src/data/backendFrontendExposure.test.js (12 tests) 21623ms
     ✓ passes with zero unguarded missing routes and no false executor claims  4253ms
     ✓ inventory covers three POST executors  4287ms
     ✓ gates known missing routes behind disabled capabilities  4283ms
     ✓ every frontend inventory entry resolves exposure status  4555ms
     ✓ covers demo-backed clinical alerts API routes while keeping stream gated  4194ms
 ✓ src/data/backendOrphanAudit.test.js (7 tests) 13565ms
     ✓ passes full orphan assertion (inventory ↔ controllers ↔ policy ↔ frontend)  4441ms
     ✓ exposure scan and orphan audit agree on zero unguarded calls  8991ms
 ✓ src/data/backendFrontendExposure.report.test.js (2 tests) 4146ms
     ✓ scan passes before writing docs  4145ms
 ✓ src/data/backendFrontendToolContract.test.js (10 tests) 2251ms
     ✓ assigns POST executor only to registered orchestrator ids  1088ms
     ✓ documents procedures NLU profile with frontend-only status  1136ms
 ✓ src/data/backendControllerRouteScan.test.js (5 tests) 91ms
 ✓ src/services/clinicalToolsApi.test.js (9 tests) 11ms
 ✓ src/data/executorMappingAudit.test.js (6 tests) 10ms
 ✓ src/services/clinicalOrchestratorApi.test.js (5 tests) 6ms
 ✓ src/config/backendApiCapabilities.test.js (5 tests) 5ms
 ✓ src/services/complianceApi.test.js (2 tests) 4ms

 Test Files  10 passed (10)
      Tests  63 passed (63)
   Start at  01:41:58
   Duration  53.91s (transform 510ms, setup 1.56s, import 2.87s, tests 41.71s, environment 6.43s)
```

### test:e2e-matrix — PASS (exit 0)

Command: `npm run test:e2e-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:e2e-matrix
> vitest run src/data/e2eToolValidationMatrix.test.js


 RUN  v4.0.18 C:/Users/borah/CareDroid-Clinical-AI

 ✓ src/data/e2eToolValidationMatrix.test.js (729 tests) 1758ms

 Test Files  1 passed (1)
      Tests  729 passed (729)
   Start at  01:42:53
   Duration  4.19s (transform 312ms, setup 199ms, import 1.44s, tests 1.76s, environment 646ms)
```

### test:tool-render-smoke — PASS (exit 0)

Command: `npm run test:tool-render-smoke`

```text
     ✓ 'tools-catalog' at '/tools/catalog' renders primary content  1066ms
     ✓ 'fleet-command' at '/fleet/command' renders primary content  333ms
     ✓ major pages render non-empty content in light mode  3246ms
     ✓ major pages render non-empty content in dark mode  2712ms
     ✓ 'tools-overview' survives compact viewport mock  675ms
     ✓ 'tools-catalog' survives compact viewport mock  763ms
     ✓ 'fleet-command' survives compact viewport mock  309ms
     ✓ renders core UX surfaces without empty content at 320px  1842ms
     ✓ renders core UX surfaces without empty content at 360px  1941ms
     ✓ renders core UX surfaces without empty content at 390px  1895ms
     ✓ renders core UX surfaces without empty content at 412px  1892ms
     ✓ renders core UX surfaces without empty content at 430px  1820ms
     ✓ renders core UX surfaces without empty content at 768px  1898ms
     ✓ renders core UX surfaces without empty content at 1024px  2152ms
     ✓ renders core UX surfaces without empty content at 1280px  2019ms
     ✓ renders core UX surfaces without empty content at 1440px  1905ms
 ✓ src/pages/tools/Calculators.formSmoke.test.jsx (235 tests) 18696ms
     ✓ renders calculators hub with chat-assisted section and selection cards  447ms
 ✓ src/test/toolRenderExecuteSmoke.test.jsx (13 tests) 2855ms
     ✓ /tools renders primary UI  609ms
     ✓ DrugChecker calls executeClinicalTool and shows results  506ms
     ✓ DrugChecker shows user-visible error when executor fails  385ms
     ✓ LabInterpreter shows user-visible unsupported state when executor is unavailable  370ms
     ✓ SOFA calculator shows user-visible unsupported state when executor is unavailable  434ms
 ✓ src/data/toolRenderExecuteMatrix.test.js (6 tests) 495ms

 Test Files  4 passed (4)
      Tests  410 passed (410)
   Start at  01:42:58
   Duration  77.05s (transform 2.75s, setup 656ms, import 13.17s, tests 60.09s, environment 2.58s)
```

### test:safety-compliance — PASS (exit 0)

Command: `npm run test:safety-compliance`

```text

## Summary

- Chat seeds passing: 214 (failing: 0)
- UI surfaces passing: 12 (failing: 0)
- Metadata gaps: 0
- Launch seed gaps: 0
- Critical issues: 0

## Guardrail checklist

- **decision-support-disclaimer**: Every clinical tool surfaces decision-support (not diagnostic) framing.
- **mental-health-crisis**: PHQ-9/GAD-7 include crisis-sensitive handling (988 / urgent evaluation pathways).
- **trauma-stroke-urgent-care**: Trauma/stroke tools warn against delaying emergency pathways.
- **pe-acs-no-certainty**: PE/ACS tools avoid diagnostic certainty and treatment directives.
- **anticoag-no-therapy-directives**: Anticoagulation tools avoid start/stop/switch therapy recommendations.
- **fleet-no-auto-authority**: Fleet/dispatch tools forbid fully automated operational authority.
- **ai-docs-human-review**: AI documentation tools (DDx, procedures, protocols) require human review.
- **no-unsupported-dosing**: No tool provides unsupported weight-based or mg/kg dosing recommendations.
- **support-not-diagnosis**: Outputs phrased as support/stratification, not definitive diagnosis.

No open compliance findings.


 ✓ src/data/clinicalSafetyCompliance.report.test.js (1 test) 23ms

 Test Files  2 passed (2)
      Tests  303 passed (303)
   Start at  01:44:16
   Duration  3.11s (transform 254ms, setup 346ms, import 1.18s, tests 58ms, environment 1.26s)
```

### test:visibility-matrix — PASS (exit 0)

Command: `npm run test:visibility-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:visibility-matrix
> vitest run src/data/toolVisibilityMatrix.test.js


 RUN  v4.0.18 C:/Users/borah/CareDroid-Clinical-AI

 ✓ src/data/toolVisibilityMatrix.test.js (9 tests) 6407ms
     ✓ includes every sidebar registry tool  748ms
     ✓ includes NLU hub-only profile ids  753ms
     ✓ covers all clinicalIntentTools profiles  712ms
     ✓ documents three backend executors on Tier C tools only  718ms
     ✓ marks Tier B registry tools as fully visible after centralized launch  731ms
     ✓ marks NLU hub-only profiles with sidebar registry rows as fully visible  697ms
     ✓ maps calc-gfr to gfr calculator slug  660ms
     ✓ generates markdown with matrix table header  697ms
     ✓ document summary matches row count  690ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  01:44:20
   Duration  9.12s (transform 348ms, setup 196ms, import 1.75s, tests 6.41s, environment 633ms)
```

