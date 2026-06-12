# Plan Scan Battery Report

Started: 2026-06-12T21:28:56.730Z
Completed: 2026-06-12T21:32:55.325Z

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


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  1 passed (1)
      Tests  498 passed (498)
   Start at  17:28:57
   Duration  3.11s (transform 353ms, setup 210ms, import 1.77s, tests 298ms, environment 683ms)
```

### test:catalog-launch — PASS (exit 0)

Command: `npm run test:catalog-launch`

```text
> caredroid-clinical-ai@1.0.0 test:catalog-launch
> vitest run src/data/clinicalCatalogLaunch.test.js


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  1 passed (1)
      Tests  540 passed (540)
   Start at  17:29:01
   Duration  2.43s (transform 285ms, setup 230ms, import 1.26s, tests 74ms, environment 711ms)
```

### test:registry-launch — PASS (exit 0)

Command: `npm run test:registry-launch`

```text
> caredroid-clinical-ai@1.0.0 test:registry-launch
> vitest run src/navigation/registryToolLaunch.test.js src/routes/clinicalToolRoutes.test.js


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  2 passed (2)
      Tests  305 passed (305)
   Start at  17:29:04
   Duration  4.10s (transform 397ms, setup 393ms, import 1.90s, tests 135ms, environment 1.36s)
```

### test:executor-mapping — PASS (exit 0)

Command: `npm run test:executor-mapping`

```text
> caredroid-clinical-ai@1.0.0 test:executor-mapping
> vitest run src/data/executorMappingAudit.test.js src/data/unsupportedOrchestratorTools.test.js src/data/clinicalToolIdContract.test.js src/data/orchestratorMappingHardening.test.js src/services/clinicalOrchestratorApi.test.js


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  5 passed (5)
      Tests  49 passed (49)
   Start at  17:29:09
   Duration  6.68s (transform 308ms, setup 875ms, import 1.56s, tests 71ms, environment 3.42s)
```

### test:contract-matrix — PASS (exit 0)

Command: `npm run test:contract-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:contract-matrix
> vitest run src/data/backendFrontendToolContract.test.js src/data/backendFrontendToolContract.report.test.js src/data/toolContractMatrix.test.js


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  3 passed (3)
      Tests  19 passed (19)
   Start at  17:29:16
   Duration  17.25s (transform 419ms, setup 521ms, import 2.14s, tests 12.10s, environment 2.05s)
```

### test:backend-exposure — PASS (exit 0)

Command: `npm run test:backend-exposure`

```text
> caredroid-clinical-ai@1.0.0 test:backend-exposure
> vitest run src/data/backendFrontendExposure.test.js src/data/backendFrontendExposure.report.test.js src/data/backendFrontendToolContract.test.js src/data/executorMappingAudit.test.js src/data/backendOrphanAudit.test.js src/data/backendControllerRouteScan.test.js src/config/backendApiCapabilities.test.js src/services/clinicalOrchestratorApi.test.js src/services/clinicalToolsApi.test.js src/services/complianceApi.test.js


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  10 passed (10)
      Tests  67 passed (67)
   Start at  17:29:35
   Duration  93.79s (transform 533ms, setup 1.79s, import 2.94s, tests 80.63s, environment 6.95s)
```

### test:e2e-matrix — PASS (exit 0)

Command: `npm run test:e2e-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:e2e-matrix
> vitest run src/data/e2eToolValidationMatrix.test.js


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  1 passed (1)
      Tests  729 passed (729)
   Start at  17:31:09
   Duration  4.06s (transform 308ms, setup 200ms, import 1.31s, tests 1.66s, environment 727ms)
```

### test:tool-render-smoke — PASS (exit 0)

Command: `npm run test:tool-render-smoke`

```text
> caredroid-clinical-ai@1.0.0 test:tool-render-smoke
> vitest run src/data/toolRenderExecuteMatrix.test.js src/test/toolRenderExecuteSmoke.test.jsx src/test/routePagesSmoke.test.jsx src/pages/tools/Calculators.formSmoke.test.jsx


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  4 passed (4)
      Tests  434 passed (434)
   Start at  17:31:14
   Duration  87.11s (transform 2.94s, setup 662ms, import 16.22s, tests 66.81s, environment 2.78s)
```

### test:safety-compliance — PASS (exit 0)

Command: `npm run test:safety-compliance`

```text
> caredroid-clinical-ai@1.0.0 test:safety-compliance
> vitest run src/data/clinicalSafetyGuardrails.test.js src/data/clinicalSafetyCompliance.report.test.js


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  2 passed (2)
      Tests  303 passed (303)
   Start at  17:32:42
   Duration  3.39s (transform 258ms, setup 368ms, import 1.24s, tests 72ms, environment 1.39s)
```

### test:visibility-matrix — PASS (exit 0)

Command: `npm run test:visibility-matrix`

```text
> caredroid-clinical-ai@1.0.0 test:visibility-matrix
> vitest run src/data/toolVisibilityMatrix.test.js


 RUN  v4.1.8 C:/Users/borah/CareDroid-Clinical-AI


 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  17:32:46
   Duration  8.62s (transform 376ms, setup 218ms, import 1.68s, tests 5.88s, environment 683ms)
```

