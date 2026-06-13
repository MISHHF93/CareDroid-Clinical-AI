# R7 Type Consolidation Report

## Scope

Executed R7 for frontend Emergency OS type consolidation. Canonical frontend type target is `src/types/emergency.ts`.

Backend persistence/auth/subscription schemas were inspected because they appeared in `DUPLICATE_MAP.md` Search 5, but were not merged into frontend code. They remain backend-owned models.

## Type Files Inspected

### `src/types/emergency.ts`

Canonical frontend target. Before R7 it defined:

- Enums: `PatientState`, `Priority`, `PatientFlag`
- Interfaces: `Vitals`, `Patient`, `Staff`, `Room`, `Note`, `JourneyEvent`, `WorkflowActionLog`, `Alert`, `CapacitySnapshot`, `ActiveShift`, `EmsUnit`, `Referral`, `ReassessmentReminder`
- Types/functions: `LegacyPriority`, `normalizePriority`, `WorkflowActionType`, `WorkflowActionSeverity`, `WorkflowActionStatus`, `EmergencyFeatureFlags`

After R7 it now also owns the merged frontend Emergency OS type surface:

- Identity/date aliases: `EntityId`, `ISODateString`, `LocalDateString`
- Priority helpers: `PriorityLabel`, `PatientPriority`, `legacyPriorityToEnum`
- Flag compatibility: `PatientFlagType`, `PatientFlagSeverity`, `PatientFlagRecord`
- Patient/person helpers: `Sex`, `VitalValue`, `PatientVitals`
- Journey/note/referral/EMS types: `JourneyEventType`, `NoteType`, `ReferralStatus`, `ReferralDepartment`, `ReferralUrgency`, `EMSArrivalStatus`, `EMSSeverity`, `CriticalChecklistType`, `CriticalChecklistCompletion`, `CriticalChecklistRecord`, `EMSArrival`
- Staff/room/shift/unit types: `StaffRole`, `StaffStatus`, `StaffMember`, `StaffWorkload`, `RoomType`, `RoomStatus`, `ShiftStatus`, `Shift`, `EMSUnitStatus`, `EMSUnit`
- Queue/capacity/alert types: `AlertSeverity`, `AlertType`, `QueueType`, `Queue`, `BottleneckSeverity`, `BottleneckAlert`, `CapacityScore`, `CapacityRiskLevel`, `CapacityBand`, `CapacityStatusLabel`, `CapacityScoreDeduction`
- Reassessment/vitals helpers: `ReassessmentReminderStatus`, `VitalsAlertSeverity`, `VitalsAlertStatus`, `VitalsAlert`, `ReassessmentQueueItem`, `WhiteboardFilter`, `PatientJourneyAuditEvent`

### `types/emergency.ts`

Duplicate root frontend type file. Before R7 it defined:

- Types: `EntityId`, `ISODateString`, `LocalDateString`, `PatientPriority`, `PatientFlagType`, `PatientFlagSeverity`, `Sex`, `VitalValue`, `PatientVitals`, `JourneyEventType`, `WorkflowActionType`, `WorkflowActionSeverity`, `WorkflowActionStatus`, `NoteType`, `ReferralStatus`, `ReferralDepartment`, `ReferralUrgency`, `EMSArrivalStatus`, `EMSSeverity`, `CriticalChecklistType`, `QueueType`, `BottleneckSeverity`, `AlertSeverity`, `AlertType`, `ReassessmentReminderStatus`, `VitalsAlertSeverity`, `VitalsAlertStatus`, `StaffRole`, `StaffStatus`, `StaffMember`, `RoomType`, `RoomStatus`, `ShiftStatus`, `EMSUnitStatus`, `CapacityScore`, `CapacityRiskLevel`, `CapacityStatusLabel`
- Enums/constants: `PatientState`, `Priority`, `PriorityLabel`, `QueueType`, `CapacityScore`
- Interfaces: `PatientFlag`, `Vitals`, `JourneyEvent`, `WorkflowActionLog`, `Note`, `Referral`, `CriticalChecklistCompletion`, `CriticalChecklistRecord`, `EMSArrival`, `Patient`, `Queue`, `BottleneckAlert`, `Alert`, `ReassessmentReminder`, `VitalsAlert`, `Staff`, `StaffWorkload`, `Room`, `Shift`, `EMSUnit`, `CapacityScoreDeduction`, `CapacitySnapshot`, `ReassessmentQueueItem`, `WhiteboardFilter`, `PatientJourneyAuditEvent`

Decision: converted to a thin compatibility shim:

```ts
export * from '../src/types/emergency';
```

Reason: non-`src` legacy files still import `types/emergency.ts`, and deleting it outright would broaden R7 beyond frontend import consolidation.

### `backend/src/models/unified-patient.model.ts`

Backend Mongoose persistence model. It defines:

- Types: `Gender`, `CodeStatus`, `TriageAcuityCode`, `JourneyState`, `DPSScore`, `EMSStatus`, `BoardingStatus`, `ProtocolStatus`, `DeteriorationRiskCategory`, `TriageColor`, `AIReviewStatus`, `SafetySeverity`
- Interfaces: `IEmergencyContact`, `IPatientIdentifier`, `IClinicalMedication`, `IClinicalAllergy`, `IVitalSigns`, `ITriageData`, `IStateHistoryEntry`, `IDPSHistoryEntry`, `IBedRequest`, `IBedAssignment`, `ITriggeredProtocol`, `IDeteriorationPrediction`, `IWearableVitalEntry`, `IContinuousVitals`, `IFallDetection`, `IVirtualCare`, `IAIRecommendation`, `ISafetyAlert`, `IMergeTracking`, `IUnifiedPatient`

Decision: kept separate. Frontend components should not import backend persistence schemas.

### `backend/src/modules/users/entities/user.entity.ts`

Backend auth entity. It defines:

- Enum: `UserRole`
- Class: `User`

Decision: kept separate. `User` remains auth-only; Emergency OS UI staff typing is represented by `Staff`.

### `backend/src/modules/subscriptions/entities/subscription.entity.ts`

Backend subscription entity. It defines:

- Enums: `SubscriptionTier`, `SubscriptionStatus`
- Class: `Subscription`

Decision: kept separate. Subscription lifecycle status is not Emergency OS patient state.

## Merge Decisions

- `Patient`: `src/types/emergency.ts` naming wins. Canonical patient state remains `state: PatientState`; no frontend canonical `Patient.status` was added. Root-only fields such as `name`, `location`, `complaint`, `lastAssessedTime`, `currentVitals`, `vitalsUpdatedAt`, `assignedTo`, `vitalsAlerts`, `emsArrival`, and `criticalChecklist` were merged as optional fields.
- `Case`: no active frontend `Case` type definition was found in the audited frontend Emergency OS type files. No rename was needed.
- `User` vs `Staff`: backend `User` stays auth-only. Frontend Emergency OS personnel use the canonical `Staff` interface with merged identity, role, assignment, and status fields.
- `Priority`: canonical `Priority.P1` through `Priority.P5` remains the only Emergency OS priority enum. `legacyPriorityToEnum(p: string): Priority` was added with `high -> P2`, `medium -> P3`, and default `P4`.
- `PatientFlag`: active frontend components use `PatientFlag.HighRisk` enum values, so the enum remains canonical. The root object-shaped flag was preserved as `PatientFlagRecord` to avoid breaking enum consumers.
- `Vitals`: active frontend patient records use `vitals: Vitals[]`. Root current-vitals semantics were merged as `currentVitals?: Vitals | null` and legacy vital property names were added to `Vitals`.
- `Status/State`: patient workflow uses `PatientState`. Backend subscription/user status and backend patient journey persistence states were not merged into frontend patient state.

## Import Updates

Updated `src` imports that previously climbed out to the root duplicate `types/emergency.ts`, including component, utility, service, data, and focused test files. Files already resolving to `src/types/emergency.ts` were left unchanged.

The required residual import search was run:

```text
rg "from\s+['\"][^'\"]*(patient\.types|case\.d|models|schema)[^'\"]*['\"]" src
```

Result: no matches.

## Compatibility Decisions

- Converted `types/emergency.ts` into a compatibility re-export instead of deleting it, because root-level `engine`, `lib`, `store`, and config/test files still import it.
- Updated `lib/ai/toolRegistry.ts` to normalize legacy object-shaped flag records into canonical enum/string flag values at the store boundary.
- Updated nullable assignment/timestamp handling in `src/components/PatientDetailPanel.tsx` and `src/store/emergencyStore.ts` after merging optional/null fields.

## Verification

Passed:

```text
npx tsc --noEmit
npm run typecheck:frontend
```

Focused tests run:

```text
npx vitest run src/utils/patientTimeline.test.ts src/components/PatientCard.clinicalIntelligence.test.jsx src/components/EmergencyWhiteboard.storeReactivity.test.jsx src/components/NewPatientIntake.test.jsx src/components/WorkloadBalancePanel.test.jsx src/utils/whoNext.test.js src/utils/crisisMode.test.js src/utils/staffManagement.test.js src/services/CapacityIntelligence.test.js src/services/PatientJourneyEngine.test.js src/services/ReassessmentEngine.test.js src/components/PediatricDrugCalculator.test.jsx src/components/EMSCriticalBroadcast.test.jsx
```

Result: 11 files passed, 2 files failed, 34 tests passed, 3 tests failed.

Failures observed:

- `src/components/EMSCriticalBroadcast.test.jsx`: `useEmergencyStore.getState(...).addEMSArrival is not a function`
- `src/components/NewPatientIntake.test.jsx`: reassessment queue assertion failed; unhandled `setQueueFilter is not a function`

These failures are runtime store API/test fixture gaps and were not introduced by type import resolution. TypeScript verification passed after R7.

## Remaining Risks

- `types/emergency.ts` remains as a compatibility shim, so the canonical definitions are in one file but a compatibility import path still exists for non-`src` legacy consumers.
- Focused component tests still expose missing runtime store APIs unrelated to the type merge.
- Backend patient/user/subscription schemas remain separate by design; future shared API contracts should map backend DTOs into `src/types/emergency.ts` rather than importing backend schema/model types into frontend code.
