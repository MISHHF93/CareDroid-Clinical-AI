/**
 * Filters operations hub cards and drilldowns by SaaS profile route access.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  compileUserProfile,
  isRouteAllowedInCompiledProfile,
  isToolLaunchableForProfile,
} from './userProfileCompiler';
import { resolveUserProfileFromSaasRole } from './userProfileCatalog';

export type OperationArea = Readonly<{
  title: string;
  body: string;
  path: string;
  toolId?: string;
  icon?: string;
  label?: string;
}>;

export function isOperationAreaVisible(saasRole: string, area: OperationArea): boolean {
  const compiled = compileUserProfile({ saasRole });
  if (!isRouteAllowedInCompiledProfile(area.path, compiled)) return false;
  if (area.toolId && !isToolLaunchableForProfile(area.toolId, compiled)) return false;
  return true;
}

export function filterOperationAreas<T extends OperationArea>(
  saasRole: string,
  areas: readonly T[],
): T[] {
  return areas.filter((area) => isOperationAreaVisible(saasRole, area));
}

export function resolveOperationsResonanceTitle(saasRole: string): string {
  const profile = resolveUserProfileFromSaasRole(saasRole);
  if (profile.domain === 'trackmind') return 'TrackMind operations';
  if (profile.domain === 'operations') return 'Hospital & fleet operations';
  if (profile.domain === 'governance') return 'Command & governance operations';
  return 'Clinical operations';
}

export function resolveOperationsResonanceDescription(saasRole: string): string {
  const profile = resolveUserProfileFromSaasRole(saasRole);
  return profile.profileBenefits;
}

export const OPERATIONS_ASSISTANT_ROUTE = CANONICAL_ROUTES.assistant;
