import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../../types/emergency';
import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import {
  CHARGE_NURSE_WORKFLOW_SURFACES,
  selectChargeNurseOperationalStrip,
  shouldShowChargeNurseOperationalStrip,
} from './chargeNurseWorkflowModel';

const basePatient = {
  id: 'p-1',
  mrn: 'ED-1',
  firstName: 'Ava',
  lastName: 'Stone',
  dob: '1990-01-01',
  age: 36,
  sex: 'F',
  arrivalTime: '2026-06-17T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Chest Pain',
  state: PatientState.Waiting,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('chargeNurseWorkflowModel', () => {
  it('defines the five charge nurse workflow surfaces', () => {
    expect(CHARGE_NURSE_WORKFLOW_SURFACES).toEqual([
      'queues',
      'reassessments',
      'ems',
      'capacity',
      'boarding',
    ]);
  });

  it('shows the strip for charge nurse screen mode and role', () => {
    expect(
      shouldShowChargeNurseOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
        roleId: EMERGENCY_ROLE_IDS.physician,
      }),
    ).toBe(true);
    expect(
      shouldShowChargeNurseOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.physician,
        roleId: EMERGENCY_ROLE_IDS.chargeNurse,
      }),
    ).toBe(true);
    expect(
      shouldShowChargeNurseOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.physician,
        roleId: EMERGENCY_ROLE_IDS.physician,
        displayMode: true,
      }),
    ).toBe(false);
  });

  it('builds operational strip metrics from central snapshot', () => {
    const metrics = selectChargeNurseOperationalStrip({
      patients: [
        basePatient,
        { ...basePatient, id: 'p-2', state: PatientState.Triage },
        {
          ...basePatient,
          id: 'p-3',
          state: PatientState.Admission,
          flags: [PatientFlag.PendingAdmission],
        },
      ],
      centralSnapshot: {
        queueHealth: [{ breached: true }, { breached: false }],
        reassessmentStatus: { due: 4 },
        emsPressure: { inbound: 2 },
        capacityStatus: { score: 78, band: 'Orange' },
        boardingStatus: { boarders: 3, risk: 'strained' },
      },
      activeEmsArrivals: 1,
    });

    expect(metrics.map((metric) => metric.surface)).toEqual(CHARGE_NURSE_WORKFLOW_SURFACES);
    expect(metrics.find((metric) => metric.id === 'queues')?.value).toBe(1);
    expect(metrics.find((metric) => metric.id === 'reassessments')?.value).toBe(4);
    expect(metrics.find((metric) => metric.id === 'ems')?.value).toBe(3);
    expect(metrics.find((metric) => metric.id === 'capacity')?.value).toBe('78 Orange');
    expect(metrics.find((metric) => metric.id === 'boarding')?.value).toBe(3);
  });
});
