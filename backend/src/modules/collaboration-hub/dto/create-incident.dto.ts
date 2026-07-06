import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidentDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['critical', 'high', 'moderate', 'low'])
  severity: 'critical' | 'high' | 'moderate' | 'low';

  @IsString()
  @MaxLength(80)
  triggerType: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;
}
