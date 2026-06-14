# Product Upgrade Opportunities

Date: 2026-06-14

## Classification Rules

- P0: Blocks pilot demo/runtime correctness, creates a second active system, breaks core route/API access, or presents unsafe clinical operations behavior.
- P1: Safe, high-value pilot/revenue/usability upgrade inside the existing active spine with low blast radius.
- P2: Useful but requires broader product, backend, workflow, data, or visual design decisions.
- P3: Polish, automation, documentation, or longer-term maturity work.

## Opportunity Matrix

| Area | Finding | Priority | Decision |
| --- | --- | --- | --- |
| One active spine | Current reports and source confirm `src/main.jsx` -> `src/App.jsx` -> `AppShell` -> `/emergency/*` -> `/api/emergency/*`. | P0 checked | No action needed. |
| AppShell consistency | Shell remains centralized in `src/components/AppShell.tsx`; no second shell or router is active. | P0 checked | No action needed. |
| Inline route source awareness | Patients, Queues, Reassessment, Capacity, Boarding, and Copilot showed source notes, but did not clearly indicate relative freshness or stale operational data. | P1 | Applied safe shared upgrade in `src/App.jsx`. |
| Loading/empty states | Shared inline route loading and empty containers were visually clear, but not consistently announced as status regions. | P1 | Applied safe accessibility upgrade in `src/App.jsx`. |
| Whiteboard usability | Current state already promotes capacity, reassessment, near-term EMS, and freshness from prior harness work. | P1 checked | No additional safe change needed. |
| Patient card clarity | Current state already includes richer card labels, risk context, vitals threshold summaries, and larger action targets. | P1 checked | No additional safe change needed. |
| Queue intelligence | Queue route computes breached queues and oldest wait, but deeper prioritization and next-best-queue logic would require product rules. | P2 | Deferred. |
| EMS flow | EMS pipeline has role-aware bay prep, conversion, handoff completion, feed fallback, and diversion status messaging. | P2 | Defer deeper live transport integration and dispatch readiness. |
| Smart Intake | Smart Intake preserves human verification and safeguarded fallback, but production identity matching rules need clinical and privacy approval. | P2 | Deferred. |
| Reassessment safety | Reassessment route and drawer exist; escalation policy tuning and configurable SLA thresholds need operational governance. | P2 | Deferred. |
| Capacity awareness | Capacity page surfaces score, room counts, boarders, recommendations, and review-only forecast harness signals. | P2 | Defer policy simulation actions and staffing/diversion workflow changes. |
| Boarding awareness | Boarding route shows boarders, longest boarding, and escalation status; inpatient bed-management integration is broader scope. | P2 | Deferred. |
| Referral flow | Referral panel handles status progression and notes; external specialty/transport integration is broader scope. | P2 | Deferred. |
| Copilot usefulness | Copilot uses backend quick actions and safety context; deeper action execution must remain human-reviewed. | P2 | Deferred. |
| Analytics clarity | Analytics has improved harness and empty states, but customer-facing executive copy/charts need a separate design pass. | P2 | Deferred. |
| Settings quality | Settings surfaces governance/config/audit status; broader settings IA and role-specific copy should be scoped separately. | P2 | Deferred. |
| Role-based views | Role filtering is centralized, but pilot role QA across every viewport should be expanded. | P3 | Deferred. |
| Screen modes | Pilot customer mode hides analytics/settings from visible nav while retaining direct routes; an explicit screen-mode explainer is optional. | P3 | Deferred. |
| Alerting/logging/audit | Workflow logs, audit export, governance, and upgrade-harness audit hashes exist; production audit retention needs backend policy. | P2 | Deferred. |
| Demo fixtures | Current deterministic fixtures support first-customer demos; scenario scripting and replay automation are optional. | P3 | Deferred. |
| Error handling | Shared hooks retain local fallback state on API errors; route-level retry controls would require UX/product choices. | P3 | Deferred. |
| Accessibility | Applied status-region improvements for shared route states; broader screen-reader pass remains useful. | P2 | Partial P1 applied, broader pass deferred. |
| Performance | Lazy routes and shell Suspense are in place; profiling and visual regression are tooling-level next steps. | P3 | Deferred. |

## P0 Result

No P0 defect was found in this pass. The active product remains one Emergency OS platform with canonical frontend routes and `/api/emergency/*` backend convention.

## P1 Applied

The safe P1 applied in this pass improves operational source awareness and accessible status signaling across the shared inline Emergency OS route helpers in `src/App.jsx`.
