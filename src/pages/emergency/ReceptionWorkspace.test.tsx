import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const receptionSource = readFileSync(join(__dirname, 'ReceptionWorkspace.tsx'), 'utf8');
const orchestratorSource = readFileSync(join(__dirname, '../../services/receptionIntakeOrchestrator.ts'), 'utf8');
const navSource = readFileSync(join(__dirname, '../../config/emergencyNavPolicy.ts'), 'utf8');
const permissionsSource = readFileSync(join(__dirname, '../../config/emergencyRolePermissions.ts'), 'utf8');
const appSource = readFileSync(join(__dirname, '../../app/router.tsx'), 'utf8');

describe('Reception Command Desk wiring', () => {
  it('mounts one command-desk workflow on the active reception route', () => {
    expect(receptionSource).toContain('Reception Command Desk');
    expect(receptionSource).toContain('Fast Arrival Capture');
    expect(receptionSource).toContain('Minimum Life-Critical Intake');
    expect(receptionSource).toContain('AI Intake Assist');
    expect(receptionSource).toContain('Reception Queue');
    expect(receptionSource).toContain('Critical Reception Alerts');
    expect(receptionSource).toContain('Start 3-Minute Response');
    expect(receptionSource).toContain('Create Patient & Route');
    expect(receptionSource).not.toContain('ReceptionQuickIntake');
    expect(receptionSource).not.toContain('QuickIntake');
    expect(receptionSource).not.toContain('PreparePatientChooser');
  });

  it('uses the unified reception intake orchestrator from the UI', () => {
    expect(receptionSource).toContain('createPatientAndRouteFromReception');
    expect(orchestratorSource).toContain('runReceptionAiIntakeAssist');
    expect(orchestratorSource).toContain('completeReceptionHandoff');
    expect(orchestratorSource).toContain('startResponseTimer');
    expect(orchestratorSource).toContain('reception-critical-intake');
    expect(orchestratorSource).toContain('canReceptionPerformClinicalOverride');
  });

  it('defines the reception profile around reception, patients, queues, intake support, and help', () => {
    expect(permissionsSource).toContain('emergency_receptionist');
    expect(permissionsSource).toContain('ROUTES.queues');
    expect(permissionsSource).toContain('ROUTES.help');
    expect(navSource).toContain("registration_clerk: ['reception', 'patients', 'queues', 'help']");
    expect(navSource).toContain("'intake'");
    expect(navSource).toContain("'settings'");
    expect(navSource).toContain("'analytics'");
  });

  it('keeps standalone intake routed through reception for front-door roles', () => {
    expect(appSource).toContain('EmergencyIntakeEntry');
    expect(appSource).toContain('getReceptionEmbeddedIntakePath');
    expect(appSource).toContain('<ReceptionWorkspace />');
  });
});
