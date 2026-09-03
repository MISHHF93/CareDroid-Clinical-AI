import { beforeEach, describe, expect, it } from 'vitest';
import { buildDepartmentContext } from '../../lib/ai/contextEngine';
import { executeEmergencyTool } from '../../lib/ai/toolRegistry';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  bootstrapAiPlatformIntegrations,
  teardownAiPlatformIntegrations,
} from './aiPlatformBootstrap';

describe('aiPlatformBootstrap', () => {
  beforeEach(() => {
    teardownAiPlatformIntegrations();
    useEmergencyStore.setState((state) => ({
      ...state,
      patients: [
        {
          id: 'ai-patient-1',
          mrn: 'MRN-AI',
          firstName: 'Avery',
          lastName: 'Case',
          arrivalTime: new Date().toISOString(),
          chiefComplaint: 'Chest pain',
          state: PatientState.Triage,
          priority: Priority.P3,
          vitals: [],
          flags: [],
          notes: [],
          timeline: [],
        },
      ] as unknown as Patient[],
    }));
  });

  it('registers store readers for department context and emergency tools', () => {
    bootstrapAiPlatformIntegrations();

    const context = buildDepartmentContext();
    expect(context.patients.total).toBeGreaterThan(0);

    const toolResult = executeEmergencyTool('get_patient_details', { patientId: 'ai-patient-1' });
    expect(toolResult.ok).toBe(true);
  });
});
