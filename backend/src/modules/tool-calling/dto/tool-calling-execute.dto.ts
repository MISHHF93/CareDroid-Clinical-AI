import { IsDefined, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { IntentClassification } from '../../medical-control-plane/intent-classifier/dto/intent-classification.dto';

/**
 * Cycle 255: input validation for ToolCallingController's `execute` route.
 * Mirrors tool-calling.types.ts's own already-declared ToolCallingRequest
 * interface field-for-field -- `prompt` is the only genuinely required
 * field there, every other field is already optional. `classification` is
 * typed as the real IntentClassification (not a loosened Record<>) purely
 * so this DTO stays structurally assignable to ToolExecutionService
 * .executePrompt()'s ToolCallingRequest parameter; validation on it stays
 * shallow (IsObject() only, no deep field-by-field checks) since the
 * mass-assignment surface this route actually needs protecting is the
 * top-level request shape, not classification's own internals. A frontend
 * sweep found zero real callers of POST /api/tool-calling/execute (only
 * static documentation/policy manifests reference this path) -- real,
 * wired backend code with no UI trigger yet.
 */
export class ToolCallingExecuteDto {
  @IsDefined() @IsString() @MaxLength(8000) prompt!: string;
  @IsOptional() @IsString() toolId?: string;
  @IsOptional() @IsObject() parameters?: Record<string, unknown>;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() conversationId?: string;
  @IsOptional() @IsObject() classification?: IntentClassification | null;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}
