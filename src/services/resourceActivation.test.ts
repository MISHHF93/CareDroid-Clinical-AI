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

  // HEAL-179: trauma-level-1-vs-2 previously only read complaint text (severity / "unstable"
  // keywords), ignoring arrival.vitals even though the sibling respiratory-failure branch
  // already reads vitals.spo2 for its own trigger.
  it('escalates trauma to level-1 from real hypotensive vitals, not just complaint text', () => {
    const activations = deriveResourceActivations({
      id: 'ems-3',
      unitId: 'u3',
      unitName: 'Medic 3',
      crewNames: [],
      patientAge: 34,
      patientSex: 'Male',
      chiefComplaint: 'MVC with chest trauma',
      eta: 6,
      severity: 'High',
      dispatchTime: new Date().toISOString(),
      estimatedArrivalTime: new Date().toISOString(),
      notes: '',
      status: 'Inbound',
      priority: Priority.P1,
      vitals: { sbp: 78, recordedAt: new Date().toISOString() },
    });
    const trauma = activations.find((entry) => entry.type === 'trauma-level-1');
    expect(trauma).toBeDefined();
    expect(trauma?.rationale.some((line) => line.includes('Hypotensive'))).toBe(true);
  });

  it('escalates trauma to level-1 from a severe-head-injury GCS, not just complaint text', () => {
    const activations = deriveResourceActivations({
      id: 'ems-4',
      unitId: 'u4',
      unitName: 'Medic 4',
      crewNames: [],
      patientAge: 29,
      patientSex: 'Female',
      chiefComplaint: 'Fall from ladder',
      eta: 6,
      severity: 'High',
      dispatchTime: new Date().toISOString(),
      estimatedArrivalTime: new Date().toISOString(),
      notes: '',
      status: 'Inbound',
      priority: Priority.P1,
      vitals: { gcs: 6, recordedAt: new Date().toISOString() },
    });
    const trauma = activations.find((entry) => entry.type === 'trauma-level-1');
    expect(trauma).toBeDefined();
    expect(trauma?.rationale.some((line) => line.includes('head injury'))).toBe(true);
  });

  it('stays at trauma level-2 with normal vitals and no destabilizing keywords', () => {
    const activations = deriveResourceActivations({
      id: 'ems-5',
      unitId: 'u5',
      unitName: 'Medic 5',
      crewNames: [],
      patientAge: 45,
      patientSex: 'Male',
      chiefComplaint: 'MVC, minor injuries',
      eta: 10,
      severity: 'Moderate',
      dispatchTime: new Date().toISOString(),
      estimatedArrivalTime: new Date().toISOString(),
      notes: '',
      status: 'Inbound',
      priority: Priority.P2,
      vitals: { sbp: 118, gcs: 15, recordedAt: new Date().toISOString() },
    });
    expect(activations.some((entry) => entry.type === 'trauma-level-2')).toBe(true);
    expect(activations.some((entry) => entry.type === 'trauma-level-1')).toBe(false);
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