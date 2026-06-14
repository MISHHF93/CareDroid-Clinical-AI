# Revenue Readiness Pressure Test

## Test Method And Persona

Persona: hospital director evaluating CareDroid Emergency OS tomorrow for pilot and revenue readiness.

Method:

- Reviewed active Emergency OS route surface and single AppShell navigation: Whiteboard, Patients, EMS, Intake, Queues, Reassessment, Capacity, Boarding, Referrals, Analytics, Copilot, Settings, command palette, route guards, loading/error/empty states, and active direct routes.
- Prioritized visible director-demo failure modes: unfinished experiences, fake or fixture-backed data that is not clearly labeled, placeholder copy, broken flows, dead buttons, inaccessible actions, misleading labels, and empty states.
- Applied only safe local fixes: copy and disclosure updates that do not change the product architecture, route surface, API surface, central node model, event propagation, alert/escalation model, or domain model.
- Treated likely overlap with parallel workers as report-only unless the fix was tiny and local.

## Prioritized Findings

1. SAFE_FIX_APPLIED, FAKE_DATA_DISCLOSURE_RISK: Smart Intake opens with `SMART_INTAKE_DEMO` fixture fields and match candidates before backend confirmation. The flow was clinically guarded, but a director could read OCR/match data as real. Added an explicit walkthrough-data disclosure and staff-confirmation requirement on `src/pages/emergency/SmartIntake.jsx`.

2. SAFE_FIX_APPLIED, FAKE_DATA_DISCLOSURE_RISK: EMS source copy normalized demo/fallback/local state to "walkthrough dataset" without saying it is not live EMS CAD. Updated `src/components/EMSPipeline.jsx` copy to label local/walkthrough EMS data as not live CAD-backed and improved empty-unit wording.

3. SAFE_FIX_APPLIED, FAKE_DATA_DISCLOSURE_RISK: Referral queues are local Emergency OS workflow records unless backend persistence confirms the transition, but the page did not show a persistent source note. Added source/freshness copy and clarified local workflow status in `src/components/ReferralPanel.jsx`.

4. SAFE_FIX_APPLIED, FAKE_DATA_DISCLOSURE_RISK: Analytics fallback copy could imply connected operational analytics. Updated `src/pages/emergency/EmergencyAnalytics.jsx` to say walkthrough/local analytics are not evidence of live EHR, ADT, EMS CAD, or bed-management integration.

5. SAFE_FIX_APPLIED, EMPTY_STATE_GAP: Shared route-level empty/error copy said local data was shown but did not tell leadership to verify before operational decisions. Updated `src/App.jsx` `ApiStateBanner` and `DataSourceNote` wording for safer director-demo posture.

6. SAFE_FIX_APPLIED, EMPTY_STATE_GAP: Queue Intelligence empty analytics copy was technically accurate but did not explain that rows are derived from active Emergency OS state. Updated `src/components/QueueIntelligencePanel.jsx`.

7. PILOT_DEMO_RISK, MANUAL_REVIEW: Analytics and Settings are retained as direct routes but hidden from pilot visible navigation. This is intentional in `PILOT_CUSTOMER_MODE`, but a director may ask why revenue-critical analytics/settings are not in the sidebar. Decide whether the demo script should open them via command palette/direct URL or keep them out of the primary tour.

8. PILOT_DEMO_RISK, MANUAL_REVIEW: Settings includes "Department Walkthrough Dataset", provincial placeholder records, and AI governance storage that may be fixture-backed. It is labeled in many places, but director-demo scripting should explicitly state which integrations are live, configured, or walkthrough-only.

9. BROKEN_FLOW, PENDING_PARALLEL_WORK: Recent workflow pass moved active referral creation to `POST /api/emergency/referrals`. This pass verified UI ownership at a high level but did not broadly refactor referral/event propagation because parallel workers may be changing alerts, events, data freshness, and API compression.

10. PILOT_DEMO_RISK, PENDING_PARALLEL_WORK: Whiteboard, route handoffs, reassessment scope, and referral write ownership were recently fixed by another pass. This pass did not rework those flows; keep them in smoke-test scope for the director walkthrough.

11. EMPTY_STATE_GAP, MANUAL_REVIEW: EMS, referrals, analytics, reassessment, boarding, and capacity have safer empty-state copy now or already had guarded copy, but no full browser walkthrough was run in this pass. Visual spacing and mobile overflow still need a final demo-device check.

12. DEAD_ACTION, MANUAL_REVIEW: Many buttons are role-gated and disabled with titles. No obvious `href="#"`, empty `onClick`, or alert-driven active Emergency OS action was found in the reviewed surfaces. Continue to test role variants because disabled actions can still feel dead if the user does not know their demo role.

## Fixes Applied

- Added Smart Intake walkthrough-data disclosure explaining that initial extracted fields and match candidates are deterministic product-evaluation data requiring staff confirmation.
- Clarified EMS local/walkthrough data source as not live EMS CAD-backed.
- Clarified referral workflow source/freshness and local workflow status unless backend confirmation is shown.
- Clarified analytics fallback as walkthrough/local data, not proof of live hospital integrations.
- Strengthened shared route empty/error and source notes to direct staff to verify current department state before operational decisions.
- Strengthened Queue Intelligence empty analytics copy to explain the fallback source.

## Remaining Director-Demo Risks

- Revenue blocker risk remains if the demo implies live EHR, ADT, EMS CAD, bed board, referral network, provincial health, or AI governance integrations without proof. Use explicit "walkthrough/local data" language during the demo unless integration credentials and feeds are confirmed.
- Pilot-demo risk remains around hidden direct routes for Analytics and Settings. They are available but not part of the pilot sidebar.
- Manual review remains for role variants. The director should see a role with enough access to create patients, manage referrals, use Copilot, and operate EMS handoff actions, or the script must explain disabled actions.
- Pending parallel work may affect state/event freshness, alerts/escalations, whiteboard dominance, operational metrics, repository simplification, convergence, domain/API compression, and patient journey. Do not treat this pass as a full product certification.

## Pilot And Revenue Readiness Notes

- The active product remains one Emergency OS inside one AppShell and one route surface.
- The safest tomorrow-demo storyline is: Emergency OS can run a standalone pilot with local/manual/walkthrough data, while live integrations deepen fidelity later.
- Avoid claims of autonomous diagnosis, prescribing, disposition, patient matching, external referral completion, or live provincial data retrieval unless verified outside this pass.
- Demo readiness improved for disclosure and empty states, but final revenue confidence still requires an end-to-end browser walkthrough with the intended director role, seeded demo data, and known integration posture.

## Validation Commands And Results

- `npm run lint`: passed.
- `npm run typecheck:frontend`: passed.
- `npx vitest run src/App.permissions.test.jsx src/layout/AppShell.navigation.test.jsx src/pages/emergency/EmergencyAnalytics.operationalAwareness.test.js src/components/QueueIntelligencePanel.test.jsx`: passed, 4 test files and 27 tests.
- `ReadLints` for touched files: no linter errors reported.

Not run:

- Full `npm run validate:ci`, backend tests, and browser E2E. They are broader than the safe copy-only changes and may overlap with active parallel workers.
- Focused tests for `SmartIntake`, `EMSPipeline`, and `ReferralPanel` because no directly matching component tests were present in the active test search; covered by lint/typecheck and route-level tests where available.
