import { afterEach, describe, expect, it } from 'vitest';
import {
  selectEmergencyOperationalSummary,
  useEmergencyStore,
} from './emergencyStore';
import { PatientState, Priority } from '../types/emergency';

const originalState = useEmergencyStore.getState();

describe('Emergency operational summary selector', () => {
  afterEach(() => {
    useEmergencyStore.setState(originalState, true);
  });

  it('projects the normalized global command metrics from store state', () => {
    const summary = selectEmergencyOperationalSummary(useEmergencyStore.getState());

    expect(summary.metrics.map((metric) => metric.label)).toEqual([
      'Patients Today',
      'Waiting',
      'Longest Wait',
      'Average Wait',
      'EMS Inbound',
      'Reassessments Due',
      'Capacity Score',
      'Boarders',
      'Referrals Pending',
    ]);
    expect(summary.metrics.every((metric) => metric.source.length > 0)).toBe(true);
  });

  it('HEAL-326: an abandoned patient waiting for weeks does not blow up the Longest Wait / Average Wait header KPIs', () => {
    // Confirmed live: a long-running dev/demo session left one patient in
    // PatientState.Waiting for 24+ days, and this selector's unbounded
    // minutesSince(arrivalTime) reduce showed "597h 44m CRIT" in the global
    // header -- a real-looking but nonsensical value for a live demo.
    const now = Date.now();
    const staleArrival = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const recentArrival = new Date(now - 45 * 60 * 1000).toISOString(); // 45 minutes ago

    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [
          {
            ...originalState.patients[0],
            id: 'stale-abandoned-patient',
            mrn: 'ED-HEAL326-STALE',
            state: PatientState.Waiting,
            priority: Priority.P3,
            arrivalTime: staleArrival,
          } as any,
          {
            ...originalState.patients[0],
            id: 'recent-waiting-patient',
            mrn: 'ED-HEAL326-RECENT',
            state: PatientState.Waiting,
            priority: Priority.P3,
            arrivalTime: recentArrival,
          } as any,
        ],
        capacity: { ...originalState.capacity, longestWaitMinutes: undefined },
      },
      true,
    );

    const summary = selectEmergencyOperationalSummary(useEmergencyStore.getState());
    const longestWait = summary.metrics.find((metric) => metric.key === 'longestWait');

    expect(longestWait?.value).toBe('45m');
    expect(longestWait?.tone).not.toBe('critical');
  });
});
