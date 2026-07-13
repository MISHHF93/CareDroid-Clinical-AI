import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AnalyticsEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  event?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'number') return value;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  })
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  userId?: string;
}

export class AnalyticsPayloadDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventDto)
  events: AnalyticsEventDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sessionId?: string;
}

export class CrashErrorDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(2000)
  message: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  stack: string[];
}

export class CrashReportDto {
  @IsString()
  @MaxLength(200)
  id: string;

  @ValidateNested()
  @Type(() => CrashErrorDto)
  error: CrashErrorDto;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  breadcrumbs: string[];

  @IsDateString()
  timestamp: string;

  @IsString()
  @MaxLength(200)
  sessionId: string;

  @IsIn(['development', 'staging', 'production'])
  environment: 'development' | 'staging' | 'production';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  componentStack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  correlationId?: string;
}
