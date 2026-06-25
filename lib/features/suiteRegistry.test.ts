import { describe, expect, it } from 'vitest';
import { FEATURE_REGISTRY } from './featureRegistry';
import {
  CAREDROID_SUITES,
  FEATURE_SUITE_ASSIGNMENTS,
  getFeatureSuiteAssignment,
  listFeaturesBySuite,
  NAV_SUITE_ASSIGNMENTS,
} from './suiteRegistry';

describe('suiteRegistry', () => {
  it('defines eleven normalized CareDroid suites', () => {
    expect(CAREDROID_SUITES).toHaveLength(11);
    expect(CAREDROID_SUITES.map((suite) => suite.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  it('assigns every registered feature to a suite', () => {
    const unassigned = FEATURE_REGISTRY.filter((feature) => !getFeatureSuiteAssignment(feature.id));
    expect(unassigned.map((feature) => feature.id)).toEqual([]);
  });

  it('maps primary navigation items to core or extension suites', () => {
    const coreNavIds = [
      'reception',
      'whiteboard',
      'intake',
      'ems',
      'patients',
      'queues',
      'reassessment',
      'capacity',
      'referrals',
      'copilot',
      'tools',
      'analytics',
      'pulse',
      'shift',
    ];
    for (const navId of coreNavIds) {
      const suiteId = NAV_SUITE_ASSIGNMENTS[navId];
      expect(suiteId).toBeTruthy();
      const suite = CAREDROID_SUITES.find((entry) => entry.id === suiteId);
      expect(suite?.layer).toBe('core');
    }
  });

  it('keeps copilot features in the clinical copilot suite with patient-card linkage', () => {
    const copilotFeatures = listFeaturesBySuite('physician_clinical_copilot');
    expect(copilotFeatures).toContain('ed_copilot');
    for (const featureId of copilotFeatures) {
      const assignment = FEATURE_SUITE_ASSIGNMENTS[featureId];
      expect(['patient_card_drawer', 'role_view']).toContain(assignment.whiteboardLink);
    }
  });
});