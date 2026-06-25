import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  compactOperationalStripMetrics,
  PILOT_STATION_KPI_IDS,
  resolveCompactHeaderMetricLabel,
  resolveCompactStripMetricLabel,
  resolvePilotHeaderOperationalMetricKeys,
  resolvePilotStationKpiIds,
} from './stationKpiPolicy';

describe('stationKpiPolicy', () => {
  it('caps frontline KPI sets to two signals per station during pilot', () => {
    expect(resolvePilotStationKpiIds(CARE_DROID_SCREEN_MODES.reception, [
      'arrivals-today',
      'awaiting-verification',
      'awaiting-triage',
      'ems-inbound',
    ])).toEqual(PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.reception]);

    expect(resolvePilotStationKpiIds(CARE_DROID_SCREEN_MODES.triage, [
      'triage-pending',
      'longest-untriaged-wait',
      'triage-breached',
      'rapid-review-flags',
    ])).toEqual(PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.triage]);

    expect(resolvePilotStationKpiIds(CARE_DROID_SCREEN_MODES.chargeNurse, [
      'waiting-count',
      'triage-breached',
      'capacity-score',
      'boarders',
    ])).toEqual(PILOT_STATION_KPI_IDS[CARE_DROID_SCREEN_MODES.chargeNurse]);
  });

  it('resolves two compact header metric keys per frontline station', () => {
    expect(resolvePilotHeaderOperationalMetricKeys(CARE_DROID_SCREEN_MODES.chargeNurse)).toEqual([
      'waiting',
      'triageBreached',
    ]);
    expect(resolvePilotHeaderOperationalMetricKeys(CARE_DROID_SCREEN_MODES.physician)).toEqual([
      'providerBreached',
      'waiting',
    ]);
    expect(resolveCompactHeaderMetricLabel('triageBreached', 'Triage Breached')).toBe('Breached');
  });

  it('shortens strip metric labels for dense operational strips', () => {
    expect(resolveCompactStripMetricLabel('awaiting-triage', 'Awaiting triage')).toBe(
      'Triage queue',
    );
    expect(
      compactOperationalStripMetrics([
        { id: 'waiting-count', label: 'Waiting count', value: 4 },
      ])[0].label,
    ).toBe('Waiting');
  });
});