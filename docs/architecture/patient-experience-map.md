# Patient Experience Map

Generated: 2026-06-14

## Arrival

Supported by `EMSPipeline`, Smart Intake, Quick Intake, backend `/api/emergency/ems`, and patient fixtures with `PatientState.Arrival`. The whiteboard mission control shows inbound EMS, critical arrivals, capacity status, and Central Intake entry.

## Registration

Supported by `PatientState.Registration`, Smart Intake identity review, MRN/search in patient cards, header patient lookup, and the Patients route. Registration is currently surfaced as a journey state and identity workflow, not as a separate route.

## Smart Intake

Mounted at `/emergency/intake`. It uses extracted field review, candidate matching, duplicate warning, manual confirmation, unknown-patient continuation, and backend vertical-slice creation. Staff remains responsible for link/create decisions.

## Identity Verification

Represented by Smart Intake field decisions, candidate match explanation, provincial health placeholder status, audit log messaging, and Settings integration/provincial connector cards. No autonomous identity merge was added.

## Triage

Represented by `PatientState.Triage`, queue rows, patient card priority bands, CTAS thresholds in settings, and Smart Intake vertical-slice movement from Arrival to Triage.

## Waiting

Visible in Whiteboard filters, Queue route metrics, patient card wait time, long-wait flags, central-node queue health, and header operational summary.

## Reassessment

Visible in `/emergency/reassessment`, the AppShell reassessment drawer, header badge, patient card signals, reassessment workflow logs, and backend `/api/emergency/reassessment`.

## Assessment

Visible as a patient state, Whiteboard filter, Queue route row, patient detail/timeline, Copilot context, and medical tool launch context.

## Orders

Represented as `PatientState.Orders`, queue row, patient timeline event type, and medical tools/Copilot context. There is no separate Orders route; the current implementation keeps orders inside patient workflow context.

## Results

Represented as `PatientState.Results`, queue row, patient timeline event type, patient cards, and analytics/queue visibility.

## Consultation / Referral

Mounted at `/emergency/referrals`. It supports specialty targets including Cardiology, Neurology, Psychiatry, Internal Medicine, Surgery, ICU, Radiology, and Other. Statuses include Draft, Sent, Acknowledged, Accepted, TransferRequested, TransportArranged, PatientDeparted, Declined, and Completed.

## Disposition

Represented by `PatientState.Disposition`, patient cards, capacity discharge pipeline, referral/boarding logic, and the new discharge-ready Queue row.

## Admission Or Discharge

Admission is represented by `PatientState.Admission`, boarding flags, Boarding route, capacity pressure, and central-node boarder metrics. Discharge is represented by `PatientState.Discharge`, discharge workflow actions, and discharge-ready disposition queues.
