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
import { PILOT_STATION_KPI_IDS } from './stationKpiPolicy';

describe('emergencyScreenKpiPolicy', () => {
  it('defines pilot KPI sets per requested screen modes during practitioner cleanup', () => {
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.reception)).toEqual(
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.reception],
    );
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.triage)).toEqual(
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.triage],
    );
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.chargeNurse)).toEqual(
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.chargeNurse],
    );
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.physician)).toEqual(
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.physician],
    );
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.publicWaiting)).toEqual(
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.publicWaiting],
    );
    expect(resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.commandCenter)).toEqual(
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.commandCenter],
    );
  });

  it('retains full enterprise KPI catalogs for settings and documentation', () => {
    expect(EMERGENCY_SCREEN_KPI_POLICY[CARE_DROID_SCREEN_MODES.reception]).toHaveLength(10);
    expect(EMERGENCY_SCREEN_KPI_POLICY[CARE_DROID_SCREEN_MODES.chargeNurse]).toHaveLength(19);
    expect(EMERGENCY_SCREEN_KPI_POLICY[CARE_DROID_SCREEN_MODES.commandCenter]).toHaveLength(16);
  });

  it('maps reception KPIs to existing strip metric ids', () => {
    expect(resolveReceptionStripMetricIds(CARE_DROID_SCREEN_MODES.reception)).toEqual([
      'arrivals-today',
      'awaiting-triage',
    ]);
  });

  it('maps triage KPIs to strip metric ids', () => {
    expect(resolveTriageStripMetricIds(CARE_DROID_SCREEN_MODES.triage)).toEqual([
      'triage-pending',
      'triage-breached',
    ]);
  });

  it('maps charge nurse KPIs to strip metric ids', () => {
    expect(resolveChargeNurseStripMetricIds(CARE_DROID_SCREEN_MODES.chargeNurse)).toEqual([
      'waiting-count',
      'triage-breached',
    ]);
  });

  it('maps public waiting KPIs to display widgets', () => {
    expect(resolvePublicWaitingKpiWidgets(CARE_DROID_SCREEN_MODES.publicWaiting)).toEqual([
      'wait-range',
      'crowd-level',
    ]);
  });

  it('maps command center KPI groups to throughput widgets and metrics', () => {
    const widgets = resolveCommandCenterWidgetVisibility(CARE_DROID_SCREEN_MODES.commandCenter);
    expect(widgets?.['triage-breached']).toBe(true);
    expect(widgets?.['crowd-level']).toBe(true);
    expect(widgets?.['capacity-score']).toBe(true);
    expect(widgets?.['triage-awaiting']).toBe(false);
    expect(widgets?.['arrivals-by-hour']).toBe(false);

    const metricIds = resolveCommandCenterMetricIds(CARE_DROID_SCREEN_MODES.commandCenter);
    expect(metricIds).toContain('triage-breached');
    expect(metricIds).toContain('crowd-level');
    expect(metricIds).toContain('capacity-score');
    expect(metricIds).not.toContain('triage-awaiting');
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
    expect(chargeFiltered.map((metric) => metric.key)).toEqual(['waiting']);
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
    expect(snapshot.kpis).toHaveLength(
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.reception]!.length,
    );
    expect(snapshot.kpis.find((kpi) => kpi.id === 'awaiting-triage')?.value).toBeGreaterThanOrEqual(
      1,
    );
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
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.commandCenter]!.length,
    );
    expect(commandSnapshot.kpis.find((kpi) => kpi.id === 'triage-breached')).toBeTruthy();
    expect(commandSnapshot.kpis.find((kpi) => kpi.id === 'crowding')?.value).toBeTruthy();

    const publicSnapshot = buildScreenModeKpiSnapshot({
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
      patients,
      capacity,
      now: new Date('2026-06-20T10:00:00.000Z'),
    });
    expect(publicSnapshot.kpis).toHaveLength(
      PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.publicWaiting]!.length,
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
    ).toEqual(['arrivals-today']);
  });
});