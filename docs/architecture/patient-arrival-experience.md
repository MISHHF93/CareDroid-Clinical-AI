# Patient Arrival Experience

## Single-Workflow Checklist

Reception staff should complete the full arrival workflow from one surface (`/emergency/reception`) with minimal navigation.

| Step | Capability | Component / route | Status |
| --- | --- | --- | --- |
| Search patient | MPI / local lookup | `ReceptionWorkspace` hero search | Wired |
| Create patient | Quick demographics + complaint | `QuickIntake.tsx` modal on reception | Wired |
| Scan ID | Document capture | Smart Intake step → `?step=ocr` | Demo / backend when enabled |
| OCR document | Field extraction | `SmartIntake.jsx`, `smartIntakeApi.js` | Demo fixtures; API disabled |
| Verify demographics | Staff field approval | `SmartIntake.jsx` field decisions | Wired |
| Capture allergies | Clinical intake | Intake fixtures reference; `Patient` store `allergies` | Partial — detail panel edit |
| Capture medications | Clinical intake | Intake fixtures reference; `Patient` store `medications` | Partial — detail panel edit |
| Capture referral documents | Document intelligence | `ReferralPanel.jsx`, intake fixtures | Link from work queue |
| Create encounter | Patient record + session | `runSmartIntakeVerticalSlice`, `createSmartIntakePatient` | Wired |
| Assign arrival reason | Chief complaint / category | `QuickIntake.tsx` complaint category | Wired |
| Place patient in queue | Triage queue handoff | `receptionHandoff.ts` + `POST /api/emergency/reception/handoff` | Wired |
| See inbound ambulances | Pre-arrival EMS feed with ETA, vitals, complaint | `EmsPreArrivalPanel.jsx` + `GET /api/emergency/reception/snapshot` | Wired |
| Prepare EMS before arrival | Smart Intake with EMS evidence | `?mode=ems-prearrival&emsArrivalId=` | Wired |
| Register EMS on arrival | Convert inbound unit to registration patient | `convertEMSArrivalToPatient` from reception | Wired (clerk) |

## Workflow Paths

### Path A — Known patient (search)

1. Search by name/MRN on reception
2. Select patient → patient detail panel
3. If new encounter needed → Start Smart Intake with link context

### Path B — Quick arrival (walk-in)

1. Reception → Quick Create
2. Enter demographics, complaint, vitals, priority
3. Submit → `receptionHandoff` → triage queue

### Path C — Document-driven (ID / health card)

1. Reception → Scan / OCR
2. Smart Intake: Capture → Review OCR → Match → Verify
3. Link existing or Create new
4. Finalize → `receptionHandoff` → triage queue

### Path D — Unknown patient

1. Smart Intake → Continue as Unknown Patient
2. Minimal identity → triage queue

### Path E — EMS pre-arrival (ambulance inbound)

1. Reception **Inbound ambulances** panel shows ETA, complaint, severity, and vitals before the unit arrives
2. **Prepare registration** → Smart Intake (`?mode=ems-prearrival&emsArrivalId=`)
3. When the unit arrives → **Register now** converts the EMS card to a registration patient
4. Verify identity → `receptionHandoff` → triage queue → Operations Board

## Patient Journey Alignment

Canonical journey (`src/types/emergency.ts`):

```
Arrival → Registration → Triage → Waiting → Assessment → Orders → Results
  → Disposition → Discharge | Admission
```

### Reception stage mapping

| Reception action | Journey state | Notes |
| --- | --- | --- |
| Patient walks in | `Arrival` | Implicit on landing at reception |
| Identity capture | `Registration` | Smart Intake verification |
| Quick create submit | `Triage` | Skips Registration for speed |
| Smart Intake finalize | `Triage` | Default vertical slice outcome |
| Handoff complete | `Triage` | Visible on whiteboard + queue |

**ASU alignment note:** Quick create intentionally lands in `Triage` to minimize clicks. Full registration path available via Smart Intake when identity verification is required before triage.

## Duplicate Detection

- **UI:** `SmartIntake.jsx` shows match candidates and duplicate warnings from fixtures
- **Backend:** `smart-intake.service.ts` `match()` returns `duplicateWarning` when score ≥ 85
- **Gap:** Frontend uses fixtures until `emergencySmartIntakeIdentitySession` capability enabled

## Allergies and Medications Gap

Smart Intake fixtures include allergy/medication evidence fields for review. Dedicated capture UI on reception is **not** implemented; staff can:

1. Review extracted values in Smart Intake field list (when present in session)
2. Edit via `PatientDetailPanel` after handoff

**Future wiring:** Add optional Smart Intake substeps when backend session includes structured allergy/med arrays.

## Referral Documents

- Upload/ingest referenced in `emergencyIntakeOperatingSystemService.js` document intelligence pipeline
- Active UI: `ReferralPanel.jsx` at `/emergency/referrals`
- Reception work queue links patients with pending referral flags

## Encounter Creation

| Method | API | Store effect |
| --- | --- | --- |
| Quick create | `createSmartIntakePatient` | `addPatient` + backend sync attempt |
| Smart Intake | `runSmartIntakeVerticalSlice` | `hydrateFromApi` full snapshot |
| Local fallback | `addPatient` | In-memory only |

## Queue Handoff Confirmation

After any create path, `completeReceptionHandoff`:

1. Patient `state` = `Triage`
2. `selectPatient(patientId)`
3. `setQueueFilter('triage')`
4. Workflow log: `reception.handoff`
5. Navigate to `/emergency/reception?arrived=<id>` with success banner

Optional: "View on Whiteboard" → `/emergency/whiteboard?patient=<id>`

## Training Reduction Goals

- One landing page for all arrival tasks
- Three clear CTAs (create, intake, scan)
- No whiteboard visit required for registration clerk
- Consistent handoff feedback via arrival query param

## Related

- `reception-first-strategy.md`
- `intake-to-whiteboard-flow.md`
- `reception-screen-design.md`
