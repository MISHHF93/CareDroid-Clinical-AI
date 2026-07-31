import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cycle 248: input validation for ClinicalIntelligenceController's 13
 * @Body() routes. Every one of these routes dispatches purely through
 * PlatformSystemsService.demo() -- a synthetic capability-contract
 * responder with no real persistence and no field-specific logic of its
 * own (confirmed by direct read) -- and a frontend sweep found zero real
 * callers with a capability-specific payload: 10 of the 13 are only ever
 * reached via PlatformSystemPage.tsx's generic "Run demo contract" button,
 * which always sends the identical
 * {capabilityId, patientId, mode, source, confirmationRequired} shape
 * regardless of capability; the other 2 (approveDocument, exportDocument)
 * have no caller of any kind, not even the demo button.
 *
 * With no live payload to preserve and no service-side field reads to
 * mirror, these DTOs formalize each route's intended request shape as
 * already encoded in clinical-intelligence.controller.spec.ts's own test
 * fixtures (chiefComplaint, goal, question, decision, runId, eventType,
 * transcript, audioRef, specialty, medication, approvedBy, format) --
 * documenting what each AI capability is *for*, not a reverse-engineered
 * live contract, plus a `context` escape hatch on the free-text ones since
 * none of this has a finalized real schema yet.
 */

/** Fields sent by the one real caller today: PlatformSystemPage.tsx's
 * generic demo-contract button. Shared by every DTO below. */
export class PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(96) capabilityId?: string;
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(40) mode?: string;
  @IsOptional() @IsString() @MaxLength(200) source?: string;
  @IsOptional() @IsBoolean() confirmationRequired?: boolean;
}

export class SuggestCalculatorDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) symptoms?: string[];
  @IsOptional() @IsObject() vitals?: Record<string, unknown>;
}

export class GenerateWorkflowDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(500) goal?: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class AnalyzeReasoningDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(2000) question?: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class ExplainWhyDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(500) decision?: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class SummarizeAuditTrailDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(96) runId?: string;
}

export class DraftClinicalEventDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(120) eventType?: string;
  @IsOptional() @IsObject() details?: Record<string, unknown>;
}

export class DraftSoapDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(20000) transcript?: string;
}

export class TranscribeDictationDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(500) audioRef?: string;
}

export class DraftDischargeSummaryDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class DraftReferralDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(120) specialty?: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

export class DraftPriorAuthDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(200) medication?: string;
  @IsOptional() @IsString() @MaxLength(500) diagnosis?: string;
}

/** approveDocument/exportDocument have zero caller of any kind today
 * (confirmed by frontend sweep) -- fields are the documentId-scoped
 * counterpart to the rest of this file's approach. */
export class ApproveDocumentDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(64) approvedBy?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class ExportDocumentDto extends PlatformDemoContractFieldsDto {
  @IsOptional() @IsString() @MaxLength(40) format?: string;
  @IsOptional() @IsString() @MaxLength(200) destination?: string;
}
