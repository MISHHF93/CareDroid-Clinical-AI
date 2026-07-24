# Reception full QA report

**Generated:** 2026-07-24T04:40:34.053Z
**Grade:** **A**
**Overall:** PASS — ready for handoff/push review

## Steps

| Step | Result | Duration | Notes |
|------|--------|----------:|-------|
| vitest-reception | PASS | 13570ms | 68 tests |
| prompt-nav-portable | PASS | 440ms |  |
| reception-desk-perf | PASS | 3602ms |  |
| patient-journey-perf | PASS | 16809ms |  |

## Coverage

Vitest targets:
- `src/config/receptionSkillModel.test.ts`
- `src/config/receptionDeskExecutableActions.test.ts`
- `src/config/receptionUserProfile.test.ts`
- `src/components/reception/ReceptionSkillStrip.test.tsx`
- `src/services/interactiveAi/promptNavigationIntent.test.ts`
- `src/services/interactiveAi/aiCommandRegistry.test.ts`
- `src/components/interactive-ai/InteractiveAIWorkspace.test.tsx`
- `src/services/receptionIntakeOrchestrator.test.ts`

## Performance snapshot

- Offline NBA p95: **0.0004ms**
- Offline prompt intent p95: **0.015ms**
- Desk perf grade: **A**

- Patient journey: grade **see qa/patient-journey-performance-report.md**, patients **6**

## How to re-run

```bash
node scripts/run-reception-full-qa.mjs
# or pieces:
$env:ESBUILD_USE_WASM="1"; npx vitest run src/config/receptionSkillModel.test.ts src/config/receptionDeskExecutableActions.test.ts src/config/receptionUserProfile.test.ts src/components/reception/ReceptionSkillStrip.test.tsx src/services/interactiveAi/promptNavigationIntent.test.ts src/services/interactiveAi/aiCommandRegistry.test.ts src/components/interactive-ai/InteractiveAIWorkspace.test.tsx src/services/receptionIntakeOrchestrator.test.ts
node scripts/reception-desk-performance.mjs
BACKEND_PORT=3350 node scripts/patient-journey-performance.mjs
```
