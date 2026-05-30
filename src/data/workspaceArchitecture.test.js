import { describe, expect, it } from 'vitest';
import {
  CARE_WORKSPACES,
  buildCareWorkspaceModel,
  getCareWorkspaceById,
} from './workspaceArchitecture';

describe('workspaceArchitecture', () => {
  it('defines the requested workspace-centric IA', () => {
    expect(CARE_WORKSPACES.map((workspace) => workspace.id)).toEqual([
      'clinical',
      'emergency',
      'neurology',
      'cardiology',
      'respiratory',
      'operations',
      'fleet',
      'medical-iot',
      'research',
      'admin',
    ]);
  });

  it('falls back to Clinical for unknown workspace ids', () => {
    expect(getCareWorkspaceById('missing').id).toBe('clinical');
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

  it('defines specialty workspaces for AI launcher intents', () => {
    const neurology = buildCareWorkspaceModel('neurology');
    const cardiology = buildCareWorkspaceModel('cardiology');
    const respiratory = buildCareWorkspaceModel('respiratory');

    expect(neurology.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['nihss', 'abcd2', 'stroke-workflow-assistant'])
    );
    expect(cardiology.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['heart-score', 'timi-ua-nstemi', 'acs-workflow-assistant'])
    );
    expect(respiratory.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['rox-index', 'pao2-fio2-ratio'])
    );
  });
});
