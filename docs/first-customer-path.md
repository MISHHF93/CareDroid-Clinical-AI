# First Customer Path

## Goal

Determine the minimum sellable Emergency OS that can be piloted by one Emergency Department without requiring hospital-wide deployment.

## Minimum Sellable Emergency OS

The first customer package should include only the capabilities needed to prove ED operating value:

- Patient Journey Engine.
- Queue Intelligence.
- ED Copilot.
- Referral Intelligence.
- EMS Intelligence.
- Analytics.

Everything else is optional for the first pilot. Capacity command, resource boards, escalation automation, simulation scenarios, advanced device telemetry, staffing, governance, and enterprise integrations can be introduced after the Emergency Department sees value from the core operating layer.

## Product Boundary

The minimum Emergency OS should run as a standalone Emergency Workspace inside CareDroid:

- No hospital-wide deployment required.
- No EHR writeback required.
- No autonomous clinical decisions.
- No order placement, admission, discharge, or staffing automation.
- No live integration dependency for the pilot.
- Human review remains mandatory for Copilot, referral, EMS, and journey recommendations.

The pilot can begin with demo/manual data and add read-only integration feeds only when the customer is ready.

## 30-Day Pilot Plan

The first 30 days prove that the Emergency Department can use the OS without enterprise integration work:

- Configure the Emergency demo tenant for the customer workflow.
- Enable Patient Journey Engine states for arrival, triage, waiting, assessment, referral, disposition, admission, and discharge.
- Enable Queue Intelligence for waiting room, triage, provider, referral, admission, discharge, and reassessment queues.
- Enable ED Copilot for complaint-aware guidance, protocol lookup, calculator recommendations, and next-step suggestions.
- Enable Referral Intelligence for consult, transfer, specialty, and follow-up referral visibility.
- Enable EMS Intelligence for incoming arrivals, ETA, handoff status, and offload delay visibility.
- Enable Analytics for adoption, queue pressure, referral delay, EMS offload, and journey throughput.
- Label all demo/manual data clearly and confirm the pilot does not imply live clinical operations.

Success at day 30 means staff can walk through the Emergency OS, understand patient flow, see queue pressure, use Copilot guidance, review referrals and EMS handoffs, and view basic analytics without integrations.

## 60-Day Rollout Plan

Days 31 to 60 turn the pilot into a repeatable department workflow:

- Validate the patient journey with charge nurses, ED physicians, operations leaders, and referral coordinators.
- Replace demo inputs with approved manual or read-only feeds where available.
- Tune queue thresholds, referral delay thresholds, EMS offload targets, and KPI summary windows.
- Create role-specific views for leadership, charge nurse, provider, referral coordinator, and EMS handoff review.
- Establish weekly operating review using Emergency Analytics.
- Document safety boundaries, human review expectations, and source-state labels.
- Identify one or two optional integrations that would reduce manual effort without expanding scope hospital-wide.

Success at day 60 means the Emergency Department has a configured operating view, validated workflows, measurable adoption, and a clear decision on which integrations, if any, should be added next.

## 90-Day Expansion Plan

Days 61 to 90 expand only from proven ED value:

- Add selected read-only integrations such as ADT, encounter feed, referral status, EMS pre-arrival, or bed-management context.
- Add Emergency KPI Layer rollups for Door-to-Doctor, Length of Stay, Boarding Time, EMS Offload, Referral Delay, and Discharge Time.
- Add operational escalation recommendations if capacity, boarding, EMS, or high-risk queue pressure is part of the customer value story.
- Add resource visibility, simulation scenarios, or advanced analytics only when tied to a pilot outcome.
- Prepare a department-level ROI and outcomes review for ED leadership.
- Define the next commercial package: continue ED-only, expand within emergency operations, or connect to hospital operations.

Success at day 90 means the customer can justify continued use or expansion based on ED-specific throughput, coordination, referral, EMS, and analytics value.

## Optional Capabilities

These capabilities should remain optional until the core Emergency OS is proven:

- Resource Board.
- Emergency Escalation Engine.
- Simulation scenarios.
- Capacity command center.
- Boarding command center.
- Device telemetry.
- Staffing pressure automation.
- Governance and enterprise reporting.
- Hospital-wide digital twin.

Optional capabilities should not block the first ED pilot.

## Acceptance Mapping

Acceptance is met when CareDroid can sell and pilot an Emergency Department operating system using Patient Journey Engine, Queue Intelligence, ED Copilot, Referral Intelligence, EMS Intelligence, and Analytics without requiring hospital-wide deployment.
