import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { NAVIGATION_ITEMS } from './unified-navigation.config';
import {
  MANUAL_ALL_TOPICS,
  MANUAL_RESPONSE_TOPICS,
  MANUAL_ROLE_PLAYBOOKS,
  getManualTopicById,
} from './userManual.config';

const REQUIRED_ROLE_PLAYBOOKS = [
  'registration_clerk',
  'triage_nurse',
  'charge_nurse',
  'registered_nurse',
  'physician',
  'specialist',
  'ems_user',
  'dispatcher',
  'ems_coordinator',
  'patient_flow_coordinator',
  'lab_technician',
  'radiology_technician',
  'pharmacist',
  'ed_manager',
  'hospital_admin',
  'it_admin',
  'quality_safety_officer',
  'demo_observer',
];

describe('CareDroid manual contract', () => {
  it('exposes the in-app Help/User Manual page through navigation', () => {
    expect(NAVIGATION_ITEMS.some((item) => item.id === 'help' && item.route === CANONICAL_ROUTES.emergencyHelp)).toBe(true);
  });

  it('covers the process manual response procedures', () => {
    expect(MANUAL_RESPONSE_TOPICS.map((topic) => topic.id)).toEqual([
      'three-minute-response',
      'staff-routing',
      'department-routing',
      'service-bottlenecks',
      'downtime-fallback',
    ]);
    expect(getManualTopicById('three-minute-response')?.procedure.length).toBeGreaterThanOrEqual(5);
    expect(MANUAL_ALL_TOPICS.length).toBeGreaterThan(MANUAL_RESPONSE_TOPICS.length);
  });

  it('has role playbooks for the requested hospital personas', () => {
    const roleIds = new Set(MANUAL_ROLE_PLAYBOOKS.map((playbook) => playbook.roleId));
    for (const roleId of REQUIRED_ROLE_PLAYBOOKS) {
      expect(roleIds.has(roleId)).toBe(true);
    }
  });
});
