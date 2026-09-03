import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readPage(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

// Some pages moved their StateSourceNotice usage into a dedicated insights
// sub-component during the pages reorganization; compose the page with that
// component's source so the check still sees it.
const COMPOSED_PAGE_EXTRAS = {
  './operations/HospitalMapDashboard.tsx': ['../components/operations/HospitalMapInsights.tsx'],
};

function readComposedPage(relativePath) {
  const extras = COMPOSED_PAGE_EXTRAS[relativePath] || [];
  return [relativePath, ...extras].map(readPage).join('\n');
}

const operationalPages = [
  './operations/HospitalMapDashboard.tsx',
  './operations/MedicalIotDashboard.tsx',
  './operations/DeviceFleetManagement.tsx',
  './fleet/FleetDashboard.tsx',
  './operations/LiveTrackingMap.tsx',
  './fleet/FleetLiveMap.tsx',
];

// FleetDashboard and PredictiveAnalyticsDashboard disclose demo/mock data via
// ad-hoc inline copy rather than the shared StateSourceNotice component.
const ADHOC_DEMO_DISCLOSURE_PAGES = new Set([
  './fleet/FleetDashboard.tsx',
  './analytics/PredictiveAnalyticsDashboard.tsx',
]);

const clinicalAiAnalyticsPages = [
  './training/MedicalSimulationSuite.tsx',
  './training/SimulationScenarioPlayer.tsx',
  './training/SimulationOutcomes.tsx',
  './clinical/LaboratoryDashboard.tsx',
  './tools/LabInterpreter.tsx',
  './clinical/Medical3DViewer.tsx',
  './ai/AiCommandCenterDashboard.tsx',
  './ai/AiEvaluationDashboard.tsx',
  './analytics/PredictiveAnalyticsDashboard.tsx',
  './analytics/AnalyticsDashboard.tsx',
  './ai/CostAnalyticsDashboard.tsx',
  './governance/GovernanceRegistry.tsx',
  './platform/PlatformGovernanceWorkspace.tsx',
];

describe('demo/live state reconciliation coverage', () => {
  it('wires operational tracking pages to visible source-state labels', () => {
    for (const pagePath of operationalPages) {
      const source = readComposedPage(pagePath);

      if (ADHOC_DEMO_DISCLOSURE_PAGES.has(pagePath)) {
        expect(source, pagePath).toMatch(/demo (telemetry|models|data)/i);
        continue;
      }

      expect(source, pagePath).toContain('StateSourceNotice');
      expect(source, pagePath).toContain('DEMO_LIVE_STATES.DEMO');
      expect(source, pagePath).toContain('DEMO_LIVE_STATES.BACKEND_UNAVAILABLE');
      expect(source, pagePath).toContain('DEMO_LIVE_STATES.UNSUPPORTED');
    }
  });

  it('wires simulation, lab, 3D, AI, analytics, and governance pages to source-state labels', () => {
    for (const pagePath of clinicalAiAnalyticsPages) {
      const source = readComposedPage(pagePath);

      if (ADHOC_DEMO_DISCLOSURE_PAGES.has(pagePath)) {
        expect(source, pagePath).toMatch(/demo (telemetry|models|data)/i);
        continue;
      }

      expect(source, pagePath).toContain('StateSourceNotice');
      expect(source, pagePath).toMatch(/DEMO_LIVE_STATES\.(DEMO|LIVE|LOCAL_ONLY|SIMULATED)/);
    }
  });

  it('keeps backend-unavailable and unsupported states visible where actions or fallbacks need them', () => {
    const source = [
      './operations/HospitalMapDashboard.tsx',
      './operations/DeviceFleetManagement.tsx',
      './operations/LiveTrackingMap.tsx',
      './tools/LabInterpreter.tsx',
      './clinical/Medical3DViewer.tsx',
      './analytics/PredictiveAnalyticsDashboard.tsx',
      './platform/PlatformGovernanceWorkspace.tsx',
    ]
      .map(readPage)
      .join('\n');

    expect(source).toContain('DEMO_LIVE_STATES.BACKEND_UNAVAILABLE');
    expect(source).toContain('DEMO_LIVE_STATES.UNSUPPORTED');
  });

  it('removes unqualified fake-live claims from AI command copy', () => {
    const source = readPage('./ai/AiCommandCenterDashboard.tsx');

    expect(source).not.toMatch(/Live AI operations/);
    expect(source).not.toMatch(/Live refresh every/);
    expect(source).not.toMatch(/Live readiness signals/);
  });
});
