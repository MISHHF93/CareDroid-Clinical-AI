import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class HospitalSolutionRecommendationDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  hospitalType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetPackIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workspaceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aiAgentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationSlugs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];
}

export class ApplyHospitalSolutionDto {
  @IsString()
  organizationId: string;

  @IsOptional()
  @IsString()
  commercialPlanId?: string;

  @IsOptional()
  @IsObject()
  configurationPatch?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  recommendation?: Record<string, unknown>;
}
