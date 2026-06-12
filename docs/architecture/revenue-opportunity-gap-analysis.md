# Revenue Opportunity Gap Analysis

Generated: 2026-06-12

Mode: discovery and ranking only. No implementation changes were made.

## Executive Summary

The strongest revenue opportunity is not another AI feature. It is live operational measurement tied to patient flow events.

The current Emergency OS already has the right visible surfaces: whiteboard, queues, EMS, reassessment, capacity, boarding, referrals, Smart Intake, analytics, alerts, and settings. The commercial gap is that hospitals buy outcomes and operational visibility, and the highest-value metrics are not yet durable, backend-backed, and live:

- ED Length of Stay
- Ambulance Offload Time
- Wait To Provider / Physician Initial Assessment
- Wait To Inpatient Bed
- Left Without Being Seen

Quorum / Ontario emergency services indicators specifically measure LWBS, 90th percentile ED LOS, 90th percentile ambulance offload time, 90th percentile wait to inpatient bed, and physician initial assessment. CareDroid should make those metrics live on the Emergency Whiteboard before expanding into speculative feature work.

## Priority Ranking

| Priority | Gap | Why It Matters Commercially | Current Status | Recommended Next Move |
| --- | --- | --- | --- | --- |
| P0 | Canonical backend source of truth for patient flow | A paying pilot cannot rely on local-only whiteboard state. | Partially implemented | Make backend-first patient/event hydration the active source for whiteboard and queues. |
| P0 | Live ED LOS metric | LOS is a core access/flow KPI and board-level operational metric. | Partially implemented | Derive LOS from durable registration/triage/discharge events and show on whiteboard/analytics. |
| P0 | Ambulance offload time | EMS offload is a major operational and revenue/capacity pain point. | Partially implemented | Persist ambulance arrival, handoff start, handoff complete, and offload duration. |
| P0 | Wait to provider / PIA | Wait to initial assessment is a core ED performance measure. | Disconnected | Connect provider-first-seen event to patient journey and show p90/current longest waits. |
| P0 | Wait to inpatient bed | Boarding and admission delays drive hospital purchase decisions. | Missing | Add bed request/wait-start/assigned/in-bed event chain. |
| P0 | LWBS tracking | LWBS is a standard access/flow KPI and patient safety/revenue leakage signal. | Placeholder | Add LWBS action/state, timeline event, metric, and alert threshold. |
| P0 | Backend-backed reassessment safety | Waiting-room deterioration is a pilot safety requirement. | Partially implemented | Persist reassessment flags/reminders/completions and hydrate route/drawer from backend. |
| P0 | Referral status persistence | Consult/transfer workflows are operationally valuable only if status survives refresh/session. | Partially implemented | Add backend status PATCH and hydrate referral board from `GET /api/referrals`. |
| P1 | EMS backend contract normalization | EMS UI is strong, but optional backend routes are not production-aligned. | Partially implemented | Decide backend source, fix EMS status/ETA shape mismatch, connect frontend consumer. |
| P1 | Capacity/occupancy backend feed | Capacity score is visible, but local-only capacity undermines trust. | Partially implemented | Create stable capacity endpoint matching current UI shape. |
| P1 | Boarding duration/risk | Boarding is a hospital spend area; current active route lacks durable timing/risk. | Partially implemented | Add boarding-start timestamp and bed-wait risk model. |
| P1 | Bottleneck detection backend endpoint | Bottleneck UI exists but is local; live bottleneck explanations sell operational value. | Partially implemented | Persist queue counts/events and expose bottleneck endpoint. |
| P1 | Smart Intake backend evidence flow | Intake looks polished but evidence/match/verify panels are fixture-backed. | Partially implemented | Wire manual/OCR/match/verify-field endpoints into visible panels. |
| P1 | Alert persistence and audit | Operational alerts need auditability for clinical settings. | Partially implemented | Persist high-wait, reassessment, EMS, capacity, and boarding alerts. |
| P1 | EHR/FHIR readiness transparency | Buyers need clear integration readiness without overclaiming live connectors. | Placeholder | Keep demo labels, add connector status model before live claims. |
| P2 | Device integration framework | Useful enterprise differentiator but not required for ED pilot revenue. | Disconnected | Keep future-scoped until core ED metrics are live. |
| P2 | Notification framework expansion | Useful for patient/family updates and staff alerts, but needs consent/PHI controls. | Partially implemented | After core metrics, connect notification events with consent and audit. |
| P2 | Boarding risk model | Differentiator once bed request/offload/LOS data is durable. | Partially implemented | Build after bed-wait event model exists. |
| P2 | Operational forecasting | Valuable, but needs historical data first. | Missing from active ED pilot | Do not implement until core event model produces history. |
| P3 | Provincial health connectors | Enterprise roadmap item with high policy/credential complexity. | Missing | Track as future connector program. |
| P3 | Advanced AI prediction modules | Differentiation later, not current pilot blocker. | Mostly missing/future | Defer until operational data quality exists. |

## Revenue Capability Themes

### What CareDroid Can Already Demo

- Active Emergency OS route family under `/emergency/*`.
- Whiteboard with patients, queues, filters, cards, and detail panel.
- Patient journey transitions through triage, waiting, assessment, disposition, discharge.
- EMS pre-arrival/ETA/offload concepts through store-backed UI.
- Reassessment flags, reminders, completion, drawer, and route.
- Capacity score, occupancy grid, boarding section, discharge pipeline.
- Referral request board and local status workflow.
- Smart Intake UI with identity/OCR/matching concepts.
- Alert drawer/toasts and operational banners.

### What A Hospital Will Ask Next

- Is this live from our ADT/EHR/EMS/bed system?
- Can I trust the patient list after refresh?
- Can I see p90 LOS, p90 offload, p90 wait-to-provider, p90 wait-to-bed, and LWBS today?
- Can this identify which patients are creating those metrics?
- Can alerts be audited and reviewed after the shift?
- Can bed management, charge nurse, triage nurse, EMS, and physicians see the same operational truth?

Current answer: the UI is close, but the backend operational truth is not yet complete.

## Scorecard

Weighted capability score uses:

- implemented = 1.00
- partially implemented = 0.50
- disconnected = 0.25
- placeholder = 0.15
- missing = 0.00

| Score | Value | Interpretation |
| --- | ---: | --- |
| Emergency OS Completion | 61% | Active surfaces and workflows exist, but backend/data contracts are not complete. |
| Pilot Customer Readiness | 66% | A guided pilot demo is feasible; backend source-of-truth and live metrics remain pilot risks. |
| Revenue Readiness | 52% | The UI can support sales conversations, but hospital-paid metrics need durable backend chains. |
| Operational Capability Coverage | 43% | Across 47 requested capabilities, most are partial rather than production-complete. |

## P0 Paying Pilot Definition

For a paying pilot, CareDroid should be able to show these live from backend-backed events:

1. Current ED census and active whiteboard.
2. Patients by journey state and queue.
3. Longest wait and p90 wait to provider.
4. ED LOS current average/p90.
5. Ambulance arrivals and p90 offload time.
6. Boarding patients and p90 wait to inpatient bed.
7. LWBS count/rate.
8. Reassessment due/overdue count and patient list.
9. Capacity score with occupancy, admissions, and pending discharge.
10. Referral/consult queue with persistent status.

## Recommended Next Prompt

```txt
Design the backend event model and API contract for CareDroid Emergency OS revenue metrics.

Do not implement yet.

Define the minimum backend entities, events, endpoints, API clients, and UI data contracts required to support:
- ED Length of Stay
- Ambulance Offload Time
- Wait To Provider
- Wait To Inpatient Bed
- LWBS
- Boarding Duration
- Reassessment Due/Completed
- Capacity Score
- Referral Status

For each metric, specify:
- source events
- timestamp fields
- calculation formula
- endpoint response shape
- frontend consumer
- UI location
- audit/privacy considerations
- migration from current store-derived logic

Generate:
docs/architecture/revenue-metrics-data-contract.md
```

## Bottom Line

CareDroid should now harden operational metrics, not add feature breadth. The shortest path to a revenue-ready ED pilot is a backend-backed live whiteboard that proves flow improvement using the metrics ED leaders already report.
