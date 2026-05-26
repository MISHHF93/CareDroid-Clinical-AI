import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ClinicalMemoryType } from '../entities/clinical-memory-entry.entity';
import { LongMemoryType } from '../entities/long-memory-entry.entity';
import { ShortMemoryType } from '../entities/short-memory-entry.entity';

export class ShortMemoryQueryDto {
  @IsOptional()
  @IsEnum(ShortMemoryType)
  type?: ShortMemoryType;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class LongMemoryQueryDto {
  @IsOptional()
  @IsEnum(LongMemoryType)
  type?: LongMemoryType;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class ClinicalMemoryQueryDto {
  @IsOptional()
  @IsEnum(ClinicalMemoryType)
  type?: ClinicalMemoryType;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  patientId?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
