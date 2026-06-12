# Smart Intake Identity Workflow Validation

Validation date: 2026-06-11

## Scope

This validation covers the Smart Intake identity workflow implemented for CareDroid Emergency OS:

- Manual intake evidence
- OCR ingestion for ID cards, referrals, medication lists, allergy lists, and discharge summaries
- Patient matching and duplicate warning output
- Unknown patient creation and reconciliation support
- EMS pre-arrival evidence conversion into an intake session
- Field-level staff verification
- Patient identity audit logging
- Identifier safety
- Biometric-ready architecture disabled by default
- Frontend staff verification review workflow

## Implemented Contracts

Backend shared contracts live in `backend/src/models/SmartIntake.ts`:

- `IntakeSession`
- `IdentityEvidence`
- `PatientMatchCandidate`
- `VerificationDecision`
- `ExtractedDemographics`
- `ExtractedMedication`
- `ExtractedAllergy`
- `DocumentCapture`
- `BiometricConsent`
- `PatientIdentityAuditLog`

The patient schema in `backend/src/models/Patient.ts` now stores business identifiers separately from the database primary key:

- `internal`
- `mrn`
- `health_card`
- `ems_temporary`
- `external_ehr`
- `referral_source`

## API Contract

Mounted when `ENABLE_MONGOOSE_EMERGENCY_OS=true` and `MONGODB_URI` or `DATABASE_MONGO_URI` is configured:

- `POST /api/emergency/intake/sessions`
- `POST /api/emergency/intake/:id/manual-entry`
- `POST /api/emergency/intake/:id/documents`
- `POST /api/emergency/intake/:id/ocr-results`
- `POST /api/emergency/intake/:id/match`
- `POST /api/emergency/intake/:id/verify-field`
- `POST /api/emergency/intake/:id/link-patient`
- `POST /api/emergency/intake/:id/create-patient`
- `POST /api/emergency/intake/:id/continue-unknown`
- `GET /api/emergency/intake/:id/audit-log`

Additional support endpoints:

- `POST /api/emergency/intake/:id/ems-evidence`
- `POST /api/emergency/intake/:id/reconcile-unknown`
- `POST /api/emergency/intake/:id/biometric-consent`
- `POST /api/emergency/intake/:id/biometric-consent/withdraw`

## Workflow Checks

Manual intake:

- Supported by `SmartIntakeService.addManualEntry`.
- Stores input as evidence with purpose label `smart_intake_identity_verification`.
- Does not write directly to verified patient record.

OCR ingestion:

- Supported by `SmartIntakeService.ingestOcrResult`.
- Accepts demographics, medications, allergies, source, and notes.
- Stores extracted fields as unverified evidence.
- Redacts OCR-derived sensitive evidence until staff verification.

Patient matching:

- Implemented by `PatientMatchingService.findCandidates`.
- Uses first name, last name, previous names, date of birth, phone, email, address, MRN, health card, external EHR ID, referral source ID, sex, and identifiers.
- Returns ranked candidates with match score, matched fields, conflicting fields, explanation, and recommended action.
- Never auto-links.

Duplicate warnings:

- High-confidence candidates at `85%` or higher set `duplicateWarning=true`.
- `duplicate_warning_shown` audit entries are generated.
- Creating a new patient is blocked when duplicate warning exists unless manual override is recorded.

Unknown patient workflow:

- `continueUnknown` creates labels such as `Unknown Male`, `Unknown Female`, and `Unknown Patient`.
- Generates a temporary encounter ID.
- Stores an `ems_temporary` identifier.
- Sets `identity_reconciled=false`.
- Preserves audit history and supports later reconciliation.

Field verification:

- `verifyField` requires an explicit `approved`, `rejected`, or `edited` decision.
- Approved and edited values move into `verifiedSnapshot`.
- Critical fields must be reviewed before link/create actions.

Biometric controls:

- Tenant biometric recognition defaults to disabled.
- Consent capture is blocked unless tenant approval and consent are both active.
- Stored data is consent metadata and provider references only.
- No biometric matching is implemented.

Audit logging:

- Supported actions include document upload, OCR extraction, candidate match generation, duplicate warning, field verification, field rejection, field edit, patient linking, patient creation, unknown creation, unknown reconciliation, biometric consent grant/withdrawal, manual override, and EMS evidence.

Frontend:

- `src/pages/emergency/SmartIntake.jsx` implements Start Intake, Capture Inputs, Review OCR, Match Patient, Verify Fields, Create/Link/Unknown Patient, and Send to Triage steps.
- Displays verified, unverified, conflicting, missing, and staff-overridden field labels.
- Shows patient match candidates side by side with extracted vs existing data.

## Remaining Runtime Requirements

- Configure MongoDB and set `ENABLE_MONGOOSE_EMERGENCY_OS=true`.
- Seed realistic patients before exercising duplicate detection end to end.
- Connect final patient creation/link/unknown actions from the frontend buttons to the backend API.
- Connect successful Smart Intake completion to the active Zustand whiteboard store or a future persisted whiteboard API.

## Validation Commands

Run after implementation:

```powershell
cd backend
npm run build
```

Frontend validation:

```powershell
npm run typecheck:frontend
npm run test:run -- src/layout/AppShell.navigation.test.jsx src/routing/canonicalRouteRedirects.test.js
```

## Result

Static implementation validation is expected to pass when the backend build and focused frontend route/navigation checks pass. Full runtime identity validation requires MongoDB-backed Emergency OS runtime configuration.
