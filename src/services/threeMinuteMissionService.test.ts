import { beforeEach, describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { useThreeMinuteMissionStore } from '../store/threeMinuteMissionStore';
import {
  acknowledgeThreeMinuteMission,
  buildThreeMinuteMissionSnapshot,
  shouldStartMissionForAlert,
  shouldStartMissionForPatient,
  startThreeMinuteMission,
} from './threeMinuteMissionService';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-3m',
    firstName: 'Alex',
    lastName: 'Rivera',
    mrn: 'MRN-3M',
    age: 58,
    sex: 'Male',
    priority: Priority.P1,
    state: PatientState.Triage,
    arrivalTime: new Date().toISOString(),
    chiefComplaint: 'Chest pain',
    flags: [],
    triagePending: true,
    highRiskComplaintFlags: [{ id: 'chest-pain', label: 'Chest pain' } as any],
    ...overrides,
  } as Patient;
}

describe('threeMinuteMissionService', () => {
  beforeEach(() => {
    useThreeMinuteMissionStore.setState({ missions: [], lastSyncedAt: null });
  });

  it('starts a standardized mission for critical alerts and patients', () => {
    expect(
      shouldStartMissionForAlert({
        id: 'alert-1',
        severity: 'Critical',
        patientId: 'patient-3m',
        dismissed: false,
      } as any),
    ).toBe(true);
    expect(shouldStartMissionForPatient(makePatient())).toBe(true);

    const mission = startThreeMinuteMission({
      trigger: 'critical_alert',
      subjectId: 'patient-3m',
      patientId: 'patient-3m',
      triggerAlertId: 'alert-1',
    });

    expect(mission?.timerId).toBeTruthy();
    expect(mission?.tasks).toHaveLength(4);
    expect(mission?.humanReviewRequired).toBe(true);
    expect(mission?.advisoryOnly).toBe(true);

    const snapshot = buildThreeMinuteMissionSnapshot();
    expect(snapshot.activeMissions.length).toBeGreaterThan(0);
  });

  it('acknowledges mission with one action and clears active mission state', () => {
    const mission = startThreeMinuteMission({
      trigger: 'critical_patient',
      subjectId: 'patient-3m',
      patientId: 'patient-3m',
      triggerAlertId: 'alert-2',
    });
    expect(mission).toBeTruthy();
    if (!mission) return;

    useEmergencyStore.setState({
      alerts: [
        {
          id: 'alert-2',
          severity: 'Critical',
          patientId: 'patient-3m',
          title: 'Critical',
          message: 'Test',
          createdAt: new Date().toISOString(),
          dismissed: false,
        } as any,
      ],
    });

    const acknowledged = acknowledgeThreeMinuteMission(mission.missionId, 'nurse-1');
    expect(acknowledged).toBe(true);
    expect(useThreeMinuteMissionStore.getState().missions.find((entry) => entry.missionId === mission.missionId)).toBeUndefined();
  });
});