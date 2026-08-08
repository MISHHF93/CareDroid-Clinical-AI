import { IsArray, IsObject, IsOptional } from 'class-validator';
import { UpdateOrganizationDto } from './update-organization.dto';

/**
 * PATCH :organizationId/settings's real payload shape: the name/organizationType/
 * country/branding/settings fields already validated by UpdateOrganizationDto, plus
 * subscription/integrations -- both read directly by
 * OrganizationsService.updateOrganizationSettings and sent by the one real frontend
 * caller (OrganizationPages.tsx's saveOrganization).
 */
export class UpdateOrganizationSettingsDto extends UpdateOrganizationDto {
  @IsOptional()
  @IsObject()
  subscription?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  integrations?: unknown[];
}
