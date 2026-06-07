import { describe, expect, it } from 'vitest';
import {
  CARE_WORKSPACES,
  buildCareWorkspaceModel,
  getCareWorkspaceById,
} from './workspaceArchitecture';

describe('workspaceArchitecture', () => {
  it('defines the requested workspace-centric IA', () => {
    expect(CARE_WORKSPACES.map((workspace) => workspace.id)).toEqual([
      'emergency',
      'icu',
      'cardiology',
      'laboratory',
      'operations',
      'fleet',
      'medical-iot',
      'education',
      'research',
      'governance',
    ]);
  });

  it('falls back to Emergency for unknown workspace ids', () => {
    expect(getCareWorkspaceById('missing').id).toBe('emergency');
  });

  it('surfaces emergency tools contextually instead of as sidebar entries', () => {
    const model = buildCareWorkspaceModel('emergency');
    const toolIds = model.toolEntries.map((tool) => tool.id);
    const routePaths = model.routeEntries.map((route) => route.path);

    expect(toolIds).toEqual(
      expect.arrayContaining(['qsofa', 'news2', 'sofa-score', 'nihss', 'heart-score', 'grace-acs'])
    );
    expect(routePaths).toEqual(expect.arrayContaining(['/assistant', '/tools/calculators', '/live-map']));
  });

  it('defines specialty and acuity workspaces for AI launcher intents', () => {
    const emergency = buildCareWorkspaceModel('emergency');
    const cardiology = buildCareWorkspaceModel('cardiology');
    const icu = buildCareWorkspaceModel('icu');

    expect(emergency.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['nihss', 'ecg-interpretation-assistant', 'acs-workflow-assistant'])
    );
    expect(cardiology.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['heart-score', 'timi-ua-nstemi', 'acs-workflow-assistant'])
    );
    expect(icu.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['rox-index', 'pao2-fio2-ratio', 'ventilator-support-assistant'])
    );
  });
});
