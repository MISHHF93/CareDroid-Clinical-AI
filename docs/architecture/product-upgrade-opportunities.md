# Product Upgrade Opportunities

Date: 2026-06-14

## Classification Rules

- P0: Blocks pilot demo/runtime correctness, creates a second active system, breaks core route/API access, or presents unsafe clinical operations behavior.
- P1: Safe, high-value pilot/revenue/usability upgrade inside the existing active spine with low blast radius.
- P2: Useful but requires broader product, backend, workflow, data, integration, governance, or visual design decisions.
- P3: Polish, automation, documentation, or longer-term maturity work.

## Opportunity Matrix

| Area | Finding | Priority | Decision |
| --- | --- | --- | --- |
| One active spine | Source and reports confirm `src/main.jsx` -> `src/App.jsx` -> `AppShell` -> `/emergency/*` -> `/api/emergency/*`. | P0 checked | No action needed. |
| AppShell consistency | Shell remains centralized in `src/components/AppShell.tsx`; no second shell or router is active. | P0 checked | No action needed. |
| Whiteboard usability | Current state already promotes capacity, reassessment, near-term EMS, patient card clarity, filters, and responsive grid/list behavior. | P1 checked | No additional safe change needed in this pass. |
| Patient card clarity | Patient cards already include priority strips, risk signals, vitals threshold summaries, larger action targets, and timeline access. | P1 checked | No additional safe change needed in this pass. |
| EMS flow | EMS rows used legacy BP field names only, so current patient vitals shaped as `sbp/dbp` could display as `--/--`. | P1 | Applied vital normalization in `src/components/EMSPipeline.jsx`. |
| Referral flow | Referral clinical summaries passed the whole vitals array into a summary helper expecting an object, so existing latest vitals could be omitted from summaries. | P1 | Applied latest-vitals extraction and key normalization in `src/components/ReferralPanel.jsx`. |
| Analytics clarity | Analytics page already expects daily volume, hourly arrivals, wait trend, and complaint mix arrays; backend-flat/local fallback could leave charts thin or empty. | P1 | Applied chart-ready fallback enrichment in `src/store/emergencyStore.ts`. |
| Backend/frontend contract | Active queue and capacity API inventory rows reused optional analytics/dashboard capability labels. | P1 | Applied capability and inventory alignment in `src/config/backendApiCapabilities.js` and `src/data/frontendApiCallsInventory.js`. |
| Integration/provincial visibility | Existing Integration Hub and Provincial Health backend envelopes did not have visible active Settings status cards. | P1 | Applied status cards in `src/pages/emergency/EmergencySettings.jsx`. |
| Queue intelligence | Queue route computes breached queues and oldest wait, but next-best-queue prioritization needs operating rules. | P2 | Deferred. |
| Smart Intake | Flow preserves human verification and safeguarded fallback, but production identity matching rules need privacy/clinical approval. | P2 | Deferred. |
| Reassessment safety | Reassessment route and drawer exist; escalation policy tuning and SLA thresholds need governance. | P2 | Deferred. |
| Capacity awareness | Capacity page surfaces score, rooms, boarders, recommendations, and review-only forecast harness signals. | P2 | Defer staffing/diversion/policy simulation actions. |
| Boarding awareness | Boarding route shows boarders, longest boarding, and escalation status; inpatient bed-management integration is broader scope. | P2 | Deferred. |
| Copilot usefulness | Copilot uses backend quick actions and safety context; action execution must remain human-reviewed. | P2 | Deferred. |
| Settings quality | Settings surfaces central node, screen modes, thresholds, audit, and governance; broader IA cleanup could affect admin workflows. | P2 | Deferred. |
| Role-based views | Role filtering is centralized, but full role-by-viewport QA should be expanded. | P3 | Deferred. |
| Screen modes | Screen mode settings exist; richer wall-display/role mode explanation is optional. | P3 | Deferred. |
| Alerting/logging/audit | Workflow logs, audit export, governance, and upgrade-harness audit hashes exist; production retention policy needs backend decision. | P2 | Deferred. |
| Demo fixtures | Deterministic fixtures support customer walkthroughs; scenario replay automation is optional. | P3 | Deferred. |
| Error handling | Shared hooks retain local fallback state on API errors; route-level retry controls need UX choices. | P3 | Deferred. |
| Accessibility | Existing status regions and labels are improved from prior pass; a full screen-reader audit remains useful. | P2 | Deferred. |
| Performance | Lazy routes and Suspense are in place; profiling/virtualization changes need measured bottlenecks. | P3 | Deferred. |

## P0 Result

No P0 defect was found. The active product remains one Emergency OS platform with canonical frontend routes and `/api/emergency/*` backend convention.

## P1 Applied

Five safe P1 upgrades were applied: EMS vitals normalization, referral latest-vitals normalization, chart-ready Emergency Analytics fallback enrichment, queue/capacity capability alignment, and Integration/Provincial Health Settings status cards.
