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

  // Accepted by SentinelAlarmService.raise() (RaiseAlarmInput) but not
  // previously wired through the controller at all -- included here since
  // this DTO is the documented contract for what this route accepts.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  actorId?: string;
}
