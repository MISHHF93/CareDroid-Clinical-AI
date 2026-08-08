import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { OrganizationType } from '../../platform-assets/enums/platform-asset.enums';

/**
 * PATCH :organizationId/tenant-admin's real payload shape, read directly off
 * OrganizationsService.updateTenantAdministration (which remaps these fields onto
 * updateOrganizationSettings' own settings blob) and its 2 real frontend callers:
 * OrganizationPages.tsx's tenant-admin save() (name/organizationType/country/branding/
 * subscription/departments/integrations/integrationsRequested/workspaceDefaults/
 * permissionsOverrides) and emergencySettingsApi.tsx's saveOrganizationEmergencyOsSettings
 * (settings.emergencyOs). enabledProductIds/enabledPackIds/enabledAgentIds/navigation/
 * dashboardLayout/workspaces have no live caller yet but are read by the service --
 * included to match what it actually accepts, not invented.
 */
export class UpdateTenantAdministrationDto {
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
  subscription?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  departments?: string[];

  @IsOptional()
  @IsArray()
  integrations?: string[];

  @IsOptional()
  @IsArray()
  integrationsRequested?: string[];

  @IsOptional()
  @IsArray()
  enabledProductIds?: string[];

  @IsOptional()
  @IsArray()
  enabledPackIds?: string[];

  @IsOptional()
  @IsArray()
  enabledAgentIds?: string[];

  @IsOptional()
  @IsArray()
  workspaceDefaults?: unknown[];

  @IsOptional()
  @IsArray()
  workspaces?: unknown[];

  @IsOptional()
  @IsObject()
  permissionsOverrides?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  navigation?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  dashboardLayout?: Record<string, unknown>;
}
