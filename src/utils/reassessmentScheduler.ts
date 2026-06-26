const ACTIVE_REMINDER_STATUSES = new Set(['pending', 'snoozed']);
export const REASSESSMENT_REMINDER_WARNING_WINDOW_MS = 2 * 60 * 1000;
export const REASSESSMENT_REMINDER_OVERDUE_MS = 10 * 60 * 1000;

export function activeReassessmentReminders(patient) {
  return (patient?.reassessmentReminders || []).filter((reminder) =>
    ACTIVE_REMINDER_STATUSES.has(reminder.status)
  );
}

export function reminderStage(reminder, now = new Date()) {
  if (!reminder || reminder.status === 'completed') return null;
  const dueAt = new Date(reminder.dueAt).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(dueAt)) return null;
  if (nowMs >= dueAt + REASSESSMENT_REMINDER_OVERDUE_MS) return 'overdue';
  if (nowMs >= dueAt) return 'due';
  if (dueAt - nowMs <= REASSESSMENT_REMINDER_WARNING_WINDOW_MS) return 'upcoming';
  return null;
}

export function nextActiveReminder(patient, now = new Date()) {
  return activeReassessmentReminders(patient)
    .map((reminder) => ({ reminder, stage: reminderStage(reminder, now) }))
    .filter((item) => item.stage)
    .sort((a, b) => new Date(a.reminder.dueAt).getTime() - new Date(b.reminder.dueAt).getTime())[0];
}

export function hasDueReassessmentReminder(patient, now = new Date()) {
  return activeReassessmentReminders(patient).some((reminder) => {
    const stage = reminderStage(reminder, now);
    return stage === 'due' || stage === 'overdue';
  });
}

export function pendingReminderCountForStaff(patients = [] as any[], staffId) {
  if (!staffId) return 0;
  return patients
    .filter((patient) => patient.assignedStaffId === staffId)
    .reduce((count, patient) => count + activeReassessmentReminders(patient).length, 0);
}

export function reminderAlertId(reminder, stage) {
  return `alert-reassessment-reminder-${stage}-${reminder.id}`;
}
