import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { FULL_EMERGENCY_CARE_JOURNEY } from '../services/fullEmergencyCareJourneyService';
import { ED_JOURNEY_PHASES } from './edOperatingSurface.config';
import {
  HOSPITAL_OPERATING_DEPARTMENTS,
  getJourneyPhaseForStage,
  getJourneyStageForPatientState,
  listHospitalDepartments,
  resolvePatientJourneyPosition,
  resolveStageBackendEndpoints,
} from './hospitalOperatingSystemModel';
import { buildHospitalOperatingSystemSnapshot } from '../services/hospitalOperatingSystemService';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    name: 'Test Patient',
    mrn: 'MRN-1',
    age: 42,
    sex: 'F',
    priority: Priority.P3,
    state: PatientState.Triage,
    arrivalTime: new Date().toISOString(),
    chiefComplaint: 'Chest pain',
    flags: [],
    ...overrides,
  } as Patient;
}

describe('hospitalOperatingSystemModel', () => {
  it('covers all 20 journey stages across 6 ED phases', () => {
    const stageIds = FULL_EMERGENCY_CARE_JOURNEY.map((stage) => stage.id);
    const covered = new Set(ED_JOURNEY_PHASES.flatMap((phase) => phase.stageIds));
    expect(covered.size).toBe(stageIds.length);
    for (const stageId of stageIds) {
      expect(covered.has(stageId)).toBe(true);
      expect(getJourneyPhaseForStage(stageId)).toBeTruthy();
    }
  });

  it('maps patient states into journey stages and departments', () => {
    expect(getJourneyStageForPatientState(PatientState.Arrival)).toBe('patient-arrival');
    expect(getJourneyStageForPatientState(PatientState.Orders)).toBe('diagnostics');

    const triagePatient = makePatient({ state: PatientState.Triage });
    const position = resolvePatientJourneyPosition(triagePatient);
    expect(position.stageId).toBe('triage');
    expect(position.phaseId).toBe('triage-assessment');
    expect(position.departmentIds).toContain('triage');
    expect(position.apiEndpoints.length).toBeGreaterThan(0);
  });

  it('lists participating hospital departments for every journey stage', () => {
    expect(listHospitalDepartments().length).toBe(HOSPITAL_OPERATING_DEPARTMENTS.length);
    for (const stage of FULL_EMERGENCY_CARE_JOURNEY) {
      const endpoints = resolveStageBackendEndpoints(stage.id);
      expect(endpoints.length).toBeGreaterThan(0);
    }
  });

  it('builds a unified hospital operating snapshot from store slices', () => {
    const snapshot = buildHospitalOperatingSystemSnapshot({
      pathname: '/emergency/reception',
      patients: [makePatient({ state: PatientState.Registration })],
    });

    expect(snapshot.phases).toHaveLength(6);
    expect(snapshot.journey.stages).toHaveLength(20);
    expect(snapshot.activeSurface?.surfaceId).toBe('reception');
    expect(snapshot.apiEndpoints.length).toBeGreaterThan(0);
    expect(snapshot.departments.some((department) => department.activePatients > 0)).toBe(true);
  });
});