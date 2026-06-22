import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../../types/emergency';
import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { PHYSICIAN_SCREEN_WIDGETS } from '../../config/physicianScreenModel';
import {
  PHYSICIAN_NAV_EXCLUDED_IDS,
  PHYSICIAN_WORKFLOW_LAUNCHERS,
  PHYSICIAN_WORKFLOW_SURFACES,
  physicianCardActionIds,
  resolvePatientCardWorkflowProfile,
  selectPhysicianOperationalStrip,
  shouldShowPhysicianOperationalStrip,
} from './physicianWorkflowModel';

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

describe('physicianWorkflowModel', () => {
  it('catalogs physician workflow launchers including complaint routing', () => {
    const ids = PHYSICIAN_WORKFLOW_LAUNCHERS.map((entry) => entry.id);
    expect(ids).toEqual([
      'review',
      'advance',
      'reassess',
      'refer',
      'discharge',
      'copilot',
      'complaint-workflow',
    ]);
  });

  it('resolves physician card workflow profile from screen mode', () => {
    expect(
      resolvePatientCardWorkflowProfile({
        roleId: EMERGENCY_ROLE_IDS.physician,
        screenMode: CARE_DROID_SCREEN_MODES.physician,
        canMutateWhiteboard: false,
      }),
    ).toBe('physician');
    expect(
      resolvePatientCardWorkflowProfile({
        roleId: EMERGENCY_ROLE_IDS.chargeNurse,
        screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
        canMutateWhiteboard: true,
      }),
    ).toBe('charge');
    expect(
      resolvePatientCardWorkflowProfile({
        roleId: EMERGENCY_ROLE_IDS.physician,
        screenMode: CARE_DROID_SCREEN_MODES.physician,
        displayMode: true,
      }),
    ).toBe('none');
  });

  it('lists physician card actions with complaint workflow', () => {
    expect(physicianCardActionIds('physician')).toContain('complaint-workflow');
    expect(PHYSICIAN_NAV_EXCLUDED_IDS).toContain('reception');
    expect(PHYSICIAN_NAV_EXCLUDED_IDS).toContain('settings');
  });

  it('shows the strip for physician screen mode and role', () => {
    expect(
      shouldShowPhysicianOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.physician,
        roleId: EMERGENCY_ROLE_IDS.physician,
      }),
    ).toBe(true);
    expect(
      shouldShowPhysicianOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
        roleId: EMERGENCY_ROLE_IDS.physician,
      }),
    ).toBe(true);
    expect(
      shouldShowPhysicianOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
        roleId: EMERGENCY_ROLE_IDS.chargeNurse,
        displayMode: true,
      }),
    ).toBe(false);
  });

  it('builds physician operational strip metrics', () => {
    const metrics = selectPhysicianOperationalStrip({
      patients: [
        basePatient,
        {
          ...basePatient,
          id: 'p-2',
          assignedStaffId: 'md-1',
          state: PatientState.Assessment,
        },
        {
          ...basePatient,
          id: 'p-3',
          state: PatientState.Results,
        },
        {
          ...basePatient,
          id: 'p-4',
          state: PatientState.Admission,
          flags: [PatientFlag.PendingAdmission],
        },
      ],
      referrals: [{ id: 'r-1', status: 'Pending' }],
      physicianStaffId: 'md-1',
    });

    expect(metrics.map((metric) => metric.surface)).toEqual(PHYSICIAN_WORKFLOW_SURFACES);
    expect(metrics.find((metric) => metric.id === 'assigned')?.value).toBe(1);
    expect(metrics.find((metric) => metric.id === 'results')?.value).toBe(1);
    expect(metrics.find((metric) => metric.id === 'boarders')?.value).toBe(1);
  });

  it('filters strip metrics to visible physician surfaces', () => {
    const metrics = selectPhysicianOperationalStrip({
      patients: [basePatient],
      visibleSurfaces: [
        PHYSICIAN_SCREEN_WIDGETS.assignedPatients,
        PHYSICIAN_SCREEN_WIDGETS.referralsPending,
      ],
    });

    expect(metrics.map((metric) => metric.surface)).toEqual([
      PHYSICIAN_SCREEN_WIDGETS.assignedPatients,
      PHYSICIAN_SCREEN_WIDGETS.referralsPending,
    ]);
  });
});
