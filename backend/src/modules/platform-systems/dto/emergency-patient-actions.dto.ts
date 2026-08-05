import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type {
  ArrivalMode,
  EmergencyPatientState,
  EmergencyPriority,
  EmergencyVitals,
  JourneyEvent,
  PatientArrivalRecord,
  QueueDestination,
  RegistrationStatus,
} from '../../emergency-os/emergency-os.types';
import type { TriageAssistEnvelope } from '../../../../../lib/patient-orchestration';

/**
 * Cycle 270: input validation for PlatformSystemsController's 3 remaining
 * @Body() routes (roadmap item #18's last un-deferred cluster). Unlike
 * EmergencyOsController's createPatient/createIntakePatient (still
 * deliberately deferred -- real, live reception-intake callers with
 * documented divergent field shapes, see SCORECARD.md), this controller's
 * createEmergencyPatient/updateEmergencyPatient/createEmergencyReferral are
 * a second, parallel front door onto the exact same
 * EmergencyPatientService/ReferralService methods with ZERO live callers:
 * src/services/patientManagementApi.ts's createEmergencyPatientRecord/
 * updateEmergencyPatientRecord are exported but never imported anywhere
 * else in the frontend, and the app's real "create referral" UI flow
 * (ReferralPanel.tsx) goes through the local emergencyStore action, never
 * this HTTP route -- confirmed by a full frontend grep, not assumed. With
 * no live payload shape to reverse-engineer, these DTOs mirror the
 * backend's own already-declared types field-for-field instead:
 * CreateEmergencyPatientDto/UpdateEmergencyPatientDto mirror
 * EmergencyPatient (emergency-os.types.ts) exactly, all fields optional to
 * match the service methods' own `Partial<EmergencyPatient>` signatures
 * (createPatient defaults every field server-side when absent -- see
 * EmergencyPatientService.createPatient); CreateEmergencyReferralDto
 * mirrors ReferralService.createReferral's own `String(input.x || y ||
 * default)`-style field reads, which already prove every field is honestly
 * optional at that boundary (same reasoning as Cycle 254's AI
 * action-proposal DTOs). Nested clinical sub-structures (vitals, notes,
 * timeline, arrival) are intentionally left as opaque IsObject()/IsArray()
 * rather than deep-validated, matching Cycle 253's PatientDto precedent --
 * these routes only need whitelist protection on the top-level shape.
 */

export class CreateEmergencyPatientDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() @MaxLength(64) mrn?: string;
  @IsOptional() @IsString() @MaxLength(200) firstName?: string;
  @IsOptional() @IsString() @MaxLength(200) lastName?: string;
  @IsOptional() @IsString() dob?: string;
  @IsOptional() @IsNumber() age?: number;
  @IsOptional() @IsIn(['M', 'F', 'Other']) sex?: 'M' | 'F' | 'Other';
  @IsOptional() @IsString() arrivalTime?: string;
  @IsOptional() @IsString() triageTime?: string;
  @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @IsOptional() @IsString() @MaxLength(2000) complaint?: string;
  @IsOptional() @IsString() @MaxLength(200) complaintCategory?: string;
  @IsOptional()
  @IsIn([
    'Arrival',
    'Registration',
    'Triage',
    'Waiting',
    'Assessment',
    'Orders',
    'Results',
    'Disposition',
    'Admission',
    'Discharge',
  ])
  state?: EmergencyPatientState;
  @IsOptional() @IsIn(['P1', 'P2', 'P3', 'P4', 'P5']) priority?: EmergencyPriority;
  @IsOptional() @IsArray() vitals?: EmergencyVitals[];
  @IsOptional() @IsArray() @IsString({ each: true }) flags?: string[];
  @IsOptional() @IsString() assignedStaffId?: string;
  @IsOptional() @IsString() roomId?: string;
  @IsOptional()
  @IsArray()
  notes?: Array<{ id: string; text: string; authorId: string; timestamp: string }>;
  @IsOptional() @IsArray() timeline?: JourneyEvent[];
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
  @IsOptional() @IsObject() arrival?: PatientArrivalRecord;
  @IsOptional() @IsArray() @IsString({ each: true }) quickSafetyFlags?: string[];
  @IsOptional()
  @IsArray()
  highRiskComplaintFlags?: Array<{
    id: string;
    label: string;
    detectedAt: string;
    source: 'complaint-text' | 'complaint-category' | 'staff-selected';
  }>;
}

export class UpdateEmergencyPatientDto extends CreateEmergencyPatientDto {}

export class CreateEmergencyReferralDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() @MaxLength(200) requestingStaffId?: string;
  @IsOptional() @IsString() @MaxLength(200) targetDepartment?: string;
  @IsOptional() @IsString() @MaxLength(200) specialty?: string;
  @IsOptional() @IsString() @MaxLength(60) urgency?: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @IsOptional() @IsString() @MaxLength(2000) clinicalSummary?: string;
  @IsOptional() @IsString() @MaxLength(60) status?: string;
  @IsOptional() @IsString() @MaxLength(60) workflow?: string;
  @IsOptional() @IsString() requestedAt?: string;
}
