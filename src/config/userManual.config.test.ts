import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  MANUAL_TOPICS,
  resolveManualTopicForPath,
  resolveRolePlaybook,
  getManualTopicById,
} from './userManual.config';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';

describe('userManual.config', () => {
  it('maps reception route to reception procedure topic', () => {
    const topic = resolveManualTopicForPath(CANONICAL_ROUTES.emergencyReception);
    expect(topic?.id).toBe('reception');
    expect(topic?.procedure.length).toBeGreaterThan(3);
  });

  it('provides role playbooks with daily flow steps', () => {
    const clerk = resolveRolePlaybook(EMERGENCY_ROLE_IDS.registrationClerk);
    expect(clerk?.dailyFlow.length).toBeGreaterThan(2);
    expect(clerk?.cannotDo).toContain('Open Whiteboard');
  });

  it('links related topics for navigation', () => {
    const whiteboard = getManualTopicById('whiteboard');
    expect(whiteboard?.relatedTopicIds).toContain('reassessment');
  });

  it('covers all pilot core surfaces', () => {
    const ids = new Set(MANUAL_TOPICS.map((topic) => topic.id));
    expect(ids.has('reception')).toBe(true);
    expect(ids.has('whiteboard')).toBe(true);
    expect(ids.has('ems')).toBe(true);
    expect(ids.has('copilot')).toBe(true);
    expect(ids.has('tools')).toBe(true);
  });

  it('points the patient-room topic at the real route (Cycle 153 — was hand-typed /emergency/room, a dead path)', () => {
    const topic = getManualTopicById('patient-room');
    expect(topic?.route).toBe(CANONICAL_ROUTES.emergencyPatientRoom);
    expect(topic?.route).not.toBe('/emergency/room');
  });
});
