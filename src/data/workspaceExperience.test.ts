import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceAssistantPrompt,
  getWorkspaceExperienceProfile,
  normalizeWorkspaceShortcut,
} from './workspaceExperience';

describe('workspace experience profiles', () => {
  it('makes Emergency feel like its own operating mode', () => {
    const profile = getWorkspaceExperienceProfile({ id: 'emergency', name: 'Emergency' });

    expect(profile.operatingLabel).toBe('CareDroid');
    expect(profile.dashboardTitle).toMatch(/Emergency Whiteboard/);
    expect(profile.toolsTitle).toMatch(/CareDroid Console/);
    expect(profile.recommendationsTitle).toMatch(/CareDroid Recommendations/);
    expect(profile.assistantTitle).toMatch(/CareDroid Copilot/);
    expect(profile.focusMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Volume', value: '50-150' }),
        expect.objectContaining({ label: 'Team', value: '<10' }),
      ]),
    );
    expect(profile.quickPrompts.join(' ')).toMatch(/bottlenecks|triage/i);
  });

  it('makes Medical IoT visibly different from Emergency', () => {
    const emergency = getWorkspaceExperienceProfile({ id: 'emergency' });
    const iot = getWorkspaceExperienceProfile({ id: 'medical-iot', name: 'Medical IoT' });

    expect(iot.operatingLabel).toBe('Medical IoT OS');
    expect(iot.dashboardTitle).toMatch(/Medical IoT Command Center/);
    expect(iot.quickPrompts.join(' ')).toMatch(/telemetry|device/i);
    expect(iot.dashboardTitle).not.toBe(emergency.dashboardTitle);
  });

  it('normalizes string workspace shortcuts into route objects', () => {
    expect(normalizeWorkspaceShortcut('medicalIot')).toEqual(
      expect.objectContaining({
        id: 'medical-iot',
        label: 'Medical IoT',
        path: '/emergency/tools?source=operations&filter=operations&q=medical-iot-dashboard&open=medical-iot-dashboard',
      }),
    );
  });

  it('seeds assistant prompts with active workspace identity', () => {
    const profile = getWorkspaceExperienceProfile({ id: 'medical-iot' });

    expect(buildWorkspaceAssistantPrompt('Check offline devices', profile)).toContain(
      '[Medical IoT OS]',
    );
    expect(buildWorkspaceAssistantPrompt('', profile)).toBe('');
  });

  it('supports pharmacy and administration as first-class workspace modes', () => {
    const pharmacy = getWorkspaceExperienceProfile({ id: 'pharmacy' });
    const administration = getWorkspaceExperienceProfile({ id: 'administration' });

    expect(pharmacy.operatingLabel).toBe('Pharmacy OS');
    expect(pharmacy.quickPrompts.join(' ')).toMatch(/medication|renal|antibiotic/i);
    expect(administration.operatingLabel).toBe('Administration OS');
    expect(administration.quickPrompts.join(' ')).toMatch(/workspace|backend|SaaS/i);
  });
});
