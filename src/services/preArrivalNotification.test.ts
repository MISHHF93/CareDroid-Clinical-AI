import { describe, expect, it } from 'vitest';
import {
  buildPreArrivalNotificationFromArrival,
  preArrivalNotificationCompletionPercent,
} from './preArrivalNotification';
import { Priority } from '../types/emergency';

const arrival = {
  id: 'ems-1',
  unitId: 'unit-1',
  unitName: 'Medic 7',
  crewNames: ['A'],
  patientAge: 62,
  patientSex: 'Male' as const,
  chiefComplaint: 'Chest pain',
  mechanismOfInjury: 'Rest pain',
  vitals: { hr: 110, sbp: 140, dbp: 90, spo2: 96, recordedAt: new Date().toISOString() },
  eta: 6,
  severity: 'High' as const,
  dispatchTime: new Date().toISOString(),
  estimatedArrivalTime: new Date().toISOString(),
  notes: 'Aspirin given',
  status: 'Inbound' as const,
  prearrivalComplaint: 'Chest pain',
  priority: Priority.P2,
};

describe('preArrivalNotification', () => {
  it('builds MIST notification from EMS arrival data', () => {
    const notification = buildPreArrivalNotificationFromArrival(arrival, 'mist');
    expect(notification.framework).toBe('mist');
    expect(notification.mist?.injuries).toContain('Chest pain');
    expect(notification.mist?.signs).toContain('HR 110');
    expect(preArrivalNotificationCompletionPercent(notification)).toBe(100);
  });

  it('builds SBAR notification from EMS arrival data', () => {
    const notification = buildPreArrivalNotificationFromArrival(arrival, 'sbar');
    expect(notification.sbar?.situation).toContain('Chest pain');
    expect(notification.sbar?.background).toContain('62y');
  });
});
