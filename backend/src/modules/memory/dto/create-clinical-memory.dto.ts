import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ClinicalMemoryType } from '../entities/clinical-memory-entry.entity';

export class CreateClinicalMemoryDto {
  @IsEnum(ClinicalMemoryType)
  type: ClinicalMemoryType;

  @IsString()
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  patientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
