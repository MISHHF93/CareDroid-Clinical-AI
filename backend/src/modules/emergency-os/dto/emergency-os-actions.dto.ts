import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Cycle 249: input validation for 23 of EmergencyOsController's 27
 * unvalidated @Body() routes (of the 27, patient-creation -- createPatient/
 * createIntakePatient/createSmartIntakeVerticalSlice -- stays deferred per
 * roadmap item #18's own established caution since Cycle 191, and
 * updateSettings stays deferred because EmergencyOsSettingsPatch is a large
 * mapped type over a ~12-section nested settings contract deserving its own
 * dedicated DTO-building cycle, not a drive-by here). Every DTO below
 * mirrors a field set the backend had already declared precisely as an
 * interface/inline-object-literal type -- these were never "wide open,"
 * just unenforced -- and where a real frontend caller exists, its actual
 * payload was checked field-by-field before locking down
 * forbidNonWhitelisted so no currently-working request would start 400ing.
 * That sweep found 2 real mismatches, both handled by adding the field
 * rather than rejecting real traffic: postReceptionHandoff's real caller
 * sends `queue` (not in the backend's declared type; the service ignores
 * it either way); createReferral's real caller sends `createdAt` alongside
 * `requestedAt` (the service always stamps its own createdAt regardless).
 * queryCopilot has no live frontend caller at all today -- locked down to
 * the backend's already-declared shape with no regression risk either way.
 */

export class EvaluateOperationalIntelligenceDto {
  @IsOptional() @IsArray() events?: unknown[];
}

/** Mirrors ExtractDocumentArtifactsInput (src/types/patientDocumentArtifact.ts).
 * `patientId` is optional here even though the shared type declares it
 * required -- the controller always overrides it with the :patientId path
 * param before calling the service, so the body's own value is redundant
 * (and the real frontend caller, patientDocumentArtifactApi.ts, does send
 * it, so making it optional here doesn't reject that call either way). */
export class ExtractDocumentArtifactsDto {
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(96) encounterId?: string;
  @IsOptional() @IsString() @MaxLength(96) sourceDocumentId?: string;
  @IsString() @MaxLength(120) documentType: string;
  @IsIn([
    'uploaded_document',
    'referral_note',
    'ems_report',
    'triage_note',
    'discharge_summary',
    'lab_document',
    'scanned_note',
    'staff_paste',
    'patient_record',
    'copilot_synthesis',
  ])
  sourceType:
    | 'uploaded_document'
    | 'referral_note'
    | 'ems_report'
    | 'triage_note'
    | 'discharge_summary'
    | 'lab_document'
    | 'scanned_note'
    | 'staff_paste'
    | 'patient_record'
    | 'copilot_synthesis';
  @IsOptional() @IsString() @MaxLength(120) sourceSystem?: string;
  @IsString() rawText: string;
  @IsOptional() @IsString() @MaxLength(80) parser?: string;
  @IsOptional() @IsString() @MaxLength(255) filename?: string;
  @IsOptional() @IsNumber() confidence?: number;
  @IsOptional() @IsString() @MaxLength(120) extractedBy?: string;
  @IsOptional() @IsString() @MaxLength(120) modelVersion?: string;
  @IsOptional()
  @IsIn(['live', 'demo', 'simulated', 'extracted', 'staff_entered'])
  sourceState?: 'live' | 'demo' | 'simulated' | 'extracted' | 'staff_entered';
  @IsOptional() @IsBoolean() isAiDerived?: boolean;
}

/** Mirrors PatientDocumentArtifactReviewInput. */
export class PatientDocumentArtifactReviewDto {
  @IsString() @MaxLength(96) artifactId: string;
  @IsIn(['pending_human_review', 'accepted', 'rejected', 'needs_clarification'])
  reviewStatus: 'pending_human_review' | 'accepted' | 'rejected' | 'needs_clarification';
  @IsOptional()
  @IsIn(['confirmed', 'suggested', 'refuted', 'superseded'])
  clinicalStatus?: 'confirmed' | 'suggested' | 'refuted' | 'superseded';
  @IsOptional() @IsString() @MaxLength(120) reviewer?: string;
  @IsOptional() @IsString() @MaxLength(2000) reviewNote?: string;
}

/** Mirrors CreateOcrJobInput (ocr-intake.types.ts). `dataUrl` has no
 * MaxLength -- it carries a base64-encoded scanned-document image. */
export class CreateOcrJobDto {
  @IsOptional() @IsString() @MaxLength(255) filename?: string;
  @IsOptional() @IsString() @MaxLength(120) mimeType?: string;
  @IsOptional() @IsString() dataUrl?: string;
  @IsOptional() @IsString() rawText?: string;
  @IsOptional() @IsString() @MaxLength(120) documentTypeHint?: string;
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(96) intakeSessionId?: string;
  @IsOptional() @IsString() @MaxLength(96) intakeDraftId?: string;
  @IsOptional() @IsString() @MaxLength(120) actor?: string;
}

/** Mirrors OcrFieldReviewInput. */
export class OcrFieldReviewDto {
  @IsIn(['accepted', 'edited', 'rejected']) decision: 'accepted' | 'edited' | 'rejected';
  @IsOptional() @IsString() editedValue?: string;
  @IsOptional() @IsString() @MaxLength(120) actor?: string;
}

export class ApplyOcrJobToIntakeDto {
  @IsOptional() @IsString() @MaxLength(120) actor?: string;
  @IsOptional() @IsBoolean() autoAcceptHighConfidence?: boolean;
}

// --- EMS / reception / triage / workflow / referral / copilot -----------
// A frontend sweep confirmed real callers for 12 of these 13 routes (all
// except queryCopilot, which has no live caller at all today). Every real
// caller's sent fields were checked field-by-field against the shape
// below; 2 real mismatches were found and are called out per-field.

export class PostEmsHandoffDto {
  @IsOptional() @IsString() @MaxLength(96) arrivalId?: string;
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(120) actorName?: string;
  @IsOptional() @IsString() @MaxLength(96) unitId?: string;
  @IsOptional() @IsString() @MaxLength(120) unitName?: string;
  @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @IsOptional() @IsString() handoffAcceptedAt?: string;
  @IsOptional() @IsString() handoffStartedAt?: string;
  @IsOptional() @IsString() arrivedAt?: string;
  @IsOptional() @IsObject() checklist?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class PostReceptionEscalationDto {
  @IsOptional() @IsString() @MaxLength(96) reasonId?: string;
  @IsOptional() @IsString() @MaxLength(200) reasonLabel?: string;
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(2000) detail?: string;
  @IsOptional() @IsString() @MaxLength(120) actorName?: string;
  @IsOptional() @IsString() @MaxLength(96) actorStaffId?: string;
  @IsOptional() @IsIn(['Info', 'Warning', 'Critical']) severity?: 'Info' | 'Warning' | 'Critical';
  @IsOptional()
  @IsArray()
  @IsIn(['triage', 'charge'], { each: true })
  notifyTargets?: Array<'triage' | 'charge'>;
}

/** `queue` isn't in this route's originally-declared inline type, but the
 * real caller (receptionHandoff.ts) sends it and the backend service
 * already silently ignores it -- added here purely so a currently-working
 * request doesn't start 400ing once forbidNonWhitelisted takes effect. */
export class PostReceptionHandoffDto {
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(120) source?: string;
  @IsOptional() @IsString() @MaxLength(120) actorName?: string;
  @IsOptional() @IsString() @MaxLength(96) encounterId?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) arrivalReason?: string;
  @IsOptional() @IsString() @MaxLength(200) complaintCategory?: string;
  @IsOptional() @IsString() @MaxLength(2000) verificationSummary?: string;
  @IsOptional() @IsString() @MaxLength(120) queue?: string;
  @IsOptional() triageAssist?: unknown;
  @IsOptional() @IsString() triageAssistGeneratedAt?: string;
}

export class PostTriageAssistDto {
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(2000) arrivalReason?: string;
  @IsOptional() @IsString() @MaxLength(200) complaintCategory?: string;
  @IsOptional() @IsString() @MaxLength(96) encounterId?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) verificationSummary?: string;
}

/** Mirrors ReviewAdministrativeAutomationInput. */
export class ReviewWorkflowAutomationDto {
  @IsDefined() @IsString() @MaxLength(96) taskId: string;
  @IsIn(['approve', 'modify', 'override', 'dismiss'])
  decision: 'approve' | 'modify' | 'override' | 'dismiss';
  @IsDefined() @IsString() @MaxLength(96) actorStaffId: string;
  @IsOptional() @IsString() @MaxLength(120) actorName?: string;
  @IsOptional() @IsString() @MaxLength(2000) modifiedAction?: string;
  @IsOptional() @IsString() @MaxLength(2000) overrideReason?: string;
  @IsOptional() @IsBoolean() executeOnApprove?: boolean;
}

/** Mirrors ReferralService.createReferral()'s real field reads (a
 * Record<string, unknown> today with every field extracted via
 * `String(input.x || default)`). `createdAt` isn't read by the service
 * (it always stamps its own createdAt server-side) but the real caller
 * (ReferralPanel.tsx) sends it alongside `requestedAt` as a distinct
 * field -- included so that request doesn't start 400ing. */
export class CreateReferralDto {
  @IsOptional() @IsString() @MaxLength(96) id?: string;
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(96) requestingStaffId?: string;
  @IsOptional() @IsString() @MaxLength(120) targetDepartment?: string;
  @IsOptional() @IsString() @MaxLength(120) specialty?: string;
  @IsOptional() @IsString() @MaxLength(40) urgency?: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @IsOptional() @IsString() @MaxLength(2000) clinicalSummary?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsString() @MaxLength(80) workflow?: string;
  @IsOptional() @IsString() requestedAt?: string;
  @IsOptional() @IsString() createdAt?: string;
}

/** No live frontend caller exists for this route today (confirmed by
 * sweep) -- formalizes the backend's already-declared inline shape. */
export class QueryCopilotDto {
  @IsOptional() @IsString() @MaxLength(4000) query?: string;
  @IsOptional() @IsString() @MaxLength(40) user_role?: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

/** Mirrors RecordClinicalCalculatorDto (clinical-decision-support.types.ts). */
export class RecordClinicalCalculatorResultDto {
  @IsIn(['qsofa', 'heart', 'wells-pe', 'gcs', 'news2', 'nihss'])
  calculatorId: 'qsofa' | 'heart' | 'wells-pe' | 'gcs' | 'news2' | 'nihss';
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(96) encounterId?: string;
  @IsDefined() @IsObject() inputs: Record<string, unknown>;
  @IsDefined() score: number | string | null;
  @IsDefined() @IsString() @MaxLength(80) riskCategory: string;
  @IsDefined() @IsString() @MaxLength(2000) interpretation: string;
  @IsDefined() @IsString() @MaxLength(500) disclaimer: string;
  @IsDefined() @IsString() @MaxLength(500) referenceLine: string;
}

/** Mirrors RecordCopilotInteractionDto (clinical-decision-support.types.ts). */
export class RecordCopilotInteractionDto {
  @IsDefined() @IsString() @MaxLength(4000) question: string;
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(96) encounterId?: string;
  @IsOptional() @IsString() @MaxLength(40) userRole?: string;
  @IsOptional() @IsString() @MaxLength(4000) patientContextSummary?: string;
  @IsDefined() @IsString() @MaxLength(8000) draftGuidance: string;
  @IsOptional() @IsBoolean() requiresHumanReview?: boolean;
  @IsOptional() @IsBoolean() safetyCheckPassed?: boolean;
}

// --- Simulation / federated learning / digital twin ---------------------
// Confirmed via a frontend sweep: none of the 8 routes below have a real
// caller anywhere in src/ (emergencyOsApi.ts's wrapper functions exist but
// are never invoked from any page/component/store) -- so, unlike the
// EMS/reception/OCR/copilot DTOs above, these can safely match each
// service's own already-declared internal interface exactly, including
// making a field required where the source interface makes it required.

export class UpdateLiveSimulationDto {
  @IsOptional() @IsString() timestamp?: string;
  @IsOptional() @IsNumber() census?: number;
  @IsOptional() @IsNumber() waitingPatients?: number;
  @IsOptional() @IsNumber() boardingCount?: number;
  @IsOptional() @IsNumber() staffedBeds?: number;
  @IsOptional() @IsNumber() treatmentRooms?: number;
  @IsOptional() @IsNumber() physicians?: number;
  @IsOptional() @IsNumber() nurses?: number;
  @IsOptional() @IsNumber() arrivalsPerHour?: number;
  @IsOptional() @IsObject() acuityMix?: Record<string, number>;
  @IsOptional() @IsString() @MaxLength(120) source?: string;
}

export class EvaluateSimulationDto {
  @IsIn(['increase_staff', 'open_fast_track', 'ambulance_diversion', 'discharge_acceleration'])
  type: 'increase_staff' | 'open_fast_track' | 'ambulance_diversion' | 'discharge_acceleration';
  @IsOptional() @IsNumber() intensity?: number;
  @IsOptional() @IsNumber() durationMinutes?: number;
}

export class CompareSimulationDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluateSimulationDto)
  interventions?: EvaluateSimulationDto[];
}

/** Mirrors Partial<FederatedHospital>. */
export class RegisterFederatedHospitalDto {
  @IsOptional() @IsString() @MaxLength(96) hospitalId?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
  @IsOptional() @IsNumber() sampleCapacity?: number;
  @IsOptional() @IsNumber() privacyBudget?: number;
}

/** Mirrors LocalModelUpdate. */
export class UpdateFederatedModelDto {
  @IsString() @MaxLength(96) hospitalId: string;
  @IsOptional() @IsNumber() round?: number;
  @IsNumber() sampleCount: number;
  @IsObject() weights: Record<string, number>;
  @IsOptional() @IsObject() metrics?: Partial<
    Record<'auc' | 'calibration' | 'sensitivity' | 'specificity', number>
  >;
  @IsOptional() @IsBoolean() differentialPrivacy?: boolean;
}

/** Mirrors DigitalTwinStateInput (extends LiveEdStateInput). */
export class InitializeDigitalTwinDto extends UpdateLiveSimulationDto {
  @IsOptional() @IsString() @MaxLength(96) twinId?: string;
  @IsOptional() @IsBoolean() includeTrace?: boolean;
}

export class SimulateDigitalTwinDto {
  @IsOptional() @IsNumber() horizonMinutes?: number;
  @IsOptional() @IsBoolean() includeTrace?: boolean;
}

class TwinInterventionDto {
  @IsIn([
    'increase_staff',
    'open_fast_track',
    'ambulance_diversion',
    'discharge_acceleration',
    'add_observation_beds',
    'split_flow_triage',
  ])
  type:
    | 'increase_staff'
    | 'open_fast_track'
    | 'ambulance_diversion'
    | 'discharge_acceleration'
    | 'add_observation_beds'
    | 'split_flow_triage';
  @IsOptional() @IsNumber() intensity?: number;
}

export class EvaluateDigitalTwinScenarioDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TwinInterventionDto)
  interventions?: TwinInterventionDto[];
  @IsOptional() @IsNumber() horizonMinutes?: number;
  @IsOptional() @IsBoolean() includeTrace?: boolean;
}
