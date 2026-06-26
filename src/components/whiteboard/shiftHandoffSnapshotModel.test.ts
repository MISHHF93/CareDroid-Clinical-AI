import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { PatientFlag, PatientState, Priority } from '../../types/emergency';
import {
  auditShiftHandoffSurfaces,
  countHighRiskPatients,
  evaluateShiftHandoffReadability,
  selectShiftHandoffMetrics,
  shouldShowShiftHandoffStrip,
} from './shiftHandoffSnapshotModel';

const patient = {
  id: 'p-1',
  state: PatientState.Waiting,
  priority: Priority.P3,
  flags: [],
};

describe('shiftHandoffSnapshotModel', () => {
  it('shows shift snapshot for clinical handoff roles only', () => {
    expect(shouldShowShiftHandoffStrip({ roleId: EMERGENCY_ROLE_IDS.physician })).toBe(true);
    expect(shouldShowShiftHandoffStrip({ roleId: EMERGENCY_ROLE_IDS.chargeNurse })).toBe(true);
    expect(shouldShowShiftHandoffStrip({ roleId: EMERGENCY_ROLE_IDS.triageNurse })).toBe(true);
    expect(shouldShowShiftHandoffStrip({ roleId: EMERGENCY_ROLE_IDS.registrationClerk })).toBe(false);
    expect(shouldShowShiftHandoffStrip({ roleId: EMERGENCY_ROLE_IDS.physician, displayMode: true })).toBe(
      false,
    );
  });

  it('builds five shift metrics with plain labels', () => {
    const metrics = selectShiftHandoffMetrics({
      patients: [
        patient,
        { ...patient, id: 'p-2', priority: Priority.P1 },
        { ...patient, id: 'p-3', state: PatientState.Admission },
        { ...patient, id: 'p-4', flags: [PatientFlag.ReassessmentDue] },
      ],
      emsInbound: 5,
    });

    expect(metrics).toHaveLength(5);
    expect(metrics.map((metric) => metric.label)).toEqual([
      'Waiting',
      'High risk',
      'EMS inbound',
      'Reassess due',
      'Boarders',
    ]);
    expect(metrics[0].value).toBe(3);
    expect(metrics[1].value).toBe(1);
    expect(metrics[2].value).toBe(5);
    expect(metrics[3].value).toBe(1);
    expect(metrics[4].value).toBe(1);
  });

  it('counts high-risk patients from priority and flags', () => {
    const count = countHighRiskPatients([
      patient,
      { ...patient, id: 'p-2', priority: Priority.P2 },
      { ...patient, id: 'p-3', flags: [PatientFlag.SepsisAlert] },
    ]);
    expect(count).toBe(2);
  });

  it('passes the 60-second readability test when shift strip is mounted', () => {
    const readable = evaluateShiftHandoffReadability({
      shiftHandoffStripVisible: true,
      clickDepthToAllSignals: 1,
    });
    expect(readable.passes60SecondTest).toBe(true);
    expect(readable.missing).toEqual([]);
  });

  it('fails readability for physicians before shift strip (high risk buried)', () => {
    const audit = auditShiftHandoffSurfaces(EMERGENCY_ROLE_IDS.physician);
    expect(audit.before.passes60SecondTest).toBe(false);
    expect(audit.before.missing).toContain('highRisk');
    expect(audit.after.passes60SecondTest).toBe(true);
  });
});
