import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cycle 255: input validation for AuditController's syncAuditEvent route.
 * The controller already reads every field with a String(x || y || default)
 * -style fallback, proving every field is honestly optional at this
 * boundary. A real caller exists (src/services/syncService.ts's
 * syncAuditLogs(), part of the offline-sync-on-reconnect flow) sending
 * exactly {action, resourceType, resourceId, timestamp}; `eventType` (the
 * controller's fallback for `action`) and `metadata` are also honored since
 * the controller itself already reads them.
 */
export class SyncAuditEventDto {
  @IsOptional() @IsString() @MaxLength(200) action?: string;
  @IsOptional() @IsString() @MaxLength(200) eventType?: string;
  @IsOptional() @IsString() @MaxLength(200) resourceType?: string;
  @IsOptional() @IsString() @MaxLength(200) resourceId?: string;
  @IsOptional() @IsString() timestamp?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
