# Duplicate System Cleanup Report

Date: 2026-06-13

## Cleanup Summary

Safe cleanup was limited to proven conflicts and stale canonical references. No uncertain source files were deleted.

## Files Added

- `backend/src/modules/user-profile/user-preferences.module.ts`
  - Extracts `UserPreferencesService` into a shared Nest module.
  - Breaks the static module cycle between platform assets, user profile, and workspaces.

## Files Updated

- `backend/src/modules/user-profile/user-profile.module.ts`
  - Imports `UserPreferencesModule`.
  - Stops declaring `UserPreferencesService` directly.
  - Re-exports `UserPreferencesModule` for existing consumers.

- `backend/src/modules/platform-assets/platform-assets.module.ts`
  - Imports `UserPreferencesModule` instead of `UserProfileModule`.
  - Removes the circular dependency path into `WorkspacesModule`.

- `scripts/check-ports.sh`
  - Expands default checked ports to `3000 3001 8000 8080 1883 5432 27017`.
  - Remains report-only and does not kill processes.

- `src/data/duplicateSystemAudit.js`
  - Updates canonical AppShell references from `src/layout/AppShell.jsx` to `src/components/AppShell.tsx`.
  - Marks the legacy layout as manual-review/legacy instead of active canonical shell.

- `src/components/SystemHealth.tsx`
  - Now owns the active System Health component implementation inside the root `src` app.

- `frontend/src/components/SystemHealth.tsx`
  - Converted to a compatibility re-export back to `src/components/SystemHealth.tsx`.

- `scripts/verify-single-instance.ps1`
  - Adds a Windows-native single-instance verifier for this PowerShell workspace.
  - Removed stale duplicate verification block so the script has one active implementation.

- `scripts/check-ports.ps1`
  - Adds a Windows-native report-only port checker.
  - Removed stale duplicate port-check block so the script reports the CareDroid port set once.

- `docs/architecture/one-repository-system-audit.md`
  - Records cleanup actions and non-deletion decisions.

## Files Deleted

None.

## Files Archived

None.

## Explicit Non-Deletion Decisions

- `src/layout/AppShell.jsx`: retained because tests and legacy audit inventories still read it.
- `src/components/Sidebar.tsx` and `src/components/Header.tsx`: retained because active `AppShell` imports them.
- `src/config/navigation.config.js`: retained as a compatibility projection derived from `unified-navigation.config.ts`.
- `src/store/emergency-store.ts` and `frontend/src/store/emergency-store.ts`: retained as compatibility re-exports.
- `backend/src/models/unified-patient.model.ts` and Emergency OS DTO/type files: retained because they serve different backend/frontend layers.
- `backend/src/api/routes-registry.ts`: retained behind runtime gating and route discovery.
- `android/` and `capacitor.config.json`: retained as mobile packaging artifacts.
- `node_modules`, lockfiles, env examples, and generated docs: not removed during a dirty-tree audit.

## Cleanup Result

CareDroid now has no detected backend circular dependency and the repository metadata points to the actual active AppShell. Remaining duplication is classified as compatibility, optional runtime, future-module, or manual-review material.
# Duplicate System Cleanup Report

Date: 2026-06-13

## Cleanup Scope

This pass did not delete files, remove lockfiles, remove `node_modules`, or archive uncertain code. The dirty working tree was preserved.

## Changes Executed

| Change | Classification | File | Reason |
| --- | --- | --- | --- |
| Disabled destructive cleanup mode | BLOCKING_CONFLICT mitigated | `scripts/audit-and-clean.sh` | The script can no longer run `rm -rf` through `CLEAN_EXECUTE=true`. |
| Disabled destructive cleanup mode | BLOCKING_CONFLICT mitigated | `scripts/audit-and-clean.ps1` | The script can no longer run `Remove-Item -Recurse -Force` through `CLEAN_EXECUTE=true`. |
| Added single-instance verifier | SHARED_REQUIRED | `scripts/verify-single-instance.sh` | Detects canonical active files and obvious second-app imports without false-failing compatibility shims. |
| Added circular detector wrapper | SHARED_REQUIRED | `scripts/fix-circular.sh` | Reports with existing `madge` only; does not install dependencies or modify files. |
| Added Windows-safe port checker | SHARED_REQUIRED | `scripts/check-ports.sh` | Uses PowerShell/netstat when available and never kills processes. |
| Added Windows single-instance verifier | SHARED_REQUIRED | `scripts/verify-single-instance.ps1` | Same checks as shell script for Windows environments without Bash. |
| Added Windows circular detector wrapper | SHARED_REQUIRED | `scripts/fix-circular.ps1` | Reports with existing `madge` only; does not install dependencies or modify files. |
| Added Windows port checker | SHARED_REQUIRED | `scripts/check-ports.ps1` | Uses `Get-NetTCPConnection` and never kills processes. |
| Corrected stale screen-mode docs from interrupted work | NEEDS_MANUAL_REVIEW cleanup | `docs/architecture/central-node-report.md`, `docs/architecture/master-harmonization-report.md` | Avoids documentation contradicting active `READ_ONLY_DISPLAY` code. |
| Reverted interrupted non-audit implementation edits | SHARED_REQUIRED | active code and docs touched in prior interrupted pass | Restored audit-only scope before discovery and cleanup. |

## No Deletions

No files were deleted.

## No Archives

No files were moved to `src/features/future-modules/_review/` or `archive/_review/` because the duplicate-looking files were still referenced, compatibility shims, optional runtime surfaces, generated artifacts, or future modules.

## Remaining Manual Review Items

- Decide whether `src/layout/AppShell.jsx` tests/helpers should migrate to `src/components/AppShell.tsx`.
- Decide whether `ENABLE_MONGOOSE_EMERGENCY_OS` should stay available for pilot or be retired behind a stronger guard.
- Decide whether broad backend platform modules should remain mounted while frontend is Emergency OS only.
