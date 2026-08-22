import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import type { AiRiskLevel } from '../ai-action-proposal.service';

/**
 * Cycle 254: input validation for AIController's 3 remaining @Body() routes
 * (createProposal/rejectProposal/executeProposal). Unlike the controller's
 * other routes (already real DTOs), these 3 took `Record<string, unknown>`
 * and manually coerced every field with `String(x || y || default)`-style
 * fallbacks -- confirming, by the controller's own code, that every field is
 * already honestly optional at this boundary. `AiActionProposalService.create()`
 * (ai-action-proposal.service.ts) already declares a fully-enumerable inline
 * input type; these DTOs mirror it field-for-field, plus `requestId` (the
 * one alternate key the controller also reads via `body.originatingRequestId
 * || body.requestId`).
 *
 * UPDATE 2026-08-21: a frontend sweep had found the interactive-AI
 * action-proposal UI was a fully separate, local-only, in-memory
 * implementation with its own state machine that never called these routes
 * at all -- the same "unreached but real" pattern as several prior cycles
 * (Cycle 250, Cycle 252, 4-of-5 in Cycle 253). That gap is now closed:
 * `src/services/interactiveAi/actionProposalApi.ts` replaced the in-memory
 * mock and is the real client for all `/ai/proposals*` routes
 * (InteractiveAIWorkspace.tsx, interactiveAiOrchestrator.ts,
 * interactionInbox.ts). These 3 routes have live callers now.
 */

export class CreateAiActionProposalDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() originatingRequestId?: string;
  @IsOptional() @IsString() requestId?: string;
  @IsOptional() @IsString() correlationId?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() toolName?: string;
  @IsOptional() @IsObject() validatedArguments?: Record<string, unknown>;
  @IsOptional() @IsString() expectedEffect?: string;
  @IsOptional() @IsIn(['low', 'moderate', 'high', 'critical']) riskLevel?: AiRiskLevel;
  @IsOptional() @IsString() requiredPermission?: string;
  @IsOptional() @IsBoolean() requiresApproval?: boolean;
  @IsOptional() @IsString() previewSummary?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) dataWillChange?: string[];
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() promptVersion?: string;
  @IsOptional() @IsBoolean() rollbackCapable?: boolean;
  @IsOptional() @IsNumber() reversibleWindowMs?: number;
  @IsOptional() @IsString() ownerRole?: string;
}

export class RejectAiActionProposalDto {
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() rejectionReason?: string;
}

export class ExecuteAiActionProposalDto {
  @IsOptional() @IsObject() result?: Record<string, unknown>;
}
