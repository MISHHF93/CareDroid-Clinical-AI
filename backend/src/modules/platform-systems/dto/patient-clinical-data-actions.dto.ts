import { IsArray, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { PlatformDemoContractFieldsDto } from './clinical-intelligence-actions.dto';

/**
 * Cycle 251: input validation for PatientClinicalDataController's 6
 * @Body() routes. All 6 dispatch purely through
 * PlatformSystemsService.demo() (confirmed by direct read -- no real
 * persistence, no field-specific logic). A frontend/registry sweep found:
 * - importEhrPatient/importLabs/importMedications/importObservations are
 *   reached by PlatformSystemPage.tsx's generic demo button (their
 *   platformSystems.tsx registry entries are correctly wired `method:
 *   'POST'`, unlike the governance cluster), which always sends the same
 *   {capabilityId, patientId, mode, source, confirmationRequired} shape
 *   regardless of capability -- so these extend the shared
 *   PlatformDemoContractFieldsDto base already established in Cycle 248.
 * - createPatientEvent/addRiskScore have no reachable caller at all: their
 *   registry entries (`clinical-event-ai`, `risk-score-history`) point at
 *   a *different* backend route (ClinicalIntelligenceController's
 *   `clinical-event-ai/draft`) or a GET method respectively, so the demo
 *   button never targets these specific POST routes -- the same
 *   "orphaned even from the demo mechanism" status Cycle 248 found for
 *   approveDocument/exportDocument.
 *
 * With no live payload to preserve beyond the shared demo-contract shape,
 * the capability-specific fields on each DTO formalize what's already
 * encoded in patient-clinical-data.controller.spec.ts's own test fixtures
 * (mrn, panel, medication, vital, eventType, score/value), plus a generic
 * escape-hatch array/object field per import type for the real FHIR-ish
 * bundle these routes are named for but don't yet implement.
 */

export class EhrPatientImportDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(40) mrn?: string;
  @IsOptional() @IsObject() patientRecord?: Record<string, unknown>;
}

export class ImportLabsDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(80) panel?: string;
  @IsOptional() @IsArray() labs?: Record<string, unknown>[];
}

export class ImportMedicationsDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(200) medication?: string;
  @IsOptional() @IsArray() medications?: Record<string, unknown>[];
}

export class ImportObservationsDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(80) vital?: string;
  @IsOptional() @IsArray() observations?: Record<string, unknown>[];
}

/** No reachable caller today (confirmed by registry sweep -- see file
 * header) -- fields mirror ClinicalIntelligenceController's sibling
 * DraftClinicalEventDto (Cycle 248) for consistency, since both routes
 * are named for the same "clinical event" concept. */
export class CreatePatientEventDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(120) eventType?: string;
  @IsOptional() @IsObject() details?: Record<string, unknown>;
}

/** No reachable caller today (confirmed by registry sweep -- see file
 * header). `score` holds the calculator name (per this controller's own
 * test fixture, `{score: 'HEART', value: 5}`), not the numeric result. */
export class AddRiskScoreDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(40) score?: string;
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
