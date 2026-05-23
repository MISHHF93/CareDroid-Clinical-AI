# Layout, Scroll, Tools, and Dev Auth Regression Report

## Audit Summary

- `html`, `body`, and `#root` remain document-locked in `src/index.css`; authenticated content continues to scroll through `.app-shell-page-body`.
- `src/layout/AuthShell.css` now provides its own vertical scrollport so long sign-in, OAuth, magic link, and dev/demo auth content is not clipped under the locked root.
- `src/layout/AppShell.css` removes the unsafe fixed `height: 100%` / `max-height: 100%` from the page scrollport and keeps flex children at `min-width: 0`.
- `src/components/Sidebar.css` already keeps desktop and mobile drawer navigation in an independent scroll area with closed-drawer pointer interception disabled.
- `e2e/responsive-qa.helpers.mjs` now validates both horizontal overflow and usable vertical scrollports for responsive QA runs.

## Files Changed Summary

- Layout and shell: `src/layout/AuthShell.css`, `src/layout/AppShell.css`, `src/layout/AppShell.jsx`, `src/App.jsx`
- Auth state and config: `src/contexts/UserContext.jsx`, `src/config/appConfig.js`, `src/pages/Auth.jsx`, `src/pages/Auth.css`, `.env.example`, `backend/.env.example`
- Backend dev-session guard: `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.service.ts`
- Tools UX labels and route matrix: `src/components/Sidebar.jsx`, `src/pages/tools/ToolsOverview.jsx`, `src/data/responsiveQaMatrix.js`, `src/test/responsiveRegression.routes.js`
- Tests and QA helpers: `src/pages/Auth.devBypass.test.jsx`, `src/layout/AppShell.layout.test.js`, `src/components/Sidebar.mobileRender.test.jsx`, `src/components/Sidebar.toolsNavigation.test.js`, `src/pages/tools/ToolsOverview.*.test.*`, `src/test/routePagesSmoke.test.jsx`, `src/test/toolRenderExecuteSmoke.test.jsx`, `e2e/responsive-qa.spec.mjs`, `e2e/responsive-qa.helpers.mjs`, `backend/src/modules/auth/auth.service.spec.ts`

## Dev Auth Bypass Notes

- The sign-in screen shows `Continue in Demo / Local Dev Mode` only when `VITE_ENABLE_DEV_AUTH_BYPASS=true`.
- The bypass routes through the existing `onAuthSuccess(token, user)` path and stores a mock/dev clinician profile marked with `authMode: local-dev-demo` and `isDevAuthBypass: true`.
- The app shell shows a visible `Demo / Local Dev Mode` banner whenever that marked session is active.
- Backend `/api/auth/dev-session` now also requires `ENABLE_DEV_AUTH_BYPASS=true` or `VITE_ENABLE_DEV_AUTH_BYPASS=true`, and still refuses `NODE_ENV=production`.
- Real login, OAuth, 2FA, permission checks, and `AppRoutes.resolveElement` authentication gating were not weakened.

## Test Results

- Cursor diagnostics: no linter errors reported for edited frontend, e2e, and backend files.
- Attempted focused frontend tests with `npx vitest run ...`; blocked because `npx` is not available on PATH.
- Attempted package manager discovery; `npm`, `npx`, `pnpm`, `yarn`, and local `node_modules/.bin/vitest` were unavailable. Only Cursor's bundled `node.exe` was found.

Commands still to run in a development shell with Node/npm installed:

```sh
npm run test:responsive-regression
npm run test:tool-render-smoke
npm run test:run:frontend
npm run lint
npm run build
npm run qa:responsive:chromium
npm run test:e2e:android
cd backend && npm run test -- auth.service.spec.ts && npm run build
```

## Remaining Risks

- Browser-level responsive validation could not be executed in this shell, so final 320px through desktop evidence still depends on running Playwright once package tools are available.
- The dev/demo frontend fallback can intentionally enter the app with a mock token when `VITE_ENABLE_DEV_AUTH_BYPASS=true`; keep that flag unset for real PHI deployments.
- Backend dev-session remains unavailable in production, even if the flag is set, to avoid silently weakening production API authentication.
