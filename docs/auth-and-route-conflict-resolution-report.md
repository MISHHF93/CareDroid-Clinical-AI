# Auth and Route Conflict Resolution Report

## 1) Auth route inventory

Canonical auth route:
- `/auth`

Auth aliases redirected to `/auth`:
- `/login`
- `/signin`
- `/sign-in`
- `/signup`
- `/sign-up`
- `/register`
- `/account/login`
- `/account/signup`
- `/account/register`
- `/accounts/login`
- `/accounts/signup`

Auth callbacks:
- Canonical callback: `/auth-callback`
- Legacy callback redirect: `/auth/callback` -> `/auth-callback`

## 2) Root cause of `/auth` lock-in

The app considered users authenticated only when both token and profile existed (`authToken && user`).
On standard login flows, token may be set before profile hydration finishes. During that window, protected routes interpreted the session as unauthenticated and redirected back to `/auth`, creating a loop-like lock-in behavior.

## 3) Canonical auth route chosen

- Canonical route remains `/auth`.
- All login/signin/signup aliases redirect to `/auth`.
- Signup aliases automatically append `?mode=signup` when no mode is provided.

## 4) Redirects added/confirmed

Auth:
- Alias paths -> `/auth`
- `/auth/callback` -> `/auth-callback`

Home/dashboard/chat:
- `/dashboard` -> `/home` -> `/assistant`
- `/chat`, `/ai`, `/copilot` -> `/assistant`

Tools:
- `/all-tools`, `/clinical-tools` -> `/tools`
- `/catalog` -> `/tools/catalog`

Fleet/operations:
- `/fleet` -> `/operations`

## 5) Dev/demo bypass behavior

- Button label: **Continue in Demo / Local Dev Mode**.
- Visible on `/auth` and `/` only when `VITE_ENABLE_DEV_AUTH_BYPASS=true`.
- Hidden when flag is false/absent.
- Demo entry routes to `/tools`.
- App shell displays a persistent demo-mode banner while the bypass session is active.

## 6) General duplicate route findings

- Assistant surface is canonical at `/assistant`; legacy chat/AI aliases redirect there.
- Tools discovery uses `/tools` with assistant drawer launch behavior.
- Developer/source audit remains isolated under `/tools/catalog`.
- Fleet area retains specific feature routes (`/fleet/command`, `/fleet/route-optimizer`, `/fleet/predictive-maintenance`) with `/fleet` normalized to `/operations`.

## 7) Canonical route map

- Auth: `/auth`
- App assistant home: `/assistant`
- Tools browser launch: `/tools`
- Calculator filtered launch: `/tools/calculators`
- Developer catalog/source audit: `/tools/catalog`
- Operations: `/operations`
- Fleet feature pages: `/fleet/command`, `/fleet/route-optimizer`, `/fleet/predictive-maintenance`

## 8) Links updated

- Post-auth success navigation now lands at `/tools` (instead of `/home`) for consistent tool-access entry.

## 9) Tests added/updated

- Updated route canonicalization expectations to match `/tools` assistant-launch strategy.
- Added explicit check that auth aliases normalize to `/auth`.

## 10) Remaining risks

- Permission-gated `/tools/catalog` remains intentionally restricted and may redirect authorized users differently depending on role.
- Any future direct links to non-canonical paths should be added to redirect inventories (`AUTH_PATH_ALIASES`, legacy route arrays) to avoid drift.
