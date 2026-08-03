import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cycle 255: input validation for EdCopilotNestParityController's `query`
 * route. The handler already manually checks `!body?.query || !body?.user_role`
 * and returns a custom validation-error response rather than throwing --
 * both fields stay optional here to preserve that exact existing behavior
 * rather than letting Nest's ValidationPipe short-circuit with a generic
 * 400 instead. A frontend sweep found zero real callers of this exact path
 * (POST /api/copilot/query) -- real traffic goes to the separate, already-
 * DTO'd /api/emergency/copilot/query on EmergencyOsController instead (this
 * controller's own header comment already documents it as a "Nest parity"
 * shim so the legacy Express route can be retired).
 */
export class EdCopilotQueryDto {
  @IsOptional() @IsString() @MaxLength(4000) query?: string;
  @IsOptional() @IsString() @MaxLength(100) user_role?: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}
