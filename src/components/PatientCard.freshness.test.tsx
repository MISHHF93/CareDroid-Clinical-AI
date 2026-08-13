import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PatientCard from './PatientCard';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority } from '../types/emergency';

const originalState = useEmergencyStore.getState();

/**
 * HEAL-183: operationalMeta/reassessmentTimer/queueTiming were memoized on `[patient]` (or
 * similar) alone, but the builders behind them compare a stored timestamp against wall-clock
 * "now" -- since PatientCard is `memo()`-wrapped, once a patient's flags/object reference stop
 * changing, these values (and the PatientQueueTimingBadge nested inside, which has its own
 * separate `now`-gated memo) would freeze indefinitely even though real elapsed time keeps
 * growing. Proven here the same way HEAL-182 proved FullJourneyOperatingPage's staleness: render
 * the SAME patient object at two different `now` values and confirm the displayed elapsed-time
 * text actually changes, rather than trusting the component "looks right" once.
 */
describe('PatientCard — time-derived display freshness (HEAL-183)', () => {
  it('updates elapsed/queue-timing text when only the now prop advances, same patient object', () => {
    const patient = {
      id: 'wb-patient-fresh-1',
      mrn: 'ED-9101',
      firstName: 'Sasha',
      lastName: 'Kim',
      dob: '1990-01-01',
      age: 34,
      sex: 'Female' as const,
      arrivalTime: '2026-08-13T12:00:00.000Z',
      triageTime: '2026-08-13T12:00:00.000Z',
      chiefComplaint: 'Abdominal pain',
      complaintCategory: 'Abdominal pain',
      state: PatientState.Triage,
      priority: Priority.P3,
      vitals: [],
      flags: [],
      notes: [],
      timeline: [],
      arrival: {
        arrivalMode: 'self-check-in' as const,
        arrivalTimestamp: '2026-08-13T12:00:00.000Z',
        chiefComplaint: 'Abdominal pain',
        triageAcuity: {
          code: Priority.P3,
          system: 'PRIORITY' as const,
          level: 3 as const,
          status: 'suggested' as const,
        },
        waitingRoomStatus: 'waiting-for-triage' as const,
        registrationStatus: 'complete' as const,
        queueDestination: 'triage-queue' as const,
        triagePending: true,
      },
    };

    useEmergencyStore.setState(
      { ...originalState, patients: [patient], selectedPatientId: null },
      true,
    );

    const t1 = new Date('2026-08-13T12:05:00.000Z').getTime();
    const t2 = new Date('2026-08-13T13:35:00.000Z').getTime(); // +90 minutes, same patient object

    const { container, rerender } = render(
      <MemoryRouter>
        <PatientCard patient={patient as never} layout="card" now={t1} />
      </MemoryRouter>,
    );

    const elapsedAtT1 = container.querySelector('.patient-queue-timing__elapsed')?.textContent;
    expect(elapsedAtT1).toBeTruthy();

    rerender(
      <MemoryRouter>
        <PatientCard patient={patient as never} layout="card" now={t2} />
      </MemoryRouter>,
    );

    const elapsedAtT2 = container.querySelector('.patient-queue-timing__elapsed')?.textContent;
    expect(elapsedAtT2).toBeTruthy();
    expect(elapsedAtT2).not.toBe(elapsedAtT1);
  });
});
