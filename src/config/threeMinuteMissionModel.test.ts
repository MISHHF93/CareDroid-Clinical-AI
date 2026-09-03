import { describe, expect, it } from 'vitest';
import {
  THREE_MINUTE_MISSION_DEFINITIONS,
  THREE_MINUTE_MISSION_TARGET_SECONDS,
  buildDefaultMissionTasks,
  getThreeMinuteMissionDefinition,
} from './threeMinuteMissionModel';

describe('threeMinuteMissionModel', () => {
  it('defines standardized workflows for all mission triggers', () => {
    expect(THREE_MINUTE_MISSION_DEFINITIONS).toHaveLength(4);
    for (const trigger of [
      'critical_alert',
      'ems_pre_arrival',
      'critical_patient',
      'reassessment_breach',
    ]) {
      const definition = getThreeMinuteMissionDefinition(trigger as any);
      expect(definition.tasks).toHaveLength(4);
      expect(definition.aiIntent).toBe('three_minute_response_plan');
      expect(definition.departmentNotifications.length).toBeGreaterThan(0);
    }
  });

  it('uses a three-minute target and minimizes tasks to clinician-critical steps', () => {
    expect(THREE_MINUTE_MISSION_TARGET_SECONDS).toBe(180);
    const tasks = buildDefaultMissionTasks('critical_alert', 'triage_nurse');
    expect(tasks.find((task) => task.id === 'acknowledge')?.status).toBe('pending');
    expect(tasks.find((task) => task.id === 'assign_owner')?.status).toBe('complete');
  });
});
