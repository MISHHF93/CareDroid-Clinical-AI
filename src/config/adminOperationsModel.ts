/**
 * Admin operations home — sections gated by SaaS profile route access.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { compileUserProfile, isRouteAllowedInCompiledProfile } from './userProfileCompiler';

export type AdminOpsSectionId =
  | 'ed-workflows'
  | 'surveillance-iot'
  | 'platform-health'
  | 'team'
  | 'tenant'
  | 'organization';

export type AdminOpsLink = Readonly<{
  route: string;
  label: string;
}>;

export type AdminOpsSection = Readonly<{
  id: AdminOpsSectionId;
  title: string;
  description: string;
  primaryLink: AdminOpsLink;
  secondaryLinks?: readonly AdminOpsLink[];
}>;

export const ADMIN_OPS_SECTIONS: readonly AdminOpsSection[] = Object.freeze([
  {
    id: 'ed-workflows',
    title: 'ED staff & workflows',
    description:
      'Map reception, triage, waiting room, provider, and command workflows to canonical SaaS roles and CareDroid screens.',
    primaryLink: {
      route: CANONICAL_ROUTES.adminEdStaff,
      label: 'Manage ED workflows →',
    },
  },
  {
    id: 'surveillance-iot',
    title: 'Surveillance & IoT platform',
    description:
      'Camera registry, IoT devices, facility zones, health monitoring, and TrackMind Nexus integration posture.',
    primaryLink: {
      route: CANONICAL_ROUTES.surveillanceNexus,
      label: 'Open surveillance nexus →',
    },
    secondaryLinks: [
      { route: CANONICAL_ROUTES.medicalIot, label: 'Medical IoT registry' },
      { route: CANONICAL_ROUTES.hospitalMap, label: 'Hospital map' },
      { route: CANONICAL_ROUTES.fleetCommand, label: 'Fleet live tracking' },
    ],
  },
  {
    id: 'platform-health',
    title: 'Platform system health',
    description: 'Integration hub, telemetry capability labels, and operational system status.',
    primaryLink: {
      route: CANONICAL_ROUTES.systemHealth,
      label: 'System health →',
    },
    secondaryLinks: [{ route: CANONICAL_ROUTES.saasHealth, label: 'SaaS health center →' }],
  },
  {
    id: 'team',
    title: 'Team & invitations',
    description: 'Invite clinicians, assign roles, and review membership for the emergency department.',
    primaryLink: {
      route: `${CANONICAL_ROUTES.adminOperations}/team`,
      label: 'Open team management →',
    },
  },
  {
    id: 'tenant',
    title: 'Tenant administration',
    description:
      'Role access preview, workspace defaults, branding, integrations, and permission overrides.',
    primaryLink: {
      route: `${CANONICAL_ROUTES.adminOperations}/tenant`,
      label: 'Tenant settings →',
    },
  },
  {
    id: 'organization',
    title: 'Organization dashboard',
    description: 'Packs, assets, departments, and service-line rollout for hospital operations.',
    primaryLink: {
      route: CANONICAL_ROUTES.organization,
      label: 'Organization →',
    },
  },
]);

function sectionRoutes(section: AdminOpsSection): string[] {
  return [
    section.primaryLink.route,
    ...(section.secondaryLinks?.map((link) => link.route) || []),
  ];
}

export function isAdminOpsSectionVisible(saasRole: string, section: AdminOpsSection): boolean {
  const compiled = compileUserProfile({ saasRole });
  return sectionRoutes(section).some((route) => isRouteAllowedInCompiledProfile(route, compiled));
}

export function getVisibleAdminOpsSections(saasRole: string): AdminOpsSection[] {
  return ADMIN_OPS_SECTIONS.filter((section) => isAdminOpsSectionVisible(saasRole, section));
}

export function filterAdminOpsLinks(
  saasRole: string,
  links: readonly AdminOpsLink[],
): AdminOpsLink[] {
  const compiled = compileUserProfile({ saasRole });
  return links.filter((link) => isRouteAllowedInCompiledProfile(link.route, compiled));
}
