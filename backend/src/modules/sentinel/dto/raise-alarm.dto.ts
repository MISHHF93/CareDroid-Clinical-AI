import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class RaiseAlarmDto {
  @IsString()
  @MaxLength(200)
  source: string;

  @IsString()
  @MaxLength(200)
  category: string;

  @IsString()
  @MaxLength(200)
  ruleId: string;

  @IsString()
  @MaxLength(200)
  subjectId: string;

  @IsIn(['critical', 'warning', 'info'])
  severity: 'critical' | 'warning' | 'info';

  @IsIn(['immediate', 'soon', 'routine'])
  urgency: 'immediate' | 'soon' | 'routine';

  @IsString()
  @MaxLength(500)
  title: string;

  @IsString()
  @MaxLength(2000)
  message: string;

  // HEAL-308: organizationId deliberately does NOT appear here. It's now
  // derived server-side from the caller's own @TenantContext() in the
  // controller -- accepting it from the request body let a caller attribute
  // an alarm to an arbitrary organization (or omit it to make the alarm
  // invisible to every org's filtered view).
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  actorId?: string;
}
