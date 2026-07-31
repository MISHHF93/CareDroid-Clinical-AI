import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PatientFlag, PatientState, Priority } from '../../../../../src/types/emergency';
import type {
  ArrivalMode,
  CriticalChecklistRecord,
  EMSArrival,
  FitToWaitClassificationRecord,
  HighRiskComplaintFlagRecord,
  JourneyEvent,
  Note,
  PatientArrivalRecord,
  QueueDestination,
  QuickSafetyFlag,
  ReassessmentReminder,
  Referral,
  RegistrationStatus,
  Sex,
  TriageAssistEnvelope,
  Vitals,
  VitalsAlert,
  WhiteboardAutomationSnapshot,
} from '../../../../../src/types/emergency';
import type {
  PatientDocumentArtifact,
  PatientDocumentSource,
} from '../../../../../src/types/patientDocumentArtifact';

/**
 * Cycle 253: input validation for NativeAiController's 5 @Body() routes
 * (route/clinical-acuity/triage-rules/triage-rules/evaluate/specialists/
 * infer). Unlike prior cycles' PlatformSystemsService.demo() passthroughs,
 * these 4 patient-shaped routes are real: native-ai.service.ts confirmed by
 * direct read to run the body straight through routePatientToClinicalSpecialists/
 * buildClinicalAcuityLeaderboard/inferTriageFromExpertSystem with
 * sourceState: 'live'. A frontend sweep (src/services/nativeAiApi.ts) found
 * all 5 wrapper functions exist and send exactly `{ patient }`/`{ patients }`/
 * `{ naturalLanguage, createdBy }`, but only fetchClinicalAcuityLeaderboard
 * is actually invoked today (useNativeAiDashboardData.ts) -- the other 4 are
 * real, wired code with no UI trigger yet, same "unreached but real" pattern
 * as Cycle 252's testIntegrationConnection.
 *
 * PatientDto mirrors src/types/emergency.ts's `Patient` interface field-for-
 * field (same required/optional split) rather than a reverse-engineered
 * subset, since every real caller across this codebase constructs a Patient
 * through that single canonical interface -- unlike EmergencyOsController's
 * createPatient/createIntakePatient (roadmap item #18), there is no evidence
 * of divergent intake-time shapes here, only one shared runtime record type
 * being read, not authored, by these routes. Nested clinical sub-structures
 * (vitals, notes, timeline, referral, EMS arrival, etc.) are intentionally
 * left as opaque IsObject()/IsArray() rather than deep-validated -- these
 * routes only need whitelist protection on the top-level Patient shape
 * itself (the actual mass-assignment surface); re-validating every nested
 * clinical sub-record's own fields is a separate, much larger effort with
 * its own dedicated cycle if ever needed, not a drive-by here.
 */

export class PatientDto {
  @IsDefined() @IsString() id!: string;
  @IsDefined() @IsString() @MaxLength(64) mrn!: string;
  @IsDefined() @IsString() @MaxLength(200) firstName!: string;
  @IsDefined() @IsString() @MaxLength(200) lastName!: string;
  @IsOptional() @IsString() @MaxLength(400) name?: string;
  @IsDefined() @IsString() dob!: string;
  @IsDefined() @IsNumber() age!: number;
  @IsDefined()
  @IsIn(['M', 'F', 'Other', 'Female', 'Male', 'Intersex', 'Unknown', 'Unspecified'])
  sex!: Sex;
  @IsOptional() @IsString() @MaxLength(200) location?: string;
  @IsDefined() @IsString() arrivalTime!: string;
  @IsOptional() @IsString() triageTime?: string | null;
  @IsOptional() @IsString() lastAssessedTime?: string | null;
  @IsDefined() @IsString() @MaxLength(2000) chiefComplaint!: string;
  @IsOptional() @IsString() @MaxLength(2000) complaint?: string;
  @IsDefined() @IsString() @MaxLength(200) complaintCategory!: string;
  @IsDefined() @IsEnum(PatientState) state!: PatientState;
  @IsDefined() @IsEnum(Priority) priority!: Priority;
  @IsDefined() @IsArray() vitals!: Vitals[];
  @IsOptional() @IsObject() currentVitals?: Vitals | null;
  @IsOptional() @IsString() vitalsUpdatedAt?: string;
  @IsDefined() @IsArray() @IsEnum(PatientFlag, { each: true }) flags!: PatientFlag[];
  @IsOptional() @IsString() assignedStaffId?: string | null;
  @IsOptional() @IsString() assignedTo?: string | null;
  @IsOptional() @IsString() roomId?: string | null;
  @IsDefined() @IsArray() notes!: Note[];
  @IsDefined() @IsArray() timeline!: JourneyEvent[];
  @IsOptional() @IsObject() referral?: Referral;
  @IsOptional() @IsArray() reassessmentReminders?: ReassessmentReminder[];
  @IsOptional() @IsArray() vitalsAlerts?: VitalsAlert[];
  @IsOptional() @IsString() source?: 'EMS' | 'WalkIn' | 'Transfer' | 'Referral' | string;
  @IsOptional() @IsString() emsUnitId?: string;
  @IsOptional() @IsObject() emsArrival?: EMSArrival;
  @IsOptional() @IsObject() criticalChecklist?: CriticalChecklistRecord;
  @IsOptional() @IsString() @MaxLength(64) phone?: string;
  @IsOptional() @IsString() @MaxLength(64) mobilePhone?: string;
  @IsOptional() @IsString() @MaxLength(64) healthCardNumber?: string;
  @IsOptional() @IsString() @MaxLength(64) healthCard?: string;
  @IsOptional() @IsString() @MaxLength(64) phn?: string;
  @IsOptional() @IsObject() triageAssist?: TriageAssistEnvelope | null;
  @IsOptional() @IsString() triageAssistGeneratedAt?: string | null;
  @IsOptional()
  @IsIn(['walk-in', 'EMS', 'referral', 'self-check-in', 'police', 'transfer'])
  arrivalMode?: ArrivalMode;
  @IsOptional()
  @IsIn(['pending', 'in-progress', 'complete', 'provisional'])
  registrationStatus?: RegistrationStatus;
  @IsOptional() @IsBoolean() triagePending?: boolean;
  @IsOptional() @IsString() firstContactAt?: string | null;
  @IsOptional()
  @IsIn([
    'triage-queue',
    'rapid-review',
    'waiting-room',
    'verification',
    'ems-registration',
    'whiteboard',
  ])
  queueDestination?: QueueDestination;
  @IsOptional() @IsArray() quickSafetyFlags?: QuickSafetyFlag[];
  @IsOptional() @IsArray() highRiskComplaintFlags?: HighRiskComplaintFlagRecord[];
  @IsOptional() @IsObject() fitToWaitClassification?: FitToWaitClassificationRecord | null;
  @IsOptional() @IsArray() @IsString({ each: true }) symptoms?: string[];
  @IsOptional() @IsNumber() waitTimeMinutes?: number;
  @IsOptional() @IsNumber() waitMinutes?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) medications?: string[];
  @IsOptional() @IsObject() arrival?: PatientArrivalRecord;
  @IsOptional() @IsObject() whiteboardAutomation?: WhiteboardAutomationSnapshot;
  @IsOptional() @IsString() assignedPhysicianId?: string | null;
  @IsOptional() @IsArray() documentArtifacts?: PatientDocumentArtifact[];
  @IsOptional() @IsArray() documentSources?: PatientDocumentSource[];
  @IsOptional() @IsString() updatedAt?: string;
}

export class PatientPayloadDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => PatientDto)
  patient!: PatientDto;
}

export class ClinicalAcuityDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientDto)
  patients?: PatientDto[];
}

export class AddTriageRuleDto {
  @IsDefined() @IsString() @MaxLength(2000) naturalLanguage!: string;
  @IsOptional() @IsString() @MaxLength(200) createdBy?: string;
}
