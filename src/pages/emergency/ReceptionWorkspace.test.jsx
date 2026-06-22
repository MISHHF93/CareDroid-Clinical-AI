import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const receptionSource = readFileSync(join(__dirname, 'ReceptionWorkspace.jsx'), 'utf8');
const headerSource = readFileSync(join(__dirname, '../../components/Header.tsx'), 'utf8');
const appShellSource = readFileSync(join(__dirname, '../../components/AppShell.tsx'), 'utf8');
const appSource = readFileSync(join(__dirname, '../../App.jsx'), 'utf8');

describe('Reception-first experience wiring', () => {
  it('exposes the arrival dashboard without duplicate page search', () => {
    expect(receptionSource).toContain('ArrivalDashboard');
    expect(receptionSource).toContain('ReceptionOperationalStrip');
    expect(receptionSource).toContain('handleProvisionalIntake');
    expect(receptionSource).toContain('useReceptionSnapshotPolling');
    expect(receptionSource).toContain('PreparePatientChooser');
    expect(receptionSource).toContain('onQuickCreate');
    expect(receptionSource).toContain('open-reception-quick-create');
    expect(receptionSource).toContain('DuplicatePatientBanner');
    expect(receptionSource).toContain('convertEmsArrivalForReception');
    expect(receptionSource).toContain('findDuplicateCandidatesFromQuery');
    expect(receptionSource).toContain('ReceptionSearchHint');
    expect(receptionSource).toContain('RECEPTION_COPY');
    expect(receptionSource).toContain('registerWalkIn');
    expect(receptionSource).toContain('checkIdentity');
    expect(receptionSource).toContain('useReceptionScreen');
    expect(receptionSource).toContain('reception.showWidget');
    expect(receptionSource).toContain('canOpenSmartIntake');
    expect(receptionSource).not.toContain('buildPostHandoffNavigationPaths');
  });

  it('uses header lookup as the primary reception search surface', () => {
    expect(headerSource).toContain('useScreenModeCapabilities');
    expect(headerSource).toContain('syncPatientLookupQuery');
    expect(headerSource).toContain('focus-reception-search');
    expect(headerSource).toContain('open-reception-intake');
    expect(headerSource).toContain('PatientSearchResults');
    expect(headerSource).toContain('Operational search');
    expect(headerSource).toContain('screenCapabilities.productLabel');
  });

  it('gates clinical overlays for registration screen mode', () => {
    expect(appShellSource).toContain('useScreenModeCapabilities');
    expect(appShellSource).toContain('showEmsCriticalOverlay');
    expect(appShellSource).toContain('getReceptionPrimaryCreatePath');
  });

  it('redirects registration clerk away from whiteboard routes', () => {
    expect(appSource).toContain('EMERGENCY_ROLE_IDS.registrationClerk');
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyReception');
  });

  it('routes standalone intake through reception for arrival-first roles', () => {
    expect(appSource).toContain('EmergencyIntakeEntry');
    expect(appSource).toContain('getReceptionEmbeddedIntakePath');
  });
});
