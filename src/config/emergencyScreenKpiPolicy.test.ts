import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState } from '../types/emergency';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  buildScreenModeKpiSnapshot,
  buildTriageKpiValues,
  EMERGENCY_SCREEN_KPI_POLICY,
  filterOperationalMetricsByScreenMode,
  resolveChargeNurseStripMetricIds,
  resolveCommandCenterMetricIds,
  resolveCommandCenterWidgetVisibility,
  resolvePublicWaitingKpiWidgets,
  resolveReceptionStripMetricIds,
  resolveScreenModeKpiIds,
  resolveTriageStripMetricIds,
} from './emergencyScreenKpiPolicy';

describe('emergencyScreenKpiPolicy', () => {
  it('defines KPI sets per requested screen modes', () => {
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.reception)).toEqual([
      'arrivals-today',
      'awaiting-verification',
      'awaiting-triage',
      'longest-untriaged-wait',
      'triage-breach-approaching',
      'triage-breached',
      'rapid-review-flags',
      'queue-size',
      'ems-inbound',
      'crowd-level',
    ]);
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.triage)).toEqual([
      'triage-pending',
      'longest-untriaged-wait',
      'triage-breach-approaching',
      'triage-breached',
      'rapid-review-flags',
      'ems-handoffs-pending',
    ]);
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.chargeNurse)).toEqual([
      'triage-pending',
      'longest-untriaged-wait',
      'triage-breach-approaching',
      'triage-breached',
      'rapid-review-flags',
      'waiting-count',
      'awaiting-clinician',
      'longest-provider-wait',
      'average-provider-wait',
      'provider-wait-approaching',
      'provider-wait-breached',
      'reassessments-due',
      'capacity-score',
      'crowd-level',
      'boarders',
      'ems-inbound',
      'offload-delays',
      'offload-duration',
      'handoff-pending',
    ]);
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.physician)).toEqual([
      'awaiting-clinician',
      'longest-provider-wait',
      'average-provider-wait',
      'provider-wait-approaching',
      'provider-wait-breached',
    ]);
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.publicWaiting)).toEqual([
      'average-wait-range',
      'crowd-level',
      'ems-crowding-impact',
      'process-stage-messaging',
    ]);
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.commandCenter)).toEqual([
      'triage-pending',
      'longest-untriaged-wait',
      'triage-breach-approaching',
      'triage-breached',
      'rapid-review-flags',
      'awaiting-clinician',
      'longest-provider-wait',
      'average-provider-wait',
      'provider-wait-approaching',
      'provider-wait-breached',
      'throughput',
      'crowding',
      'offload',
      'boarding',
      'referrals',
      'trend-metrics',
    ]);
  });

  it('maps reception KPIs to existing strip metric ids', () => {
    expect(resolveReceptionStripMetricIds(CARE_DROID_SCREEN_MODES.reception)).toEqual([
      'arrivals-today',
      'awaiting-verification',
      'awaiting-triage',
      'door-to-triage',
      'triage-breach-risk',
      'triage-breached',
      'rapid-review',
      'queue-size',
      'ems-inbound',
      'crowd-level',
    ]);
  });

  it('maps triage KPIs to strip metric ids', () => {
    expect(resolveTriageStripMetricIds(CARE_DROID_SCREEN_MODES.triage)).toEqual([
      'triage-pending',
      'longest-untriaged-wait',
      'triage-breach-approaching',
      'triage-breached',
      'rapid-review-flags',
      'ems-handoffs-pending',
    ]);
  });

  it('maps charge nurse KPIs to strip metric ids', () => {
    expect(resolveChargeNurseStripMetricIds(CARE_DROID_SCREEN_MODES.chargeNurse)).toEqual([
      'triage-awaiting',
      'longest-untriaged',
      'triage-approaching',
      'triage-breached',
      'rapid-review',
      'waiting-count',
      'provider-awaiting',
      'longest-provider-wait',
      'average-provider-wait',
      'provider-approaching',
      'provider-breached',
      'reassessments',
      'capacity',
      'crowd-level',
      'boarding',
      'ems-inbound',
      'offload-delays',
      'offload-duration',
      'handoff-pending',
    ]);
  });

  it('maps public waiting KPIs to display widgets', () => {
    expect(resolvePublicWaitingKpiWidgets(CARE_DROID_SCREEN_MODES.publicWaiting)).toEqual([
      'wait-range',
      'crowd-level',
      'ems-crowding-impact',
      'care-process-stages',
      'patient-guidance',
    ]);
  });

  it('maps command center KPI groups to throughput widgets and metrics', () => {
    const widgets = resolveCommandCenterWidgetVisibility(CARE_DROID_SCREEN_MODES.commandCenter);
    expect(widgets?.['triage-awaiting']).toBe(true);
    expect(widgets?.['triage-breached']).toBe(true);
    expect(widgets?.['arrivals-by-hour']).toBe(true);
    expect(widgets?.['ems-offload-delays']).toBe(true);
    expect(widgets?.['ems-inbound']).toBe(true);
    expect(widgets?.['offload-duration']).toBe(true);
    expect(widgets?.['handoff-pending']).toBe(true);
    expect(widgets?.['boarding-duration']).toBe(true);
    expect(widgets?.['referrals-backlog']).toBe(true);
    expect(widgets?.['lwbs-risk']).toBe(true);

    const metricIds = resolveCommandCenterMetricIds(CARE_DROID_SCREEN_MODES.commandCenter);
    expect(metricIds).toContain('triage-awaiting');
    expect(metricIds).toContain('triage-breached');
    expect(metricIds).toContain('rapid-review-flags');
    expect(metricIds).toContain('provider-awaiting');
    expect(metricIds).toContain('provider-breached');
    expect(metricIds).toContain('avg-wait-provider');
    expect(metricIds).toContain('ems-inbound');
    expect(metricIds).toContain('offload-duration');
    expect(metricIds).toContain('handoff-pending');
    expect(metricIds).toContain('ems-offload-delays');
    expect(metricIds).toContain('boarding-duration');
    expect(metricIds).toContain('referrals-backlog');
    expect(metricIds).toContain('lwbs-risk');
  });

  it('filters header operational metrics by screen mode policy', () => {
    const metrics = [
      { key: 'waiting', label: 'Waiting', value: 4 },
      { key: 'boarders', label: 'Boarders', value: 2 },
      { key: 'referralsPending', label: 'Referrals', value: 1 },
    ];
    const chargeFiltered = filterOperationalMetricsByScreenMode(
      metrics,
      CARE_DROID_SCREEN_MODES.chargeNurse,
    );
    expect(chargeFiltered.map((metric) => metric.key)).toEqual(['waiting', 'boarders']);
  });

  it('builds triage KPI values from patient and EMS data', () => {
    const patients = [
      {
        id: 'p1',
        state: PatientState.Triage,
        arrivalTime: new Date(Date.now() - 45 * 60000).toISOString(),
        flags: [PatientFlag.HighRisk],
      },
    ];
    const values = buildTriageKpiValues({ patients, emsArrivals: [] });
    expect(values['triage-pending'].value).toBeGreaterThanOrEqual(1);
    expect(values['longest-untriaged-wait'].value).not.toBe('—');
    expect(values['triage-breach-approaching']).toBeTruthy();
    expect(values['triage-breached']).toBeTruthy();
  });

  it('builds reception KPI snapshot from existing patient data', () => {
    const patients = [
      {
        id: 'p1',
        state: PatientState.Registration,
        arrivalTime: new Date().toISOString(),
      },
      {
        id: 'p2',
        state: PatientState.Triage,
        arrivalTime: new Date().toISOString(),
      },
    ];
    const snapshot = buildScreenModeKpiSnapshot({
      screenMode: CARE_DROID_SCREEN_MODES.reception,
      patients,
      emsInbound: 2,
    });
    expect(snapshot.kpis).toHaveLength(EMERGENCY_SCREEN_KPI_POLICY[CARE_DROID_SCREEN_MODES.reception].length);
    expect(snapshot.kpis.find((kpi) => kpi.id === 'ems-inbound')?.value).toBe(2);
  });

  it('builds command center and public waiting KPI snapshots from throughput builders', () => {
    const patients = [
      {
        id: 'p1',
        state: PatientState.Waiting,
        arrivalTime: '2026-06-20T08:00:00.000Z',
        triageTime: '2026-06-20T08:30:00.000Z',
      },
    ];
    const capacity = {
      score: 70,
      band: 'Yellow',
      updatedAt: '2026-06-20T10:00:00.000Z',
      totalPatients: 1,
      occupiedRooms: 10,
      boardingCount: 0,
      reassessmentDue: 0,
      waitingCount: 1,
      averageWaitMinutes: 30,
      longestWaitMinutes: 30,
    };
    const commandSnapshot = buildScreenModeKpiSnapshot({
      screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
      patients,
      capacity,
      now: new Date('2026-06-20T10:00:00.000Z'),
    });
    expect(commandSnapshot.kpis).toHaveLength(
      EMERGENCY_SCREEN_KPI_POLICY[CARE_DROID_SCREEN_MODES.commandCenter].length,
    );
    expect(commandSnapshot.kpis.find((kpi) => kpi.id === 'provider-wait-breached')).toBeTruthy();
    expect(commandSnapshot.kpis.find((kpi) => kpi.id === 'throughput')?.value).toBeTruthy();

    const publicSnapshot = buildScreenModeKpiSnapshot({
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
      patients,
      capacity,
      now: new Date('2026-06-20T10:00:00.000Z'),
    });
    expect(publicSnapshot.kpis).toHaveLength(
      EMERGENCY_SCREEN_KPI_POLICY[CARE_DROID_SCREEN_MODES.publicWaiting].length,
    );
    expect(publicSnapshot.kpis.find((kpi) => kpi.id === 'crowd-level')?.value).toBeTruthy();
  });

  it('filters public waiting KPIs when minimal public display privacy is configured', () => {
    expect(
      resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.publicWaiting, {
        publicDisplayPrivacy: 'minimal',
      }),
    ).toEqual(['crowd-level']);
  });

  it('honors configured KPI visibility overrides per screen mode', () => {
    expect(
      resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.reception, {
        screenModeKpiVisibility: {
          [CARE_DROID_SCREEN_MODES.reception]: ['arrivals-today', 'queue-size'],
        },
      }),
    ).toEqual(['arrivals-today', 'queue-size']);
  });
});
