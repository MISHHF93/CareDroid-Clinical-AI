import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  TRACKMIND_ROLE_ID,
  listTrackMindRoleIds,
  normalizeTrackMindRoleId,
} from './trackMindRoleCatalog';
import {
  TRACKMIND_PERMISSION_KEYS,
  TRACKMIND_ROLE_PERMISSION_GRANTS,
  canAccessTrackMindRoute,
  hasTrackMindPermission,
} from './trackMindPermissionRegistry';
import {
  canAccessTrackMindSurface,
  listTrackMindRoutesForRole,
  resolveTrackMindRoleId,
} from './trackMindRolePermissions';
import { resolveTrackMindRoleLandingRoute } from './trackMindRoleNavigationModel';
import { canViewTrackMindPrivacyScope } from './trackMindPrivacyScope';
import { canExportTrackMindAudit, canViewTrackMindAuditArtifact } from './trackMindAuditVisibility';
import { canPerformTrackMindApprovalCapability } from './trackMindApprovalGovernance';
import { canAccessTrackMindEntityCapability } from './trackMindEntityVisibility';
import { resolveTrackMindKpisForRole } from './trackMindKpiPolicy';
import { filterTrackMindIntelligenceModules } from './trackMindModuleAccess';
import { PLATFORM_INTELLIGENCE_MODULES } from './platformIntelligenceRegistry';

describe('trackMindRoleCatalog', () => {
  it('defines exactly 20 canonical roles', () => {
    expect(listTrackMindRoleIds()).toHaveLength(20);
  });

  it('normalizes legacy aliases', () => {
    expect(normalizeTrackMindRoleId('platform-admin')).toBe(TRACKMIND_ROLE_ID.platformSuperAdmin);
    expect(normalizeTrackMindRoleId('compliance-officer')).toBe(
      TRACKMIND_ROLE_ID.complianceOfficer,
    );
    expect(normalizeTrackMindRoleId('fleet-operator')).toBe(TRACKMIND_ROLE_ID.facilitiesManager);
  });
});

describe('trackMind permission matrix completeness', () => {
  it('grants every role at least workspace view', () => {
    for (const roleId of listTrackMindRoleIds()) {
      const grants = TRACKMIND_ROLE_PERMISSION_GRANTS[roleId];
      expect(grants.length).toBeGreaterThan(0);
      expect(grants).toContain(TRACKMIND_PERMISSION_KEYS.workspaceView);
    }
  });

  it('blocks generic staff from enterprise and intelligence hubs', () => {
    expect(
      canAccessTrackMindRoute(TRACKMIND_ROLE_ID.genericStaff, CANONICAL_ROUTES.enterprisePlatform),
    ).toBe(false);
    expect(
      canAccessTrackMindRoute(
        TRACKMIND_ROLE_ID.genericStaff,
        CANONICAL_ROUTES.platformIntelligence,
      ),
    ).toBe(false);
  });

  it('allows stewards into workspace but not platform admin', () => {
    expect(
      canAccessTrackMindRoute(TRACKMIND_ROLE_ID.steward, CANONICAL_ROUTES.trackMindWorkspace),
    ).toBe(true);
    expect(canAccessTrackMindRoute(TRACKMIND_ROLE_ID.steward, CANONICAL_ROUTES.platformAdmin)).toBe(
      false,
    );
  });
});

describe('trackMind role landing routes', () => {
  it('lands race-day managers in the workspace', () => {
    expect(resolveTrackMindRoleLandingRoute(TRACKMIND_ROLE_ID.raceDayOperationsManager)).toBe(
      CANONICAL_ROUTES.trackMindWorkspace,
    );
  });

  it('lands executives on executive dashboard', () => {
    expect(resolveTrackMindRoleLandingRoute(TRACKMIND_ROLE_ID.executiveLeadership)).toBe(
      CANONICAL_ROUTES.executive,
    );
  });

  it('lands compliance officers on governance registry', () => {
    expect(resolveTrackMindRoleLandingRoute(TRACKMIND_ROLE_ID.complianceOfficer)).toBe(
      CANONICAL_ROUTES.governanceRegistry,
    );
  });
});

describe('trackMind privacy and audit governance', () => {
  it('restricts veterinary records from generic staff', () => {
    expect(canViewTrackMindPrivacyScope(TRACKMIND_ROLE_ID.genericStaff, 'veterinary_medical')).toBe(
      false,
    );
    expect(canViewTrackMindPrivacyScope(TRACKMIND_ROLE_ID.veterinarian, 'veterinary_medical')).toBe(
      true,
    );
  });

  it('allows auditors to export audit evidence', () => {
    const can = (permission: string) =>
      hasTrackMindPermission(TRACKMIND_ROLE_ID.auditorRegulator, permission);
    expect(canExportTrackMindAudit(TRACKMIND_ROLE_ID.auditorRegulator, can)).toBe(true);
    expect(canViewTrackMindAuditArtifact(TRACKMIND_ROLE_ID.auditorRegulator, 'compliance')).toBe(
      true,
    );
  });

  it('blocks executive read-only from veterinary write entity capability', () => {
    expect(
      canAccessTrackMindEntityCapability(
        TRACKMIND_ROLE_ID.executiveLeadership,
        'veterinary_record',
        'create',
      ),
    ).toBe(false);
  });
});

describe('trackMind approval authority', () => {
  it('allows stewards to request and review approvals', () => {
    const can = (permission: string) =>
      hasTrackMindPermission(TRACKMIND_ROLE_ID.steward, permission);
    expect(canPerformTrackMindApprovalCapability(TRACKMIND_ROLE_ID.steward, 'request', can)).toBe(
      true,
    );
    expect(canPerformTrackMindApprovalCapability(TRACKMIND_ROLE_ID.steward, 'review', can)).toBe(
      true,
    );
  });

  it('blocks generic staff from approval decisions', () => {
    const can = (permission: string) =>
      hasTrackMindPermission(TRACKMIND_ROLE_ID.genericStaff, permission);
    expect(
      canPerformTrackMindApprovalCapability(TRACKMIND_ROLE_ID.genericStaff, 'approve', can),
    ).toBe(false);
  });
});

describe('trackMind dashboard resonance', () => {
  it('surfaces race-day KPIs for operations managers', () => {
    const can = (permission: string) =>
      hasTrackMindPermission(TRACKMIND_ROLE_ID.raceDayOperationsManager, permission);
    const kpis = resolveTrackMindKpisForRole(TRACKMIND_ROLE_ID.raceDayOperationsManager, can);
    expect(kpis.map((kpi) => kpi.id)).toEqual(
      expect.arrayContaining(['race_readiness', 'pending_approvals', 'open_incidents']),
    );
  });

  it('filters intelligence modules for veterinarians', () => {
    const can = (permission: string) =>
      hasTrackMindPermission(TRACKMIND_ROLE_ID.veterinarian, permission);
    const modules = filterTrackMindIntelligenceModules(PLATFORM_INTELLIGENCE_MODULES, can);
    expect(modules.length).toBeLessThan(PLATFORM_INTELLIGENCE_MODULES.length);
    expect(modules.find((module) => module.id === 'saas_operations')).toBeUndefined();
  });
});

describe('trackMind user role resolution', () => {
  it('prefers explicit trackMindRole on user profile', () => {
    expect(
      resolveTrackMindRoleId({
        role: 'registration_clerk',
        trackMindRole: TRACKMIND_ROLE_ID.steward,
      }),
    ).toBe(TRACKMIND_ROLE_ID.steward);
  });

  it('lists allowed routes per role', () => {
    const routes = listTrackMindRoutesForRole(TRACKMIND_ROLE_ID.dataAnalyticsUser);
    expect(routes).toContain(CANONICAL_ROUTES.platformIntelligence);
    expect(
      canAccessTrackMindSurface(TRACKMIND_ROLE_ID.dataAnalyticsUser, CANONICAL_ROUTES.audit),
    ).toBe(false);
  });
});
