import { describe, expect, it } from 'vitest';
import { getPlatformSystemCapabilityByPath } from './platformSystems';
import { buildPlatformSystemSurfaceView } from './platformSystemSurfaces';

describe('platformSystemSurfaces', () => {
  it('builds workflow builder, SOAP, and patient workspace demo views', () => {
    const workflow = getPlatformSystemCapabilityByPath('/tools/workflow-builder-ai');
    const soap = getPlatformSystemCapabilityByPath('/tools/soap-builder');
    const workspace = getPlatformSystemCapabilityByPath('/patients/demo-patient/workspace');

    expect(buildPlatformSystemSurfaceView({ capability: workflow }).chart.length).toBe(4);
    expect(buildPlatformSystemSurfaceView({ capability: soap }).rows).toHaveLength(4);
    expect(buildPlatformSystemSurfaceView({ capability: workspace, patientId: 'demo-patient' }).metrics[2].value).toBe(
      'demo-patient',
    );
  });

  it('builds pack hub views when no capability is matched', () => {
    const view = buildPlatformSystemSurfaceView({ hubPack: 'AI Workflow' });
    expect(view.title).toBe('AI Workflow Hub');
    expect(view.packCapabilities.length).toBeGreaterThan(0);
    expect(view.chart.length).toBeGreaterThan(0);
  });
});