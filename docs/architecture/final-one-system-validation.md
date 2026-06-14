# Final One-System Validation

Date: 2026-06-14

## Acceptance Summary

CareDroid currently resolves to one active Emergency OS product spine:

```text
Root Vite SPA -> src/main.jsx -> src/App.jsx -> src/components/AppShell.tsx
  -> canonical /emergency/* routes
  -> src/services/emergencyOsApi.js
  -> Nest /api/emergency/* controller
  -> Emergency OS services and central node snapshot
```

## Validation Commands

| Command | Result | Notes |
| --- | --- | --- |
| `bash scripts/verify-single-instance.sh` | NOT RUN | `bash` is not available in the current Windows shell. PowerShell equivalent was added and run. |
| `bash scripts/fix-circular.sh` | NOT RUN | `bash` is not available in the current Windows shell; circular checks were run with `npx --no-install madge`. |
| `bash scripts/check-ports.sh` | NOT RUN | `bash` is not available in the current Windows shell. PowerShell equivalent was added and run. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-single-instance.ps1` | PASS | Confirmed canonical active files, no `frontend/package.json` second app, and no active imports from `frontend/src`. |
| `npx --no-install madge --circular --extensions ts ./backend/src` | PASS | No backend circular dependency found after the Advanced Upgrade Harness changes. |
| `npx --no-install madge --circular --extensions tsx,ts,jsx,js ./src` | PASS | No frontend circular dependencies found. |
| `npx --no-install ts-prune` | NOT RUN | Package unavailable without install; no dependency changes made during safe audit. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-ports.ps1` | PASS | Ports 3000 and 8000 are in use; 3001, 8080, 1883, 5432, and 27017 are free. Stale duplicate script block removed. No processes killed. |
| `npm run typecheck:frontend` | PASS | Frontend typecheck completed after adding harness UI surfaces. |
| `npm run lint` | PASS | Root frontend lint completed. |
| `npm run build` | PASS with warnings | Existing Vite circular chunk/manual chunk warnings and `offlineService` static/dynamic import warning. |
| `npx vitest run src/data/duplicateSystemAudit.report.test.js src/routing/routeAuthRebuild.test.js src/config/unified-navigation.config.test.ts` | PASS_AFTER_RETRY | Combined run hit a Vitest worker startup timeout after two files passed; rerunning each file individually passed: 14 total tests. |
| `npm test -- emergency-os.controller.spec.ts` from `backend/` | PASS | 1 file, 12 tests passed, including Advanced Upgrade Harness safety/audit coverage. |
| `npm run lint` from `backend/` | PASS | Backend lint completed after formatting the touched harness files. |
| `npm run build` from `backend/` | PASS | Backend Nest build completed. |

## Advanced Upgrade Harness Validation

- New canonical endpoints remain under `/api/emergency/upgrade-harness*`; no `/api/v1`, second shell, second router, second app, or external infrastructure dependency was introduced.
- Every upgrade signal includes provenance, confidence, safety status, human-review messaging, blocked autonomous-action metadata, and linked SHA-256 audit metadata.
- Autonomous diagnosis, prescribing, disposition, and patient matching remain explicitly blocked.

## Residual Risks

- `ENABLE_MONGOOSE_EMERGENCY_OS=true` can mount optional Express/Mongoose routes that overlap the canonical Nest surface.
- Broad backend modules remain mounted in `AppModule` even though the frontend has been redirected to Emergency OS.
- `src/layout/AppShell.jsx` remains referenced by tests/helpers and should not be archived until those references are migrated.
- Android/Capacitor and `frontend/src` compatibility shims remain in the repo but are not active second applications.
