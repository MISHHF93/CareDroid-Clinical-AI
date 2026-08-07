import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Backs OrganizationsController.updateFeatureFlags -- one of the 7
 * deliberately-deferred entries in body-validation-coverage.spec.ts's
 * baseline, closed 2026-08-06 after checking it wasn't actually one of the
 * large nested-settings-blob cases the other 6 remain deferred for. Mirrors
 * FeatureFlagService's own already-declared FeatureFlagUpdateInput
 * (backend/src/modules/platform-assets/feature-flag.service.ts) field-for-
 * field. `updatedBy` is deliberately omitted: the controller always
 * overwrites it with the authenticated user's id
 * (`{...update, updatedBy: user.id}` in OrganizationsService.
 * updateFeatureFlagAdministration), so a client-supplied value would be
 * discarded anyway. A frontend sweep of platformAssetsApi.ts's
 * updateFeatureFlag() found zero real callers today -- real, wired code
 * with no UI trigger yet, same pattern as several prior cycles.
 */
export class UpdateFeatureFlagsDto {
  @IsIn(['tenant', 'workspace', 'role', 'beta', 'internal']) scope!:
    | 'tenant'
    | 'workspace'
    | 'role'
    | 'beta'
    | 'internal';
  @IsString() @IsNotEmpty() flagId!: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() workspaceId?: string | null;
  @IsOptional() @IsString() role?: string | null;
  @IsOptional() @IsBoolean() reset?: boolean;
}
