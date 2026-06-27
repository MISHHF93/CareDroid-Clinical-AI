import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readPage(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

const operationalPages = [
  './HospitalMapDashboard.jsx',
  './MedicalIotDashboard.jsx',
  './DeviceFleetManagement.jsx',
  './fleet/FleetDashboard.jsx',
  './LiveTrackingMap.jsx',
  './fleet/FleetLiveMap.jsx',
];

const clinicalAiAnalyticsPages = [
  './MedicalSimulationSuite.jsx',
  './SimulationScenarioPlayer.jsx',
  './SimulationOutcomes.jsx',
  './LaboratoryDashboard.jsx',
  './tools/LabInterpreter.tsx',
  './Medical3DViewer.jsx',
  './AiCommandCenterDashboard.jsx',
  './AiEvaluationDashboard.jsx',
  './PredictiveAnalyticsDashboard.jsx',
  './AnalyticsDashboard.jsx',
  './CostAnalyticsDashboard.jsx',
  './GovernanceRegistry.jsx',
  './platform/PlatformGovernanceWorkspace.tsx',
];

describe('demo/live state reconciliation coverage', () => {
  it('wires operational tracking pages to visible source-state labels', () => {
    for (const pagePath of operationalPages) {
      const source = readPage(pagePath);

      expect(source, pagePath).toContain('StateSourceNotice');
      expect(source, pagePath).toContain('DEMO_LIVE_STATES.DEMO');
      expect(source, pagePath).toContain('DEMO_LIVE_STATES.BACKEND_UNAVAILABLE');
      expect(source, pagePath).toContain('DEMO_LIVE_STATES.UNSUPPORTED');
    }
  });

  it('wires simulation, lab, 3D, AI, analytics, and governance pages to source-state labels', () => {
    for (const pagePath of clinicalAiAnalyticsPages) {
      const source = readPage(pagePath);

      expect(source, pagePath).toContain('StateSourceNotice');
      expect(source, pagePath).toMatch(/DEMO_LIVE_STATES\.(DEMO|LIVE|LOCAL_ONLY|SIMULATED)/);
    }
  });

  it('keeps backend-unavailable and unsupported states visible where actions or fallbacks need them', () => {
    const source = [
      './HospitalMapDashboard.jsx',
      './DeviceFleetManagement.jsx',
      './LiveTrackingMap.jsx',
      './tools/LabInterpreter.tsx',
      './Medical3DViewer.jsx',
      './PredictiveAnalyticsDashboard.jsx',
      './platform/PlatformGovernanceWorkspace.tsx',
    ].map(readPage).join('\n');

    expect(source).toContain('DEMO_LIVE_STATES.BACKEND_UNAVAILABLE');
    expect(source).toContain('DEMO_LIVE_STATES.UNSUPPORTED');
  });

  it('removes unqualified fake-live claims from AI command copy', () => {
    const source = readPage('./AiCommandCenterDashboard.jsx');

    expect(source).not.toMatch(/Live AI operations/);
    expect(source).not.toMatch(/Live refresh every/);
    expect(source).not.toMatch(/Live readiness signals/);
  });
});
