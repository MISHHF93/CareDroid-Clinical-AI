import { describe, expect, it } from 'vitest';
import EmergencyPatientPathService, {
  getDoorToDirectionMetrics,
  getPatientPathDashboard,
  getPatientPathForPatient,
  getPathRecommendations,
} from './emergencyPatientPathService';

describe('EmergencyPatientPathService', () => {
  it('builds the ED patient path from arrival through measured throughput', () => {
    const dashboard = getPatientPathDashboard();

    expect(dashboard).toEqual(
      expect.objectContaining({
        id: 'emergency-patient-path',
        title: 'Emergency Patient Path',
        route: '/workspace/emergency/patient-path',
        sourceState: 'Demo data · No live integration',
        safetyStatement: expect.stringMatching(/does not diagnose, treat, move patients/i),
      }),
    );
    expect(dashboard.milestones.map((milestone) => milestone.label)).toEqual([
      'Arrival Signal',
      'Patient Known',
      'Risk Known',
      'Queue Known',
      'Next Action Known',
      'Destination Known',
      'Throughput Measured',
    ]);
    expect(dashboard.metrics).toEqual(
      expect.objectContaining({
        patientCount: expect.any(Number),
        highRiskPatients: expect.any(Number),
        doorToKnownMinutes: expect.any(Number),
        doorToRiskMinutes: expect.any(Number),
        doorToQueueMinutes: expect.any(Number),
        doorToActionMinutes: expect.any(Number),
        doorToDestinationMinutes: expect.any(Number),
        doorToDirectionMinutes: expect.any(Number),
        p90DoorToDirectionMinutes: expect.any(Number),
        targetDoorToDirectionMinutes: 10,
        targetCompliance: expect.any(Number),
      }),
    );
    expect(dashboard.patients.length).toBeGreaterThanOrEqual(100);
  });

  it('risk-routes patient cards to queues, calculators, next actions, and destinations', () => {
    const dashboard = EmergencyPatientPathService.getPatientPathDashboard();
    const chestPain = dashboard.patients.find((patient) => patient.complaint === 'Chest pain');
    const stroke = dashboard.patients.find((patient) => patient.complaint === 'Stroke symptoms');
    const boarding = dashboard.patients.find(
      (patient) => patient.destination.id === 'inpatient-admission',
    );

    expect(chestPain).toEqual(
      expect.objectContaining({
        patientId: expect.stringMatching(/^DEMO-ED-/),
        arrivalMode: expect.any(String),
        riskLevel: expect.stringMatching(/low|medium|high|critical/),
        assignedQueue: expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
        }),
        destination: expect.objectContaining({
          label: expect.any(String),
          owner: expect.any(String),
        }),
        nextAction: expect.any(String),
      }),
    );
    if (!chestPain) throw new Error('expected a Chest pain patient in the demo dashboard');
    if (!stroke) throw new Error('expected a Stroke symptoms patient in the demo dashboard');
    if (!boarding) throw new Error('expected an inpatient-admission patient in the demo dashboard');
    expect(chestPain.calculators.map((calculator) => calculator.label)).toEqual(
      expect.arrayContaining(['HEART']),
    );
    expect(stroke.calculators.map((calculator) => calculator.label)).toEqual(
      expect.arrayContaining(['NIHSS']),
    );
    expect(boarding.destination.label).toBe('Inpatient admission');
  });

  it('exposes focused helpers for metrics, patient lookup, and recommendations', () => {
    const dashboard = getPatientPathDashboard();
    const firstPatient = dashboard.patients[0];

    expect(getDoorToDirectionMetrics()).toEqual(
      expect.objectContaining({
        doorToDirectionMinutes: dashboard.metrics.doorToDirectionMinutes,
      }),
    );
    expect(getPatientPathForPatient(firstPatient.patientId)).toEqual(firstPatient);
    expect(getPatientPathForPatient('missing-patient')).toBeNull();
    expect(getPathRecommendations()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          action: expect.any(String),
        }),
      ]),
    );
  });
});
