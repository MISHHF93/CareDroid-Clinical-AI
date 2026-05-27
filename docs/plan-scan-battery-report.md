# Plan Scan Battery Report

Started: 2026-05-27T02:40:46.078Z
Completed: 2026-05-27T02:44:08.212Z

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


 RUN  v4.0.18 /workspace/CareDroid-Clinical-AI

 ✓ src/data/clinicalToolAliasSync.test.js (498 tests) 576ms

 Test Files  1 passed (1)
      Tests  498 passed (498)
   Start at  02:40:48
   Duration  2.84s (transform 687ms, setup 252ms, import 978ms, tests 576ms, environment 733ms)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

### test:catalog-launch — PASS (exit 0)

Command: `npm run test:catalog-launch`

```text
> caredroid-clinical-ai@1.0.0 test:catalog-launch
> vitest run src/data/clinicalCatalogLaunch.test.js


 RUN  v4.0.18 /workspace/CareDroid-Clinical-AI

 ✓ src/data/clinicalCatalogLaunch.test.js (525 tests) 81ms

 Test Files  1 passed (1)
      Tests  525 passed (525)
   Start at  02:40:52
   Duration  1.83s (transform 491ms, setup 209ms, import 617ms, tests 81ms, environment 644ms)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

### test:registry-launch — PASS (exit 0)

Command: `npm run test:registry-launch`

```text
> caredroid-clinical-ai@1.0.0 test:registry-launch
> vitest run src/navigation/registryToolLaunch.test.js src/routes/clinicalToolRoutes.test.js


 RUN  v4.0.18 /workspace/CareDroid-Clinical-AI

 ✓ src/routes/clinicalToolRoutes.test.js (30 tests) 28ms
 ✓ src/navigation/registryToolLaunch.test.js (256 tests) 146ms

 Test Files  2 passed (2)
      Tests  286 passed (286)
   Start at  02:40:56
   Duration  3.16s (transform 540ms, setup 359ms, import 819ms, tests 174ms, environment 1.32s)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

### test:executor-mapping — PASS (exit 0)

Command: `npm run test:executor-mapping`

```text
> caredroid-clinical-ai@1.0.0 test:executor-mapping
> vitest run src/data/executorMappingAudit.test.js src/data/unsupportedOrchestratorTools.test.js src/data/clinicalToolIdContract.test.js src/data/orchestratorMappingHardening.test.js src/services/clinicalOrchestratorApi.test.js


 RUN  v4.0.18 /workspace/CareDroid-Clinical-AI

 ✓ src/data/clinicalToolIdContract.test.js (25 tests) 45ms
 ✓ src/data/orchestratorMappingHardening.test.js (10 tests) 49ms
 ✓ src/data/executorMappingAudit.test.js (6 tests) 23ms
 ✓ src/services/clinicalOrchestratorApi.test.js (5 tests) 9ms
 ✓ src/data/unsupportedOrchestratorTools.test.js (3 tests) 7ms

 Test Files  5 passed (5)
      Tests  49 passed (49)
   Start at  02:41:01
   Duration  6.44s (transform 533ms, setup 876ms, import 882ms, tests 134ms, environment 3.32s)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

### test:contract-matrix — PASS (exit 0)

Command: `npm run test:contract-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:contract-matrix
> vitest run src/data/backendFrontendToolContract.test.js src/data/backendFrontendToolContract.report.test.js src/data/toolContractMatrix.test.js


 RUN  v4.0.18 /workspace/CareDroid-Clinical-AI

 ✓ src/data/backendFrontendToolContract.test.js (10 tests) 2962ms
     ✓ assigns POST executor only to registered orchestrator ids  1626ms
     ✓ documents procedures NLU profile with frontend-only status  1298ms
 ✓ src/data/toolContractMatrix.test.js (7 tests) 10315ms
     ✓ maps every backendFrontendContract row to matrix columns  2879ms
     ✓ includes every NLU profile id  1389ms
     ✓ marks exactly three NLU tools with POST executors  1264ms
     ✓ uses only allowed status values  1191ms
     ✓ marks share-results row as frontend-only (gated)  1160ms
     ✓ generates markdown with required headers  2429ms
 ✓ src/data/backendFrontendToolContract.report.test.js (2 tests) 1451ms
     ✓ covers every NLU profile and three POST executors  1449ms

 Test Files  3 passed (3)
      Tests  19 passed (19)
   Start at  02:41:10
   Duration  19.51s (transform 725ms, setup 552ms, import 1.46s, tests 14.73s, environment 2.01s)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

### test:backend-exposure — PASS (exit 0)

Command: `npm run test:backend-exposure`

```text
 RUN  v4.0.18 /workspace/CareDroid-Clinical-AI

 ✓ src/data/backendFrontendExposure.test.js (12 tests) 18764ms
     ✓ passes with zero unguarded missing routes and no false executor claims  4321ms
     ✓ inventory covers three POST executors  3539ms
     ✓ gates known missing routes behind disabled capabilities  3647ms
     ✓ every frontend inventory entry resolves exposure status  3586ms
     ✓ covers demo-backed clinical alerts API routes while keeping stream gated  3629ms
 ✓ src/data/backendFrontendToolContract.test.js (10 tests) 2688ms
     ✓ assigns POST executor only to registered orchestrator ids  1465ms
     ✓ documents procedures NLU profile with frontend-only status  1190ms
 ✓ src/services/clinicalToolsApi.test.js (9 tests) 16ms
 ✓ src/config/backendApiCapabilities.test.js (5 tests) 8ms
 ✓ src/data/executorMappingAudit.test.js (6 tests) 26ms
 ✓ src/data/backendOrphanAudit.test.js (7 tests) 11824ms
     ✓ passes full orphan assertion (inventory ↔ controllers ↔ policy ↔ frontend)  4262ms
     ✓ exposure scan and orphan audit agree on zero unguarded calls  7456ms
 ✓ src/services/clinicalOrchestratorApi.test.js (5 tests) 9ms
 ✓ src/data/backendFrontendExposure.report.test.js (2 tests) 4054ms
     ✓ scan passes before writing docs  4052ms
 ✓ src/data/backendControllerRouteScan.test.js (4 tests) 90ms
 ✓ src/services/complianceApi.test.js (2 tests) 7ms

 Test Files  10 passed (10)
      Tests  62 passed (62)
   Start at  02:41:31
   Duration  50.70s (transform 972ms, setup 1.78s, import 2.15s, tests 37.49s, environment 6.91s)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

### test:e2e-matrix — PASS (exit 0)

Command: `npm run test:e2e-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:e2e-matrix
> vitest run src/data/e2eToolValidationMatrix.test.js


 RUN  v4.0.18 /workspace/CareDroid-Clinical-AI

 ✓ src/data/e2eToolValidationMatrix.test.js (684 tests) 2302ms
     ✓ builds complete inventory for every registry tool id  476ms

 Test Files  1 passed (1)
      Tests  684 passed (684)
   Start at  02:42:24
   Duration  4.19s (transform 571ms, setup 216ms, import 756ms, tests 2.30s, environment 635ms)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

### test:tool-render-smoke — PASS (exit 0)

Command: `npm run test:tool-render-smoke`

```text
     ✓ renders core UX surfaces without empty content at 1440px  1854ms
 ✓ src/test/toolRenderExecuteSmoke.test.jsx (13 tests) 3473ms
     ✓ /tools renders primary UI  983ms
     ✓ DrugChecker calls executeClinicalTool and shows results  510ms
     ✓ DrugChecker shows user-visible error when executor fails  361ms
     ✓ LabInterpreter shows user-visible unsupported state when executor is unavailable  377ms
     ✓ SOFA calculator shows user-visible unsupported state when executor is unavailable  578ms
 ✓ src/pages/tools/Calculators.formSmoke.test.jsx (235 tests) 24863ms
     ✓ renders calculators hub with chat-assisted section and selection cards  1148ms
 ✓ src/data/toolRenderExecuteMatrix.test.js (6 tests) 918ms
     ✓ covers every registry tool id  396ms

 Test Files  4 passed (4)
      Tests  368 passed (368)
   Start at  02:42:31
   Duration  80.20s (transform 3.87s, setup 780ms, import 8.38s, tests 66.80s, environment 2.97s)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
stderr | src/test/routePagesSmoke.test.jsx > Route pages smoke — non-empty render > 'dashboard' at '/dashboard' renders primary content
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

stderr | src/test/toolRenderExecuteSmoke.test.jsx > toolRenderExecuteSmoke — clinical pages non-empty > /tools/drug-checker renders primary UI
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

stderr | src/pages/tools/Calculators.formSmoke.test.jsx > Calculators — hub shell > renders calculators hub with chat-assisted section and selection cards
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
```

### test:safety-compliance — PASS (exit 0)

Command: `npm run test:safety-compliance`

```text
- Chat seeds passing: 199 (failing: 0)
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


 ✓ src/data/clinicalSafetyCompliance.report.test.js (1 test) 51ms

 Test Files  2 passed (2)
      Tests  288 passed (288)
   Start at  02:43:53
   Duration  3.31s (transform 501ms, setup 382ms, import 769ms, tests 112ms, environment 1.41s)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

### test:visibility-matrix — PASS (exit 0)

Command: `npm run test:visibility-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:visibility-matrix
> vitest run src/data/toolVisibilityMatrix.test.js


 RUN  v4.0.18 /workspace/CareDroid-Clinical-AI

 ✓ src/data/toolVisibilityMatrix.test.js (9 tests) 7119ms
     ✓ includes every sidebar registry tool  1070ms
     ✓ includes NLU hub-only profile ids  745ms
     ✓ covers all clinicalIntentTools profiles  728ms
     ✓ documents three backend executors on Tier C tools only  768ms
     ✓ marks Tier B registry tools as fully visible after centralized launch  743ms
     ✓ marks NLU hub-only profiles with sidebar registry rows as fully visible  762ms
     ✓ maps calc-gfr to gfr calculator slug  762ms
     ✓ generates markdown with matrix table header  782ms
     ✓ document summary matches row count  756ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  02:43:58
   Duration  9.18s (transform 663ms, setup 230ms, import 866ms, tests 7.12s, environment 727ms)


npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

