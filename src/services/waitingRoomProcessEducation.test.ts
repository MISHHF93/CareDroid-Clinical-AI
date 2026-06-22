import { describe, expect, it } from 'vitest';
import {
  WAITING_ROOM_PROCESS_EDUCATION_STEPS,
  WAITING_ROOM_PROCESS_STEP,
  buildWaitingRoomProcessEducationSnapshot,
} from './waitingRoomProcessEducation';

describe('waitingRoomProcessEducation', () => {
  it('defines seven simple visit steps in order', () => {
    expect(WAITING_ROOM_PROCESS_EDUCATION_STEPS).toHaveLength(7);
    expect(WAITING_ROOM_PROCESS_EDUCATION_STEPS.map((step) => step.label)).toEqual([
      'Registration',
      'Triage',
      'Waiting',
      'Clinician Assessment',
      'Tests / Results',
      'Treatment / Disposition',
      'Discharge / Admission',
    ]);
    expect(WAITING_ROOM_PROCESS_EDUCATION_STEPS[0]?.id).toBe(WAITING_ROOM_PROCESS_STEP.REGISTRATION);
    expect(WAITING_ROOM_PROCESS_EDUCATION_STEPS[6]?.id).toBe(
      WAITING_ROOM_PROCESS_STEP.DISCHARGE_ADMISSION,
    );
  });

  it('builds patient-facing education copy without clinical jargon', () => {
    const snapshot = buildWaitingRoomProcessEducationSnapshot('patient');
    expect(snapshot.steps).toHaveLength(7);
    expect(snapshot.title).toContain('what to expect');
    expect(snapshot.steps[1]?.description).toContain('nurse');
    expect(snapshot.steps[1]?.description.toLowerCase()).not.toContain('acuity');
    expect(snapshot.steps[4]?.label).toBe('Tests / Results');
  });

  it('builds staff-facing education copy for reception', () => {
    const snapshot = buildWaitingRoomProcessEducationSnapshot('staff');
    expect(snapshot.title).toContain('Emergency visit steps');
    expect(snapshot.steps[0]?.description).toContain('checks in');
  });
});
