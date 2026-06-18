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
    expect(receptionSource).toContain('EmsPreArrivalPanel');
    expect(receptionSource).toContain('useReceptionSnapshotPolling');
    expect(receptionSource).toContain('PreparePatientChooser');
    expect(receptionSource).not.toContain('className="reception-workspace__search"');
    expect(receptionSource).not.toContain('reception-workspace__hero');
    expect(receptionSource).toContain('ReceptionWorkQueues');
    expect(receptionSource).not.toContain('reception-workspace__actions--secondary');
    expect(receptionSource).not.toContain('reception-workspace__actions"');
    expect(receptionSource).toContain('open-reception-prepare');
  });

  it('uses header lookup as the primary reception search surface', () => {
    expect(headerSource).toContain('useScreenModeCapabilities');
    expect(headerSource).toContain('syncPatientLookupQuery');
    expect(headerSource).toContain('focus-reception-search');
    expect(headerSource).toContain('open-reception-prepare');
    expect(headerSource).toContain('screenCapabilities.productLabel');
  });

  it('gates clinical overlays for registration screen mode', () => {
    expect(appShellSource).toContain('useScreenModeCapabilities');
    expect(appShellSource).toContain('showEmsCriticalOverlay');
    expect(appShellSource).toContain('showReassessmentEngine');
  });

  it('redirects registration clerk away from whiteboard routes', () => {
    expect(appSource).toContain('EMERGENCY_ROLE_IDS.registrationClerk');
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyReception');
  });
});
