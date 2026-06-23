import { describe, expect, it } from 'vitest';
import {
  SURVEILLANCE_APPROVAL_DOMAINS,
  SURVEILLANCE_KPI_ARTIFACTS,
  SURVEILLANCE_NEXUS_ROUTES,
  SURVEILLANCE_PERMISSION_KEYS,
  resolveSurveillancePermissionsForRole,
} from './surveillanceNexusModel';

describe('surveillanceNexusModel', () => {
  it('defines nexus routes for hospital, fleet, security, and trackmind', () => {
    const routes = SURVEILLANCE_NEXUS_ROUTES.map((entry) => entry.route);
    expect(routes).toContain('/surveillance/nexus');
    expect(routes).toContain('/hospital-map');
    expect(routes).toContain('/fleet/command');
    expect(routes).toContain('/trackmind');
  });

  it('grants security manager camera and incident permissions', () => {
    const grants = resolveSurveillancePermissionsForRole('security_manager');
    expect(grants).toContain(SURVEILLANCE_PERMISSION_KEYS.cameraRegistryManage);
    expect(grants).toContain(SURVEILLANCE_PERMISSION_KEYS.incidentLink);
  });

  it('grants welfare officer nexus view without camera manage', () => {
    const grants = resolveSurveillancePermissionsForRole('equine_welfare_officer');
    expect(grants).toContain(SURVEILLANCE_PERMISSION_KEYS.nexusView);
    expect(grants).not.toContain(SURVEILLANCE_PERMISSION_KEYS.cameraRegistryManage);
  });

  it('covers KPI artifacts and approval domains', () => {
    expect(SURVEILLANCE_KPI_ARTIFACTS.length).toBeGreaterThanOrEqual(5);
    expect(SURVEILLANCE_APPROVAL_DOMAINS).toContain('welfare_safe_stream_access');
  });
});
