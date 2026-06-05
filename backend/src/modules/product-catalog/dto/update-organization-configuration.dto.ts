import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationConfigurationDto {
  @IsOptional()
  @IsObject()
  navigation?: {
    hiddenNavIds?: string[];
    primaryLanding?: string;
  };

  @IsOptional()
  @IsObject()
  branding?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  workspaceDefaults?: unknown[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledAgentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledProductIds?: string[];

  @IsOptional()
  @IsObject()
  dashboardLayout?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  permissionsOverrides?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationsRequested?: string[];
}
