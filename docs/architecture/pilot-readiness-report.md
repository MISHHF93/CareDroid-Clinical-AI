# Pilot Readiness Report

Date: 2026-06-14

## Demo Path

The active pilot path is:

1. Open `/emergency/whiteboard`.
2. Create a patient through Smart Intake/Central Intake.
3. Verify identity and send to triage.
4. Move through queue and reassessment workflows.
5. Create a referral/consult request.
6. Move to disposition and discharge through human-reviewed actions.
7. Review operational analytics.
8. Review Advanced Upgrade Harness signals in Capacity, Whiteboard status chips, Patient Detail, Copilot, and Analytics.

This path is covered by `src/test/pilotWalkthrough.test.jsx`.

## Pilot-Ready Areas

- One active Emergency OS AppShell and route surface.
- Central node rendered in the header and whiteboard command view.
- Persistent command palette launcher via Ctrl/Cmd+K and header search.
- Patient cards open the shared patient detail panel instead of navigating away.
- Backend `/api/emergency/*` module envelopes hydrate the store with local fallback.
- AI outputs are labeled decision support and require human review.
- Advanced upgrade outputs are deterministic pilot harness signals with provenance, confidence, safety status, human-review messaging, and audit metadata.
- External Azure, Hyperledger, Zoom/WebRTC, BLE, and cloud-provider dependencies remain provider abstractions only.

## Known Pilot Risks

Data is fixture/in-memory backed. Production persistence, live FHIR/provincial/device connectors, real AI provider availability, telehealth rooms, BLE gateways, secure federated aggregation, immutable ledger infrastructure, and migration execution require environment approval before customer deployment.
