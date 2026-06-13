# Emergency OS Role-Based View Validation

## Scope

This implementation uses the existing open-access `UserContext` and its mutable `user.role`. It does not add a new authentication provider, login flow, token model, or backend authorization layer.

The active role permission source is `src/config/emergencyRolePermissions.js`. UI consumers use `src/hooks/useEmergencyRolePermissions.js`, which reads and updates the current role through `useUser()`.

## Role Matrix

| Role | Primary Pages | Key Allowed Actions | Explicit Boundaries |
| --- | --- | --- | --- |
| Admin | All Emergency OS pages, settings, AI governance, simulation, federated learning, digital twin | All Emergency OS actions | None in the frontend demo matrix |
| ED Manager | Whiteboard, patients, journey, EMS, queues, reassessment, capacity, boarding, referrals, integrations, copilot, analytics, simulation, digital twin, tools | Flow transitions, staff/room assignment, referrals/transfers, capacity/boarding operations, workload rebalance, copilot, analytics, simulation/twin actions | No settings or federated-learning administration |
| Charge Nurse | Whiteboard, patients, journey, EMS, queues, reassessment, capacity, boarding, referrals, integrations, copilot, analytics, tools | Patient creation, triage, state movement, vitals/notes/flags, assignments, escalation, EMS handoff, referrals/transfers, workload rebalance | No settings, simulation, federated learning, or digital twin |
| Triage Nurse | Whiteboard, patients, journey, EMS, Smart Intake, queues, reassessment, copilot, tools | Patient creation, Smart Intake verification, triage, state movement, vitals/notes/flags, escalation, EMS handoff | No referrals/transfers, capacity admin, analytics, or settings |
| Physician | Clinical patient views, reassessment, referrals, provincial health, tools, copilot, analytics, AI governance | State movement, vitals/notes/flags, escalation, discharge, referrals/transfers, copilot, analytics, AI governance view | No intake creation, EMS handoff, settings, or operations simulation actions |
| Registration Clerk | Whiteboard, patients, Smart Intake, queues, provincial health | Patient creation and Smart Intake verification | No clinical state changes, flags, referrals, EMS handoff, analytics, or settings |
| EMS User | EMS, whiteboard, patients, capacity | Bay preparation, arrival conversion, handoff completion, patient creation from EMS | No Smart Intake, referrals, settings, analytics, or clinical state management |
| Read-Only Viewer | Whiteboard, patients, journey, EMS, queues, reassessment, capacity, boarding, referrals, analytics | Analytics view only | No mutating Emergency OS actions |

## Frontend Wiring

- `src/config/emergencyRolePermissions.js` defines role ids, labels, route visibility, action ids, action permissions, default routes, role aliases, and pure permission helpers.
- `src/hooks/useEmergencyRolePermissions.js` adapts the matrix to the current `UserContext` user and exposes `can()`, `canAccessRoute()`, `nearestRoute()`, and `switchDemoRole()`.
- `src/contexts/UserContext.jsx` now includes the Emergency OS role ids in the existing role-permission map so older `hasPermission()` consumers remain compatible.
- `src/components/Header.tsx` adds a small local demo role selector backed by `setUser()`.
- `src/components/Sidebar.tsx` filters Emergency OS rail items by route access.
- `src/components/CommandPalette.jsx` filters route commands, mutating commands, dynamic patient commands, referral commands, flag commands, calculators, and stale recents by role.

## Route Behavior

Emergency OS routes in `src/App.jsx` are wrapped in `EmergencyRouteGuard`.

Unauthorized pages render an access-denied panel with the active role label and a link to the role’s nearest permitted Emergency OS page. `/` and `/emergency` route to the role default page. Existing legacy redirects remain intact and land on guarded canonical routes.

## Action Gates

Implemented high-impact action gates:

- Whiteboard quick intake button and `n` hotkey.
- Quick Intake direct submit.
- Smart Intake session start, identity decisions, link/create/unknown patient final actions.
- Patient detail state transition, vitals, notes, flags, staff assignment, room assignment, escalation, and discharge.
- EMS pipeline bay preparation, EMS conversion, handoff completion, and auto-convert.
- Critical EMS broadcast checklist/prep and add-to-whiteboard shortcuts.
- Referral/transfer creation and status progression.
- Header capacity navigation and workload reassignment.
- ED Copilot panel rendering.
- Simulation, federated learning, and digital twin action buttons.

## Validation Commands

Focused test:

```bash
npm run test:run -- src/config/emergencyRolePermissions.test.js
```

Requested broader checks:

```bash
npm run typecheck:frontend
npm run lint
npm run build
```

## Boundaries

This is frontend role-based view control for local/demo Emergency OS behavior. It is not a backend authorization layer and does not protect API endpoints by itself. Any production enforcement still needs server-side authorization using the same role/action concepts.

The matrix is intentionally compact. It gates the active Emergency OS shell, routes, command palette, and highest-impact mutating actions without rewriting the app’s authentication or data model.
