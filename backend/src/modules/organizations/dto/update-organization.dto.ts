import { IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { OrganizationType } from '../../platform-assets/enums/platform-asset.enums';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsObject()
  branding?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
