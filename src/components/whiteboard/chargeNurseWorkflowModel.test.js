import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../../types/emergency';
import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { CHARGE_NURSE_SCREEN_WIDGETS } from '../../config/chargeNurseScreenModel';
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
  it('defines charge nurse workflow surfaces aligned to screen widgets', () => {
    expect(CHARGE_NURSE_WORKFLOW_SURFACES).toEqual([
      CHARGE_NURSE_SCREEN_WIDGETS.triageBreach,
      CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
      CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue,
      CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
      CHARGE_NURSE_SCREEN_WIDGETS.waitingRoomSafetyEscalation,
      CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate,
      CHARGE_NURSE_SCREEN_WIDGETS.emsInbound,
      CHARGE_NURSE_SCREEN_WIDGETS.offloadDelays,
      CHARGE_NURSE_SCREEN_WIDGETS.boarders,
      CHARGE_NURSE_SCREEN_WIDGETS.referralsPending,
      CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus,
      CHARGE_NURSE_SCREEN_WIDGETS.crowdLevel,
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
        emsPressure: { inbound: 2, delayedOffload: 1 },
        capacityStatus: { score: 78, band: 'Orange' },
        boardingStatus: { boarders: 3, risk: 'strained' },
        referralStatus: { pending: 2 },
      },
      activeEmsArrivals: 1,
      referrals: [{ id: 'r-1', status: 'Pending' }],
    });

    expect(metrics.some((metric) => metric.id === 'waiting-count')).toBe(true);
    expect(metrics.some((metric) => metric.id === 'triage-awaiting')).toBe(true);
    expect(metrics.filter((metric) => metric.surface === CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches)).toHaveLength(5);
    expect(metrics.filter((metric) => metric.surface === CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate)).toHaveLength(4);
    expect(metrics.map((metric) => metric.surface)).toEqual([
      ...Array(5).fill(CHARGE_NURSE_SCREEN_WIDGETS.triageBreach),
      CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
      CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
      CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue,
      ...Array(5).fill(CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches),
      ...Array(5).fill(CHARGE_NURSE_SCREEN_WIDGETS.waitingRoomSafetyEscalation),
      ...Array(4).fill(CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate),
      CHARGE_NURSE_SCREEN_WIDGETS.boarders,
      CHARGE_NURSE_SCREEN_WIDGETS.referralsPending,
      CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus,
      CHARGE_NURSE_SCREEN_WIDGETS.crowdLevel,
    ]);
    expect(metrics.find((metric) => metric.id === 'waiting-count')?.value).toBe(1);
    expect(metrics.find((metric) => metric.id === 'queues')?.value).toBe(1);
    expect(metrics.find((metric) => metric.id === 'reassessments')?.value).toBe(4);
    expect(metrics.find((metric) => metric.id === 'ems-inbound')?.value).toBe(0);
    expect(metrics.find((metric) => metric.id === 'offload-delays')?.value).toBe(0);
    expect(metrics.find((metric) => metric.id === 'capacity')?.value).toBe('78 Orange');
    expect(metrics.find((metric) => metric.id === 'boarding')?.value).toBe(3);
    expect(metrics.find((metric) => metric.id === 'referrals')?.value).toBe(2);
  });

  it('filters strip metrics to visible charge nurse surfaces', () => {
    const metrics = selectChargeNurseOperationalStrip({
      patients: [basePatient],
      visibleSurfaces: [
        CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
        CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate,
      ],
    });

    expect(metrics.map((metric) => metric.id)).toEqual([
      'waiting-count',
      'queues',
      'ems-inbound',
      'offload-delays',
      'offload-duration',
      'handoff-pending',
    ]);
  });

  it('filters strip metrics to KPI policy metric ids', () => {
    const metrics = selectChargeNurseOperationalStrip({
      patients: [basePatient],
      kpiMetricIds: ['waiting-count', 'reassessments', 'offload-delays'],
      centralSnapshot: {
        reassessmentStatus: { due: 2 },
        emsPressure: { delayedOffload: 1 },
      },
    });

    expect(metrics.map((metric) => metric.id)).toEqual(['waiting-count', 'reassessments', 'offload-delays']);
  });
});
