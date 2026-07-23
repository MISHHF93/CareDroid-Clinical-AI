/**
 * Platform wiring contract — keeps reception desk + shared ED surfaces
 * connected to routes, nav, permissions, and offline-safe data paths.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES, CANONICAL_ROUTE_MAP } from './routes.config';
import {
  HOSPITAL_ROLE_NAV_IDS,
  HOSPITAL_ROLE_HOME_ROUTES,
  getNavItemIdsForRole,
  roleNavIncludesCollaboration,
} from './roleClusterNav.config';
import {
  EMERGENCY_ROLE_IDS,
  EMERGENCY_ROLE_DEFINITIONS,
  canAccessEmergencyRoute,
} from './emergencyRolePermissions';
import {
  CAREDROID_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasCareDroidPermission,
} from '../lib/users/permissions';
import { BACKEND_API_CAPABILITY_STATUS } from './backendApiCapabilities';
import type { HospitalRole } from '../lib/users/userTypes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

function registryById(id: string) {
  return CANONICAL_ROUTE_MAP.find((route: any) => route.id === id);
}

describe('platform wiring — registration clerk / reception desk', () => {
  const clerkNav = HOSPITAL_ROLE_NAV_IDS.registration_clerk;
  const clerkEmergency = EMERGENCY_ROLE_DEFINITIONS[EMERGENCY_ROLE_IDS.registrationClerk];
  const clerkPerms = ROLE_PERMISSIONS.registration_clerk;

  it('homes registration clerk on reception', () => {
    expect(HOSPITAL_ROLE_HOME_ROUTES.registration_clerk).toBe(CANONICAL_ROUTES.emergencyReception);
  });

  it('nav cluster items resolve to registry routes with components', () => {
    expect(clerkNav.length).toBeGreaterThan(0);
    for (const id of clerkNav) {
      const route = registryById(id);
      expect(route, `missing registry route for nav id ${id}`).toBeTruthy();
      expect(route?.path, `missing path for ${id}`).toBeTruthy();
      if (route?.type === 'page') {
        expect(route.pageComponent, `missing pageComponent for ${id}`).toBeTruthy();
      }
    }
  });

  it('emergency role routes cover reception, patients, alerts, collaboration, help', () => {
    const paths = clerkEmergency.routes as string[];
    expect(paths).toContain(CANONICAL_ROUTES.emergencyReception);
    expect(paths).toContain(CANONICAL_ROUTES.emergencyPatients);
    expect(paths).toContain(CANONICAL_ROUTES.emergencyCollaboration);
    expect(paths).toContain(CANONICAL_ROUTES.emergencyAlerts);
    expect(paths.some((p) => p.includes('help'))).toBe(true);
  });

  it('grants collaboration + patient create + alert read for desk work', () => {
    expect(clerkPerms).toContain(CAREDROID_PERMISSIONS.COLLABORATION_READ);
    expect(clerkPerms).toContain(CAREDROID_PERMISSIONS.COLLABORATION_POST);
    expect(clerkPerms).toContain(CAREDROID_PERMISSIONS.PATIENT_CREATE);
    expect(clerkPerms).toContain(CAREDROID_PERMISSIONS.PATIENT_READ);
    expect(clerkPerms).toContain(CAREDROID_PERMISSIONS.ALERT_READ);
    expect(clerkPerms).toContain(CAREDROID_PERMISSIONS.DOCUMENT_CAPTURE);
  });

  it('router mounts collaboration and reception pages', () => {
    const router = read('app/router.tsx');
    expect(router).toContain('CANONICAL_ROUTES.emergencyCollaboration');
    expect(router).toContain('CollaborationHub');
    expect(router).toContain('CANONICAL_ROUTES.emergencyReception');
    expect(router).toContain('ReceptionWorkspace');
  });
});

describe('platform wiring — offline / demo safe surfaces', () => {
  it('collaboration hub has local catalog seed path', () => {
    expect(existsSync(join(root, 'services/collaborationLocalCatalog.ts'))).toBe(true);
    const hub = read('pages/collaboration/CollaborationHub.tsx');
    expect(hub).toContain('buildLocalCollaborationSeed');
    expect(hub).toContain('hasCollaborationLiveAuth');
  });

  it('reception has attention + interactive queue models', () => {
    expect(existsSync(join(root, 'components/reception/receptionAttentionModel.ts'))).toBe(true);
    const workspace = read('pages/emergency/ReceptionWorkspace.tsx');
    expect(workspace).toContain('buildReceptionAttentionSnapshot');
    expect(workspace).toContain('ReceptionPatientTaskSheet');
    expect(workspace).toContain('ReceptionOperationalRail');
  });

  it('smart intake soft-fails to local demo when identity session API is offline', () => {
    const api = read('services/smartIntakeApi.ts');
    expect(api).toContain('demoSessionResult');
    expect(api).toContain('localDemo');
    expect(api).toContain('SMART_INTAKE_DEMO');
    expect(api).not.toMatch(
      /if \(!isBackendCapabilityEnabled\('emergencySmartIntakeIdentitySession'\)\) \{\s*throw new Error/,
    );
  });

  it('emergency store seeds patients for desk continuity', () => {
    const store = read('store/emergencyStore.ts');
    expect(store).toContain('SEED_PATIENTS');
    expect(store).toMatch(/patients:\s*initialScenarioState\.patients\s*\|\|\s*SEED_PATIENTS/);
  });

  it('clinical alerts page falls back to emergency store when API soft', () => {
    const page = read('pages/ClinicalAlertsPage.tsx');
    expect(page).toContain('useEmergencyStore');
    expect(page).toContain('storeAlerts');
    expect(page).toContain('syncClinicalAlertsFromBackend');
  });

  it('marks collaboration hub and reception handoff as real platform capabilities', () => {
    expect(BACKEND_API_CAPABILITY_STATUS.collaborationHub).toBe('real');
    expect(BACKEND_API_CAPABILITY_STATUS.emergencyReceptionHandoff).toBe('real');
  });
});

describe('platform wiring — patient card dual-mode pills', () => {
  it('re-asserts dual-mode pills after design-system cascade', () => {
    const main = read('main.tsx');
    expect(main).toContain('cdl-v2/pills.css');
    expect(main.indexOf('design-system.css')).toBeLessThan(main.lastIndexOf('cdl-v2/pills.css'));
    const pills = read('styles/cdl-v2/pills.css');
    expect(pills).toContain("html[data-theme='dark']");
    expect(pills).toContain('--cdl-pill-critical-fg');
  });
});

describe('platform wiring — collaboration hub across all profiles', () => {
  const collabPath = CANONICAL_ROUTES.emergencyCollaboration;
  const hospitalRoles = Object.keys(ROLE_PERMISSIONS) as HospitalRole[];

  it('every hospital role with collaboration:read has collaboration in sidebar nav', () => {
    for (const role of hospitalRoles) {
      if (!hasCareDroidPermission(role, CAREDROID_PERMISSIONS.COLLABORATION_READ)) continue;
      expect(
        roleNavIncludesCollaboration(role),
        `role ${role} has COLLABORATION_READ but nav omits collaboration`,
      ).toBe(true);
      expect(getNavItemIdsForRole(role)).toContain('collaboration');
    }
  });

  it('every ED/staff HOSPITAL_ROLE_NAV_IDS list includes collaboration (not public wall)', () => {
    for (const [role, ids] of Object.entries(HOSPITAL_ROLE_NAV_IDS)) {
      if (role === 'public_waiting') {
        expect(ids.includes('collaboration'), 'public wall must not expose staff chat').toBe(false);
        continue;
      }
      const list = ids as readonly string[];
      expect(list.includes('collaboration'), `nav list for ${role}`).toBe(true);
    }
  });

  it('IT admin emergency definition allows collaboration route', () => {
    const itAdmin = EMERGENCY_ROLE_DEFINITIONS[EMERGENCY_ROLE_IDS.itAdmin];
    expect(itAdmin.routes).toContain(collabPath);
    expect(canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.itAdmin, collabPath)).toBe(true);
  });

  it('clinical and ops emergency roles can access collaboration', () => {
    const rolesWithCollab = [
      EMERGENCY_ROLE_IDS.admin,
      EMERGENCY_ROLE_IDS.edManager,
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.registrationClerk,
      EMERGENCY_ROLE_IDS.emsUser,
      EMERGENCY_ROLE_IDS.dispatcher,
      EMERGENCY_ROLE_IDS.emsCoordinator,
      EMERGENCY_ROLE_IDS.readOnlyViewer,
    ];
    for (const role of rolesWithCollab) {
      expect(canAccessEmergencyRoute(role, collabPath), role).toBe(true);
    }
  });

  it('local catalog seeds role-preferred channels for major profiles', () => {
    const catalog = read('services/collaborationLocalCatalog.ts');
    expect(catalog).toContain("departmentKey: 'it_operations'");
    expect(catalog).toContain("departmentKey: 'reception'");
    expect(catalog).toContain("departmentKey: 'triage'");
    expect(catalog).toContain("departmentKey: 'charge_nurses'");
    expect(catalog).toContain("departmentKey: 'physicians'");
    expect(catalog).toContain("departmentKey: 'ems'");
    expect(catalog).toContain("departmentKey: 'pharmacy'");
    expect(catalog).toContain('registration_clerk');
    expect(catalog).toContain('it_admin');
    expect(catalog).toContain('departmentChannelsForRole');
  });
});
