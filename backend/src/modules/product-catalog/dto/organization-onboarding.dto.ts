import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OrganizationType } from '../../platform-assets/enums/platform-asset.enums';
import { CommercialPlanId } from '../enums/product-catalog.enums';

export class OrganizationOnboardingDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  slug: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  packIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsEnum(CommercialPlanId)
  commercialPlanId?: CommercialPlanId;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationSlugs?: string[];

  @IsOptional()
  @IsArray()
  roleAssignments?: Array<{ email?: string; roleProfileId: string }>;

  @IsOptional()
  @IsString()
  defaultRoleProfileId?: string;

  @IsOptional()
  @IsArray()
  workspaceSetups?: Array<{
    name: string;
    type: string;
    enabledToolIds?: string[];
    enabledModules?: string[];
  }>;

  @IsOptional()
  @IsObject()
  branding?: Record<string, unknown>;
}
