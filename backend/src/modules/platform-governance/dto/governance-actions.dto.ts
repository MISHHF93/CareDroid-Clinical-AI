import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Cycle 247: input validation for GovernanceController's 33 @Body() routes,
 * confirmed to have zero real frontend callers today (see SCORECARD.md) --
 * every shape below is derived from what governance.controller.ts /
 * platform-governance.service.ts actually read off the body, plus the real
 * TypeORM entity columns each write eventually lands on
 * (platform-governance.entities.ts). Several of those entity columns
 * (content/decision/resolution/metadata/payload) are deliberately
 * `simple-json` free-form blobs, so those fields stay typed as
 * Record<string, unknown> here rather than being narrowed to fixed
 * sub-fields -- validated as "must be an object," not locked to a schema
 * the entity itself doesn't impose.
 */

export class CreateClinicalPolicyDto {
  @IsOptional() @IsString() @MaxLength(64) organizationId?: string;
  @IsOptional() @IsString() @MaxLength(96) capabilityId?: string;
  @IsOptional() @IsString() @MaxLength(80) policyType?: string;
  @IsOptional() @IsString() @MaxLength(40) version?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
  @IsOptional() @IsString() intendedUse?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) excludedUses?: string[];
  @IsOptional() @IsString() humanReviewPolicy?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) blockedActions?: string[];
  @IsOptional() @IsString() modelPolicy?: string;
  @IsOptional() @IsString() privacyPolicy?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) evidenceRequirements?: string[];
  @IsOptional() @IsString() @MaxLength(64) createdBy?: string;
}

export class UpdateClinicalPolicyDto {
  @IsOptional() @IsString() @MaxLength(80) policyType?: string;
  @IsOptional() @IsString() @MaxLength(40) version?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
  @IsOptional() @IsISO8601() retiredAt?: string;
  @IsOptional() @IsString() @MaxLength(64) updatedBy?: string;
}

/**
 * Shared "act on an item" shape -- reused by every approve/decide/review/
 * assign/comment endpoint in this controller. All of them either read
 * `.decision` to branch on approve/reject/resolve/accept_risk, or spread
 * the whole body verbatim into a simple-json column (decision/resolution),
 * so this DTO enumerates every named field any of those call sites actually
 * reads, plus a `metadata` escape hatch for anything else a caller wants
 * preserved in that JSON blob -- matching the entity's own free-form intent
 * without accepting a fully-unvalidated body.
 */
export class GovernanceDecisionDto {
  @IsOptional() @IsString() @MaxLength(40) decision?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @IsOptional() @IsString() @MaxLength(2000) rationale?: string;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @IsOptional() @IsString() @MaxLength(64) approvedBy?: string;
  @IsOptional() @IsString() @MaxLength(64) reviewedBy?: string;
  @IsOptional() @IsString() @MaxLength(64) assignedTo?: string;
  @IsOptional() @IsISO8601() effectiveAt?: string;
  @IsOptional() @IsISO8601() dueAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

/** Generic small "config knob" body for the AI-policy/prompt-firewall/
 * model-access/cost-budget demo-only routes -- no real service persists
 * these today (confirmed by direct read), so this is a reasonable,
 * real-shaped contract rather than a reverse-engineered live one. */
export class GovernanceConfigUpdateDto {
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

/** Shared by GovernanceController.evaluatePromptSecurity and
 * PlatformGovernanceController.evaluateGate -- both build a
 * PlatformGovernanceService.evaluateGate() input from the identical set of
 * body fields (the latter also reads `action`, unused by the former since
 * it hardcodes its own `action` value). */
export class EvaluateGateDto {
  @IsOptional() @IsString() @MaxLength(96) runId?: string;
  @IsOptional() @IsString() @MaxLength(96) capabilityId?: string;
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsBoolean() phiAccessed?: boolean;
  @IsOptional() @IsString() @MaxLength(8000) prompt?: string;
  @IsOptional() @IsString() @MaxLength(8000) input?: string;
  @IsOptional() @IsString() @MaxLength(120) action?: string;
}

/** Mirrors PlatformRegulatoryClassification's real columns even though this
 * route is demo-only today, so a future wiring pass doesn't need to
 * redesign the contract. */
export class UpdateRegulatoryClassificationDto {
  @IsOptional() @IsString() @MaxLength(40) jurisdiction?: string;
  @IsOptional() @IsString() @MaxLength(80) classification?: string;
  @IsOptional() @IsString() @MaxLength(40) riskLevel?: string;
  @IsOptional() @IsString() intendedUse?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) excludedUses?: string[];
  @IsOptional() @IsBoolean() requiresHumanReview?: boolean;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsString() @MaxLength(64) approvedBy?: string;
}

export class CreateRegulatoryEvidenceArtifactDto {
  @IsOptional() @IsString() @MaxLength(80) artifactType?: string;
  @IsOptional() @IsString() @MaxLength(500) uri?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

/** Mirrors PlatformEquityMetric's real columns. */
export class EquityCohortDto {
  @IsOptional() @IsString() @MaxLength(96) cohortId?: string;
  @IsOptional() @IsString() @MaxLength(96) capabilityId?: string;
  @IsOptional() @IsString() @MaxLength(80) metricName?: string;
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsNumber() denominator?: number;
  @IsOptional() @IsISO8601() windowStart?: string;
  @IsOptional() @IsISO8601() windowEnd?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EquityReportDto {
  @IsOptional() @IsString() @MaxLength(80) reportType?: string;
  @IsOptional() @IsString() @MaxLength(96) capabilityId?: string;
  @IsOptional() @IsISO8601() windowStart?: string;
  @IsOptional() @IsISO8601() windowEnd?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

/** Mirrors PlatformValidationScenario's real columns. */
export class CreateValidationScenarioDto {
  @IsOptional() @IsString() @MaxLength(96) capabilityId?: string;
  @IsOptional() @IsString() @MaxLength(80) scenarioType?: string;
  @IsOptional() @IsString() @MaxLength(40) riskLevel?: string;
  @IsOptional() @IsString() @MaxLength(40) version?: string;
  @IsOptional() @IsObject() inputFixture?: Record<string, unknown>;
  @IsOptional() @IsArray() expectedAssertions?: Record<string, unknown>[];
}

export class CreateValidationRunDto {
  @IsOptional() @IsString() @MaxLength(96) runId?: string;
  @IsOptional() @IsString() @MaxLength(96) capabilityId?: string;
  @IsOptional() @IsString() @MaxLength(80) changeType?: string;
  @IsOptional() @IsString() @MaxLength(96) artifactVersion?: string;
  @IsOptional() @IsString() @MaxLength(96) version?: string;
  @IsOptional() @IsString() @MaxLength(40) riskLevel?: string;
}

/** Mirrors PlatformReviewItem's real columns. `dueAt` is typed/transformed
 * to a real Date (not left as an ISO string, unlike this file's other date
 * fields) because PlatformGovernanceService.createReviewItem() takes
 * `Partial<PlatformReviewItem>` and assigns `dueAt` straight through with no
 * `new Date()` conversion of its own -- the DTO has to hand back the same
 * type the entity column expects. */
export class CreateReviewItemDto {
  @IsOptional() @IsString() @MaxLength(64) organizationId?: string;
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(96) runId?: string;
  @IsOptional() @IsString() @MaxLength(96) capabilityId?: string;
  @IsOptional() @IsString() @MaxLength(80) reviewType?: string;
  @IsOptional() @IsString() @MaxLength(40) severity?: string;
  @IsOptional() @IsString() @MaxLength(64) assignedTo?: string;
  @IsOptional() @Type(() => Date) @IsDate() dueAt?: Date;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}

/** Mirrors PlatformConsentRecord's real columns (updateConsent/revokeConsent
 * both call upsertConsent(), which reads exactly these fields). */
export class ConsentActionDto {
  @IsOptional() @IsString() @MaxLength(80) scope?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(80) source?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

/** Mirrors PlatformPrivacyRequest's real columns (createPrivacyRequest
 * reads patientId/requestedBy/dueAt and stores the rest as metadata). */
export class PrivacyRequestDto {
  @IsOptional() @IsString() @MaxLength(96) patientId?: string;
  @IsOptional() @IsString() @MaxLength(64) requestedBy?: string;
  @IsOptional() @IsISO8601() dueAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class AuditPlaceholderDto {
  @IsOptional() @IsString() @MaxLength(80) scope?: string;
  @IsOptional() @IsString() @MaxLength(40) format?: string;
  @IsOptional() @IsString() @MaxLength(64) requestedBy?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
