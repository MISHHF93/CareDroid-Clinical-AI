import { describe, expect, it } from 'vitest';
import {
  pendingReminderCountForStaff,
  reminderStage,
} from './reassessmentScheduler';

describe('reassessmentScheduler', () => {
  it('classifies reminder stages by due time', () => {
    const now = new Date('2026-06-11T14:43:00.000Z');

    expect(
      reminderStage(
        {
          id: 'upcoming',
          dueAt: '2026-06-11T14:45:00.000Z',
          status: 'pending',
        },
        now
      )
    ).toBe('upcoming');
    expect(
      reminderStage(
        {
          id: 'due',
          dueAt: '2026-06-11T14:42:00.000Z',
          status: 'pending',
        },
        now
      )
    ).toBe('due');
    expect(
      reminderStage(
        {
          id: 'overdue',
          dueAt: '2026-06-11T14:30:00.000Z',
          status: 'pending',
        },
        now
      )
    ).toBe('overdue');
  });

  it('counts active reminders only for assigned patients', () => {
    const patients = [
      {
        assignedStaffId: 'rn-1',
        reassessmentReminders: [
          { id: 'pending', status: 'pending' },
          { id: 'snoozed', status: 'snoozed' },
          { id: 'completed', status: 'completed' },
        ],
      },
      {
        assignedStaffId: 'rn-2',
        reassessmentReminders: [{ id: 'other', status: 'pending' }],
      },
    ];

    expect(pendingReminderCountForStaff(patients, 'rn-1')).toBe(2);
  });
});
