import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designSystemCss = readFileSync(join(__dirname, 'design-system.css'), 'utf8');
const sweepCss = readFileSync(join(__dirname, 'clinical-page-sweep.css'), 'utf8');
const visualConsistencyCss = readFileSync(join(__dirname, 'visual-consistency.css'), 'utf8');
const routerSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');

const SHELL_PAGE_FAMILIES = [
  'emergency-whiteboard-page',
  'ems-pipeline',
  'dispatch-console',
  'reception-workspace',
  'emergency-route-page',
  'clinical-alerts-page',
  'tools-overview',
  'clinical-tool-catalog',
  'integration-hub-page',
  'system-health-page',
  'profile-page',
  'hospital-command-center',
  'smart-intake',
  'referral-panel',
  'emergency-analytics',
  'emergency-settings',
  'shift-summary',
  'emergency-pulse',
  'platform-entry',
  'platform-settings-page',
  'settings-page',
  'help-center-page',
];

describe('clinical page sweep', () => {
  it('loads the sweep layer after operational flow polish', () => {
    const flowIndex = designSystemCss.indexOf("@import './clinical-operational-flow.css'");
    const sweepIndex = designSystemCss.indexOf("@import './clinical-page-sweep.css'");
    expect(flowIndex).toBeGreaterThan(-1);
    expect(sweepIndex).toBeGreaterThan(flowIndex);
  });

  it('replaces flat visual-consistency cards with clinical elevation', () => {
    expect(visualConsistencyCss).toContain('--cdl-clinical-shadow-rest');
    expect(visualConsistencyCss).toMatch(
      /\[class\$='-card'\][\s\S]*box-shadow:\s*var\(--cdl-clinical-shadow-rest/,
    );
  });

  it('covers major shell route families in one sweep layer', () => {
    SHELL_PAGE_FAMILIES.forEach((family) => {
      expect(sweepCss).toContain(family);
    });
  });

  it('neutralizes brutal strip dividers and accent slabs in sweep CSS', () => {
    expect(sweepCss).toContain('.charge-nurse-operational-strip');
    expect(sweepCss).toContain('.reception-operational-strip');
    expect(sweepCss).toContain('.emergency-route-queue-row');
    expect(sweepCss).toContain('.dispatch-console__call-card');
    expect(sweepCss).not.toMatch(/rgba\(31,\s*41,\s*55/);
    expect(sweepCss).not.toMatch(/inset 3px 0 0/);
  });

  it('registers core emergency routes in the application router', () => {
    [
      'EMSPipeline',
      'DispatchConsole',
      'ReceptionWorkspace',
      'EmergencyWhiteboard',
      'ToolsOverview',
      'ClinicalAlertsPage',
      'HospitalCommandCenter',
      'EmergencyAnalytics',
      'EmergencySettings',
      'SmartIntake',
      'ReferralPanel',
      'IntegrationHubPage',
      'SaasHealthCenter',
      'Profile',
      'CopilotRoute',
    ].forEach((symbol) => {
      expect(routerSource).toContain(symbol);
    });
  });
});
