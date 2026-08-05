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
 * Cycle 250: input validation for emergency-os.research.controller.ts's 8
 * @Body() routes (federated EMS/LMECS, AI call interrogation, organizational
 * digital twin, ER Pulse handover). Confirmed via a frontend sweep that none
 * of these 8 routes have a real caller anywhere in src/ -- only
 * backendHttpRouteInventory.ts/backendRouteExposurePolicy.ts, both static
 * documentation manifests, reference these paths at all. Every DTO below
 * mirrors a field set the backend had already declared precisely (real
 * exported interfaces like EMS112Call/HospitalClient/EDState, or inline
 * object-literal types), so this is a mechanical interface -> class
 * conversion with no live-payload risk either way.
 */

class ClinicalVitalDto {
  @IsOptional() @IsNumber() hr?: number;
  @IsOptional() @IsString() @MaxLength(40) bp?: string;
  @IsOptional() @IsNumber() sbp?: number;
  @IsOptional() @IsNumber() dbp?: number;
  @IsOptional() @IsNumber() spo2?: number;
  @IsOptional() @IsNumber() rr?: number;
  @IsOptional() @IsNumber() temp?: number;
  @IsOptional() @IsNumber() gcs?: number;
}

class ClinicalLabDto {
  @IsString() @MaxLength(120) name: string;
  @IsDefined() value: number | string;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsBoolean() abnormal?: boolean;
  @IsOptional() @IsString() @MaxLength(80) referenceRange?: string;
}

class ClinicalImagingStudyDto {
  @IsString() @MaxLength(80) modality: string;
  @IsOptional() @IsString() @MaxLength(80) bodyPart?: string;
  @IsString() @MaxLength(2000) impression: string;
  @IsOptional() @IsBoolean() critical?: boolean;
}

/** Mirrors the private ERPulsePatientContext interface
 * (smart-handover-v2.service.ts) plus `id`, a fallback key the controller
 * itself already reads (`dto.patient?.id`) alongside `patientId`. */
class ErPulsePatientContextDto {
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(96) id?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsNumber() age?: number;
  @IsOptional() @IsString() @MaxLength(40) mrn?: string;
  @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @IsOptional() @IsString() @MaxLength(4000) hpi?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) pmh?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) medications?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalVitalDto)
  vitals?: ClinicalVitalDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalLabDto)
  labs?: ClinicalLabDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalImagingStudyDto)
  imaging?: ClinicalImagingStudyDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) consults?: string[];
}

export class HandoverRequestDto {
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => ErPulsePatientContextDto)
  patient?: ErPulsePatientContextDto;
}

class GeoLocationDto {
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsNumber() accuracy?: number;
}

class CallerMetadataDto {
  @IsOptional() @IsString() @MaxLength(10) language?: string;
  @IsOptional() @IsNumber() distressLevel?: number;
  @IsOptional() @IsNumber() backgroundNoise?: number;
}

class WearableDataDto {
  @IsOptional() @IsNumber() heartRate?: number;
  @IsOptional() @IsNumber() oxygenSaturation?: number;
  @IsOptional() @IsBoolean() fallDetected?: boolean;
}

/** Mirrors Partial<EMS112Call> (federated-ems.service.ts). */
export class Process112CallDto {
  @IsOptional() @IsString() @MaxLength(96) callId?: string;
  @IsOptional() @IsString() timestamp?: string;
  @IsOptional() @ValidateNested() @Type(() => GeoLocationDto) location?: GeoLocationDto;
  @IsOptional() @IsIn(['immediate', 'emergency', 'non_urgent']) urgencyLevel?:
    | 'immediate'
    | 'emergency'
    | 'non_urgent';
  @IsOptional() @ValidateNested() @Type(() => CallerMetadataDto) callerMetadata?: CallerMetadataDto;
  @IsOptional() @ValidateNested() @Type(() => WearableDataDto) wearableData?: WearableDataDto;
}

class HospitalModelPerformanceDto {
  @IsDefined() @IsNumber() accuracy: number;
  @IsDefined() @IsNumber() loss: number;
  @IsDefined() @Type(() => Date) lastEvaluation: Date;
}

/** Mirrors HospitalClient (lmecs.service.ts) -- unlike this file's other
 * DTOs, every field here is required (not optional) because the source
 * type declares each array element as a complete HospitalClient; only the
 * top-level `clients` array itself is optional. */
class HospitalClientDto {
  @IsDefined() @IsString() @MaxLength(96) id: string;
  @IsIn(['similar', 'dissimilar']) dataDistribution: 'similar' | 'dissimilar';
  @ValidateNested()
  @Type(() => HospitalModelPerformanceDto)
  localModelPerformance: HospitalModelPerformanceDto;
  @IsDefined() @IsNumber() selectionPriority: number;
}

export class SelectClientsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HospitalClientDto)
  clients?: HospitalClientDto[];
}

export class PredictSeverityDto {
  @IsOptional() @IsObject() patientData?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(96) hospitalId?: string;
}

/** Mirrors the private CallInterrogationRequest interface
 * (emergency-os.research.controller.ts). */
export class CallInterrogationRequestDto {
  @IsOptional() @IsString() @MaxLength(96) callId?: string;
  @IsOptional() @IsString() audioBase64?: string;
  @IsOptional() @IsString() @MaxLength(4000) transcriptHint?: string;
  @IsOptional() @IsString() @MaxLength(10) callerLanguage?: string;
  @IsOptional() @IsNumber() backgroundNoise?: number;
  @IsOptional() @IsString() timestamp?: string;
}

export class InterpretEcgDto {
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) ecgData?: number[];
}

/** Mirrors Partial<EDState> (organizational-digital-twin.service.ts). */
export class SynchronizePatientFlowDto {
  @IsOptional() @IsString() timestamp?: string;
  @IsOptional() @IsNumber() census?: number;
  @IsOptional() @IsNumber() waitingPatients?: number;
  @IsOptional() @IsNumber() boardingPatients?: number;
  @IsOptional() @IsNumber() staffedBeds?: number;
  @IsOptional() @IsNumber() nurses?: number;
  @IsOptional() @IsNumber() physicians?: number;
  @IsOptional() @IsNumber() arrivalsPerHour?: number;
}

export class RunPredictiveSimulationDto {
  @IsOptional() @IsString() @MaxLength(120) scenario?: string;
}

/**
 * Cycle 285: mirrors FederatedEMSModel (federated-ems.service.ts) plus the
 * two snake_case aliases the legacy Express /federated/round handler
 * accepted (hospital_id, local_model) -- zero real callers found for this
 * route either, matching every other route in this file.
 */
export class FederatedTrainingRoundDto {
  @IsOptional() @IsString() @MaxLength(96) hospitalId?: string;
  @IsOptional() @IsString() @MaxLength(96) hospital_id?: string;
  @IsOptional() @IsObject() localModel?: Record<string, number>;
  @IsOptional() @IsObject() local_model?: Record<string, number>;
  @IsOptional() @IsString() @MaxLength(64) globalModelVersion?: string;
  @IsOptional() @IsNumber() dataQualityScore?: number;
}
