# Workspace-Aware Experience Implementation Report

## Executive Summary

CareDroid now has a canonical workspace-aware experience that uses backend workspace context as the preferred source of truth for active workspace state. Switching workspace now drives dashboard context, recommendations, AI assistant metadata, visible assets, and shortcuts.

The implementation keeps legacy workspace types compatible while making the requested workspace taxonomy first class:

- Emergency
- ICU
- Cardiology
- Laboratory
- Operations
- Fleet
- Medical IoT
- Education
- Research
- Governance

## Backend Implementation

- Extended `WorkspaceType` with the requested workspace types.
- Added `backend/src/modules/workspaces/workspace-taxonomy.ts` to centralize:
  - workspace labels and descriptions
  - enabled tools and modules
  - assistant context
  - workspace recommendations
  - shortcuts
  - route keys for frontend workspace pages
- Updated `WorkspacesService` to seed and backfill the requested default workspace set.
- Added `WorkspaceContextService` at `backend/src/modules/workspaces/workspace-context.service.ts`.
- Added workspace context endpoints:
  - `GET /api/workspaces/context`
  - `GET /api/workspaces/:workspaceId/context`
- Preserved organization entitlements and workspace enabled-tool filters when resolving visible assets.

## Frontend Implementation

- Updated `WorkspaceContext` to load backend workspace context and retain local fallback behavior.
- Added context fields for:
  - `workspaceContext`
  - `activeWorkspace`
  - `visibleAssetIds`
  - `recommendations`
  - `assistantContext`
  - `shortcuts`
  - `switchWorkspace`
- Updated canonical workspace architecture to the requested workspace list.
- Updated workspace switching in:
  - `WorkspaceSwitcher`
  - `WorkspaceHome`
  - `ToolsOverview`
- Wired active workspace context into:
  - Command Dashboard
  - AI assistant chat requests
  - chat capability suggestions
  - visible tool filtering
  - Quick Command shortcuts

## Behavior By Surface

- Dashboard: shows active workspace, uses workspace-visible assets, and prioritizes workspace shortcuts.
- Recommendations: backend workspace recommendations are exposed through context and used by workspace/tool surfaces.
- AI Assistant: chat requests now include active workspace metadata and assistant context.
- Visible Assets: tool visibility uses workspace visible asset ids when available.
- Shortcuts: Quick Command and workspace pages prioritize active workspace shortcuts.

## Verification

Focused tests were added or updated for:

- Backend workspace context service:
  - `backend/src/modules/workspaces/workspace-context.service.spec.ts`
- Frontend backend-loaded workspace context:
  - `src/test/WorkspaceContext.backend.test.jsx`
- Existing workspace provider and workspace home tests:
  - `src/test/WorkspaceContext.test.jsx`
  - `src/pages/WorkspaceHome.test.jsx`

Executed verification:

```bash
cd backend
npm test -- src/modules/workspaces/workspace-context.service.spec.ts src/modules/workspaces/workspaces.service.spec.ts src/modules/tenant-context/tenant-context.service.spec.ts src/modules/platform-assets/platform-assets.service.spec.ts
npm run build
```

Result: passed. Backend focused tests reported 12 passing tests across 4 suites, and `nest build` completed successfully.

```bash
npm run test:run -- src/test/WorkspaceContext.test.jsx src/test/WorkspaceContext.backend.test.jsx src/pages/WorkspaceHome.test.jsx src/pages/tools/ToolsOverview.visibility.test.jsx src/data/assetAccess.test.js src/App.permissions.test.jsx
```

Result: passed. Frontend focused tests reported 92 passing tests across 6 suites.

## Notes

Legacy backend workspace types such as `personal`, `hospital`, and `admin` remain supported for compatibility. New workspace routing and defaults prefer the requested taxonomy, with legacy `admin` mapped to Governance and legacy `hospital` mapped to Operations for route-level context.
