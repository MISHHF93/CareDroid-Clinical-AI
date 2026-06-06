import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { UsageEventType, UsageUnit } from '../subscription-plans.config';

export class RecordUsageEventDto {
  @IsEnum(UsageEventType)
  eventType: UsageEventType;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  meterId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: UsageUnit;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
