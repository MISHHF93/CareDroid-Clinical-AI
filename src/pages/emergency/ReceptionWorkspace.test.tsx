import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const receptionSource = readFileSync(join(__dirname, 'ReceptionWorkspace.tsx'), 'utf8');
const unifiedIntakeSource = readFileSync(join(__dirname, '../../components/reception/UnifiedIntakePanel.tsx'), 'utf8');
const orchestratorSource = readFileSync(join(__dirname, '../../services/receptionIntakeOrchestrator.ts'), 'utf8');
const navSource = readFileSync(join(__dirname, '../../config/roleClusterNav.config.ts'), 'utf8');
const permissionsSource = readFileSync(join(__dirname, '../../config/emergencyRolePermissions.ts'), 'utf8');
const appSource = readFileSync(join(__dirname, '../../app/router.tsx'), 'utf8');

describe('Reception front door wiring', () => {
  it('mounts one front-door workflow on the active reception route', () => {
    expect(receptionSource).toContain('reception-front-door');
    expect(receptionSource).toContain('RECEPTION_COPY');
    expect(receptionSource).toContain('UnifiedIntakePanel');
    expect(receptionSource).toContain('ReceptionPatientTaskSheet');
    expect(receptionSource).toContain('buildReceptionAttentionSnapshot');
    expect(receptionSource).toContain('ReceptionSmartIntakeOverlay');
    expect(receptionSource).toContain('PreparePatientChooser');
    expect(receptionSource).toContain('ReceptionOperationalRail');
    expect(receptionSource).not.toContain('ReceptionEscalationAttentionStrip');
    expect(unifiedIntakeSource).toContain('Life-critical intake');
    expect(unifiedIntakeSource).toContain('UnifiedIntakePanel.css');
    expect(receptionSource).toContain('createPatientAndRouteFromReception');
    expect(receptionSource).not.toContain('ReceptionQuickIntake');
    expect(receptionSource).not.toContain('QuickIntake');
  });

  it('create-patient surface uses CDL dual-mode theme (not forced chalk white)', () => {
    const theme = readFileSync(
      join(__dirname, '../../styles/reception-desk-theme.css'),
      'utf8',
    );
    const chooserCss = readFileSync(
      join(__dirname, '../../components/reception/PreparePatientChooser.css'),
      'utf8',
    );
    expect(theme).toContain('--cdl-surface-card');
    expect(theme).toContain('--cdl-brand-600');
    expect(theme).toContain("html[data-theme='dark']");
    // Legacy theme forced pure white on every panel/button — must not return
    expect(theme).not.toMatch(/\.reception-workspace\s+\[class\*="card"\][\s\S]{0,80}background:\s*#ffffff/);
    expect(chooserCss).toContain('--cdl-surface-card');
    expect(chooserCss).toContain('--cdl-info-bg');
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
    expect(navSource).toContain('registration_clerk');
    expect(navSource).toContain('reception');
    expect(navSource).toContain('queues');
    expect(navSource).toContain("'settings'");
    expect(navSource).toContain("'analytics'");
  });

  it('keeps standalone intake routed through reception for front-door roles', () => {
    expect(appSource).toContain('EmergencyIntakeEntry');
    expect(appSource).toContain('getReceptionEmbeddedIntakePath');
    expect(appSource).toContain('<ReceptionWorkspace />');
  });
});
