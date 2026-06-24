import { describe, expect, it } from 'vitest';
import { deriveResourceActivations } from './resourceActivation';
import { Priority } from '../types/emergency';

describe('resourceActivation', () => {
  it('recommends STEMI activation for chest pain presentations', () => {
    const activations = deriveResourceActivations({
      id: 'ems-1',
      unitId: 'u1',
      unitName: 'Medic 1',
      crewNames: [],
      patientAge: 58,
      patientSex: 'Male',
      chiefComplaint: 'STEMI suspected chest pain',
      eta: 5,
      severity: 'Critical',
      dispatchTime: new Date().toISOString(),
      estimatedArrivalTime: new Date().toISOString(),
      notes: '',
      status: 'Inbound',
      prearrivalComplaint: 'Chest pain',
      priority: Priority.P1,
    });
    expect(activations.some((entry) => entry.type === 'stemi')).toBe(true);
  });

  it('recommends stroke alert for stroke code checklist', () => {
    const activations = deriveResourceActivations({
      id: 'ems-2',
      unitId: 'u2',
      unitName: 'Medic 2',
      crewNames: [],
      patientAge: 71,
      patientSex: 'Female',
      chiefComplaint: 'Facial droop',
      eta: 8,
      severity: 'High',
      dispatchTime: new Date().toISOString(),
      estimatedArrivalTime: new Date().toISOString(),
      notes: '',
      status: 'Inbound',
      prearrivalComplaint: 'Stroke symptoms',
      priority: Priority.P1,
      criticalChecklist: {
        type: 'stroke',
        title: 'Stroke alert',
        triggeredAt: new Date().toISOString(),
        completions: [],
      },
    });
    expect(activations.some((entry) => entry.type === 'stroke-alert')).toBe(true);
  });
});