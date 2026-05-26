import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOperationalProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  licenseRegion?: string;

  @IsOptional()
  @IsArray()
  credentials?: string[];

  @IsOptional()
  @IsArray()
  certifications?: Array<Record<string, any>>;

  @IsOptional()
  @IsArray()
  specialties?: string[];

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  clinicalInterests?: string[];

  @IsOptional()
  @IsObject()
  professional?: Record<string, any>;
}
