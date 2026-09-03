import { describe, expect, it } from 'vitest';
import {
  KNOWLEDGE_HUB_TYPES,
  buildHealthcareKnowledgeHub,
  filterHealthcareKnowledgeHubItems,
} from './healthcareKnowledgeHub';

describe('healthcareKnowledgeHub', () => {
  it('centralizes all required knowledge categories', () => {
    const hub = buildHealthcareKnowledgeHub();

    expect(hub.types).toEqual(
      expect.arrayContaining([
        'protocol',
        'pathway',
        'calculator',
        'simulation',
        'ai_guidance',
        'documentation',
      ]),
    );
    for (const type of KNOWLEDGE_HUB_TYPES) {
      expect(hub.typeCounts[type]).toBeGreaterThan(0);
    }
    expect(hub.summary.representedTypeCount).toBe(6);
  });

  it('filters by specialty, role, workspace, and department', () => {
    const emergencyClinicianItems = filterHealthcareKnowledgeHubItems({
      specialty: 'emergency',
      role: 'clinician',
      workspace: 'emergency',
      department: 'emergency',
    });

    expect(emergencyClinicianItems.length).toBeGreaterThan(0);
    expect(emergencyClinicianItems.every((item) => item.specialties.includes('emergency'))).toBe(
      true,
    );
    expect(emergencyClinicianItems.every((item) => item.roles.includes('clinician'))).toBe(true);
    expect(emergencyClinicianItems.every((item) => item.workspaces.includes('emergency'))).toBe(
      true,
    );
    expect(emergencyClinicianItems.every((item) => item.departments.includes('emergency'))).toBe(
      true,
    );
  });

  it('searches knowledge text and evidence', () => {
    const results = filterHealthcareKnowledgeHubItems({ query: 'FHIR' });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'documentation-integration-readiness',
          route: '/integration-readiness',
        }),
      ]),
    );
  });
});
