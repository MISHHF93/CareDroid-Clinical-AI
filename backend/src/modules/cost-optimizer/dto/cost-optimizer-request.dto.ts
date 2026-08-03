import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Cycle 255: input validation for CostOptimizerController's `route` handler.
 * Mirrors cost-optimizer.types.ts's own already-declared CostOptimizationRequest
 * interface field-for-field (every field there is already optional). A
 * frontend sweep found zero real callers of POST /api/cost-optimizer/route
 * (only backendHttpRouteInventory.ts/backendRouteExposurePolicy.ts, both
 * static documentation manifests, reference this path) -- real, wired
 * backend code with no UI trigger yet, the same "unreached but real"
 * pattern as several prior cycles.
 */
export class CostOptimizationRequestDto {
  @IsOptional() @IsString() requestId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsNumber() inputTokens?: number;
  @IsOptional() @IsNumber() expectedOutputTokens?: number;
  @IsOptional() @IsNumber() maxOutputTokens?: number;
  @IsOptional() @IsString() cacheKey?: string;
  @IsOptional() @IsBoolean() useCache?: boolean;
  @IsOptional() @IsString() sourceSurface?: string;
  @IsOptional() @IsString() featureHint?: string;
  @IsOptional() @IsString() toolHint?: string;
  @IsOptional() @IsBoolean() requiresHumanReview?: boolean;
  @IsOptional() structuredPayload?: unknown;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
