# UX Normalization Report

Date: 2026-06-13

## Normalized Pattern

The active Emergency OS pages now follow the existing shell-and-page hierarchy:

- AppShell chrome: sidebar, header title, route outlet, alerts, command palette, user/role controls, and overlays.
- Page title area: each route keeps one content title block inside the route body.
- KPI/status strip: pages with operational metrics expose a compact metric strip or cards.
- Main workspace area: lists, cards, charts, forms, and queues remain inside the page body.
- Empty/loading/error states: visible status or fallback messages are present for route-level loading, backend fallback, empty data, or unavailable data.

## Page Pattern Findings

- Whiteboard: patient-flow cards, filter controls, capacity/status strip, EMS signals, intake launcher, loading skeleton, backend fallback error, and clear empty state.
- Patients: active census metrics and patient cards. Patient cards open the shared detail panel with journey and timeline sections.
- EMS: backend EMS unit status, incoming list, handoff list, offload KPI, pressure score, loading/error/empty states, and disabled-action titles.
- Smart Intake: identity workflow, status/error banners, patient creation, link, unknown patient, and triage actions.
- Queues: queue metrics and queue rows with backend fallback state.
- Reassessment: due/overdue metrics, patient cards, backend fallback state, and empty state.
- Capacity: capacity score, room/boarding metrics, recommendations, backend fallback state, and empty state.
- Boarding: boarding metrics, patient cards, backend fallback state, and empty state.
- Referrals: metrics, referral groups, form workflow, backend sync state, empty state, disabled unavailable patient view.
- Copilot: ED Copilot context, operational metrics, quick actions, and safety disclaimer.
- Analytics: KPIs, chart cards, loading/status messages, and intentional empty chart states.
- Settings: tenant, modules, central node, AI, integration, notification, audit, and threshold sections with loading/error/empty states.

## Styling Alignment

- Active pages continue using Emergency OS dark surfaces, status colors, card borders, pill badges, compact headers, and route-body spacing.
- No duplicate application layout wrappers were added.
- Disabled controls are left visible with role or availability titles where action permission can vary.

## Remaining Manual Review

- Confirm final spacing and chart empty-state proportions in real Chromium rendering.
- Confirm tablet and mobile header truncation with tenant-specific branding strings.
