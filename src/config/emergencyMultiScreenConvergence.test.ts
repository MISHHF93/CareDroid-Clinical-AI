import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
} from './routes.config';
import {
  CARE_DROID_SCREEN_MODES,
  CARE_DROID_SCREEN_MODE_REGISTRY,
  canEditInScreenMode,
  getScreenModeDensity,
  getScreenModePhiVisibility,
} from './careDroidScreenModes';
import {
  EMERGENCY_ARCHITECTURE_CLASSIFICATION,
  EMERGENCY_ARCHITECTURE_REGISTRY,
} from './emergencyArchitectureRegistry';
import {
  DEFAULT_SCREEN_MODE_BY_ROLE,
  EMERGENCY_ROLE_ID,
  isPublicDisplayScreenMode,
  resolveEmergencyScreenMode,
  shouldUseMinimalAppChrome,
} from './emergencyRoleScreenMatrix';
import {
  EMERGENCY_PERMISSION_KEYS,
  canPerformEmergencyMutation,
  hasEmergencyPermission,
  isPublicDisplayContext,
} from './emergencyPermissionRegistry';
import { canMutateEmergencySurface } from './emergencyRolePermissions';
import { resolveEmergencyDisplayPrivacyPolicy } from './emergencyDisplayPrivacyPolicy';
import { resolveOperationalPresentation } from './emergencyOperationalPresentationModel';
import { resolveWhiteboardDisplayProfile } from '../hooks/useWhiteboardDisplayMode';
import { EMERGENCY_PAGE_ALL_RENDER_PATHS } from '../data/emergencyPageRenderInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const appSource = readFileSync(join(repoRoot, 'src', 'App.jsx'), 'utf8');
const activeAppShellSource = readFileSync(join(repoRoot, 'src', 'components', 'AppShell.tsx'), 'utf8');

const PRIMARY_SCREEN_MODES = Object.freeze([
  CARE_DROID_SCREEN_MODES.reception,
  CARE_DROID_SCREEN_MODES.triage,
  CARE_DROID_SCREEN_MODES.chargeNurse,
  CARE_DROID_SCREEN_MODES.physician,
  CARE_DROID_SCREEN_MODES.ems,
  CARE_DROID_SCREEN_MODES.commandCenter,
  CARE_DROID_SCREEN_MODES.publicWaiting,
  CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
]);

describe('emergencyMultiScreenConvergence', () => {
  it('uses one AppShell and one mounted Emergency OS route tree', () => {
    expect(appSource).toContain("import { AppShell } from './components/AppShell'");
    expect(appSource.match(/<AppShell>/g)).toHaveLength(1);
    expect(appSource).toContain('<Outlet />');
    expect(activeAppShellSource).toContain('export function AppShell');
    expect(
      CANONICAL_APP_ROUTE_TREE.filter((route) => route.type === 'page').map((route) => route.path),
    ).toEqual(EMERGENCY_PAGE_ALL_RENDER_PATHS);
  });

  it('maps each ED role to a distinct primary screen mode', () => {
    const modes = new Set(Object.values(DEFAULT_SCREEN_MODE_BY_ROLE));
    expect(modes.has(CARE_DROID_SCREEN_MODES.reception)).toBe(true);
    expect(modes.has(CARE_DROID_SCREEN_MODES.triage)).toBe(true);
    expect(modes.has(CARE_DROID_SCREEN_MODES.chargeNurse)).toBe(true);
    expect(modes.has(CARE_DROID_SCREEN_MODES.physician)).toBe(true);
    expect(modes.has(CARE_DROID_SCREEN_MODES.ems)).toBe(true);
    expect(modes.has(CARE_DROID_SCREEN_MODES.commandCenter)).toBe(true);
    expect(resolveEmergencyScreenMode({ role: EMERGENCY_ROLE_ID.registrationClerk })).toBe(
      CARE_DROID_SCREEN_MODES.reception,
    );
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.emergencyWhiteboard,
        role: EMERGENCY_ROLE_ID.chargeNurse,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.chargeNurse);
    expect(
      resolveEmergencyScreenMode({
        displayParam: 'waiting-room',
        role: EMERGENCY_ROLE_ID.readOnlyViewer,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.publicWaiting);
  });

  it('assigns role-appropriate data density per screen mode', () => {
    expect(getScreenModeDensity(CARE_DROID_SCREEN_MODES.reception)).toBe('comfortable');
    expect(getScreenModeDensity(CARE_DROID_SCREEN_MODES.triage)).toBe('compact');
    expect(getScreenModeDensity(CARE_DROID_SCREEN_MODES.chargeNurse)).toBe('compact');
    expect(getScreenModeDensity(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe('wall');
    expect(getScreenModeDensity(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard)).toBe('wall');
    expect(getScreenModeDensity(CARE_DROID_SCREEN_MODES.commandCenter)).toBe('wall');
    PRIMARY_SCREEN_MODES.forEach((mode) => {
      expect(resolveOperationalPresentation(mode).density).toBe(getScreenModeDensity(mode));
    });
  });

  it('blocks clinical mutations on public and read-only display contexts', () => {
    const publicContext = {
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
      displayParam: 'waiting-room',
    };
    expect(isPublicDisplayContext(publicContext)).toBe(true);
    expect(
      canPerformEmergencyMutation(EMERGENCY_ROLE_ID.physician, EMERGENCY_PERMISSION_KEYS.patientCreate, {}, publicContext),
    ).toBe(false);
    expect(
      canPerformEmergencyMutation(EMERGENCY_ROLE_ID.chargeNurse, EMERGENCY_PERMISSION_KEYS.queueMove, {}, publicContext),
    ).toBe(false);
    expect(
      hasEmergencyPermission(EMERGENCY_ROLE_ID.physician, EMERGENCY_PERMISSION_KEYS.patientCreate, {}, publicContext),
    ).toBe(false);
    expect(canMutateEmergencySurface(EMERGENCY_ROLE_ID.physician, publicContext)).toBe(false);

    const publicPrivacy = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
    });
    expect(publicPrivacy.showPatientName).toBe(false);
    expect(publicPrivacy.showMrn).toBe(false);
    expect(publicPrivacy.aggregateMetricsOnly).toBe(true);
    expect(getScreenModePhiVisibility(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe('public_redacted');
  });

  it('keeps wall and kiosk displays read-only while staff screens remain editable', () => {
    expect(canEditInScreenMode(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe(false);
    expect(canEditInScreenMode(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard)).toBe(false);
    expect(canEditInScreenMode(CARE_DROID_SCREEN_MODES.reception)).toBe(true);
    expect(canEditInScreenMode(CARE_DROID_SCREEN_MODES.physician)).toBe(true);

    const wallProfile = resolveWhiteboardDisplayProfile({
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      wallDisplayRefreshInterval: 30000,
      displayQueryReadOnly: true,
    });
    expect(wallProfile.isDisplayMode).toBe(true);
    expect(wallProfile.canMutate).toBe(false);
    expect(wallProfile.autoRefresh).toBe(true);

    const publicProfile = resolveWhiteboardDisplayProfile({
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
      wallDisplayRefreshInterval: 30000,
      displayQueryReadOnly: true,
    });
    expect(publicProfile.isPublicDisplay).toBe(true);
    expect(publicProfile.canMutate).toBe(false);
    expect(isPublicDisplayScreenMode(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe(true);
    expect(shouldUseMinimalAppChrome(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe(true);
  });

  it('routes all screen modes through one registry without orphan definitions', () => {
    const registryIds = new Set(CARE_DROID_SCREEN_MODE_REGISTRY.map((entry) => entry.id));
    PRIMARY_SCREEN_MODES.forEach((mode) => {
      expect(registryIds.has(mode)).toBe(true);
    });
    expect(CARE_DROID_SCREEN_MODE_REGISTRY.length).toBeGreaterThanOrEqual(PRIMARY_SCREEN_MODES.length);
  });

  it('classifies duplicate and legacy artifacts with canonical targets', () => {
    const duplicates = EMERGENCY_ARCHITECTURE_REGISTRY.filter(
      (entry) => entry.classification === EMERGENCY_ARCHITECTURE_CLASSIFICATION.DUPLICATE,
    );
    const legacy = EMERGENCY_ARCHITECTURE_REGISTRY.filter(
      (entry) => entry.classification === EMERGENCY_ARCHITECTURE_CLASSIFICATION.LEGACY,
    );
    duplicates.forEach((entry) => {
      expect(entry.canonical, `${entry.id} should point to canonical`).toBeTruthy();
    });
    legacy.forEach((entry) => {
      expect(entry.canonical, `${entry.id} should point to canonical`).toBeTruthy();
    });
    expect(
      EMERGENCY_ARCHITECTURE_REGISTRY.some((entry) => entry.id === 'emergency-permission-registry'),
    ).toBe(true);
    expect(
      EMERGENCY_ARCHITECTURE_REGISTRY.some((entry) => entry.id === 'operational-presentation-model'),
    ).toBe(true);
  });

  it('uses one operational store and central node on the active whiteboard surface', () => {
    const whiteboardSource = readFileSync(
      join(repoRoot, 'src', 'pages', 'emergency', 'index.tsx'),
      'utf8',
    );
    expect(whiteboardSource).toContain('useEmergencyStore');
    expect(whiteboardSource).toContain('useOperationalIntelligence');
    expect(whiteboardSource).toContain('useWhiteboardDisplayMode');
    expect(whiteboardSource).toContain('OperationalStrip');
    expect(whiteboardSource).not.toContain('EmergencyWhiteboardApp');
  });
});
