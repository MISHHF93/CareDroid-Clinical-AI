import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class VitalSignsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  heartRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bloodPressure?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  oxygenSaturation?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gcs?: number;
}

export class BatchEmsPatientDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  patientId?: string;

  @IsString()
  @MaxLength(100)
  temporaryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  age?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sex?: string;

  @IsString()
  @MaxLength(2000)
  chiefComplaint: string;

  @IsIn(['RED', 'YELLOW', 'GREEN', 'BLACK'])
  triageColor: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';

  @IsNumber()
  @Min(0)
  etaMinutes: number;

  @IsString()
  @MaxLength(2000)
  mechanismOfInjury: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;
}

export class BatchEmsIntakeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BatchEmsPatientDto)
  patients: BatchEmsPatientDto[];

  @IsString()
  @MaxLength(200)
  surgeEventId: string;
}
