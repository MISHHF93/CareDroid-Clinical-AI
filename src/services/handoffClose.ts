import type { AmbulanceHandoffChecklist, EMSArrival, HandoffCloseRecord } from '../types/emergency';
import { ambulanceHandoffChecklistCompletionPercent } from './ambulanceHandoffChecklist';

export function isHandoffCloseComplete(record: HandoffCloseRecord | undefined): boolean {
  if (!record) return false;
  return Boolean(
    record.informationUnderstood &&
      record.questionsClarified &&
      record.receivingClinicianName?.trim() &&
      record.closedAt,
  );
}

export function canInitiateHandoffClose(
  arrival: EMSArrival,
  checklist?: AmbulanceHandoffChecklist | null,
): boolean {
  const resolved = checklist || arrival.ambulanceHandoffChecklist;
  if (!resolved) return arrival.status === 'Arrived' || arrival.status === 'Handoff';
  return ambulanceHandoffChecklistCompletionPercent(resolved) >= 60;
}

export function mergeHandoffClosePatch(
  current: HandoffCloseRecord | undefined,
  patch: Partial<HandoffCloseRecord>,
  actor?: { staffName?: string },
): HandoffCloseRecord {
  const timestamp = new Date().toISOString();
  const next: HandoffCloseRecord = {
    receivingClinicianName: '',
    informationUnderstood: false,
    questionsClarified: false,
    ...current,
    ...patch,
  };

  if (
    patch.informationUnderstood === true &&
    patch.questionsClarified === true &&
    next.receivingClinicianName?.trim() &&
    !next.closedAt
  ) {
    next.closedAt = timestamp;
    next.closedByStaffName = patch.closedByStaffName || actor?.staffName;
  }

  if (patch.informationUnderstood === false || patch.questionsClarified === false) {
    next.closedAt = undefined;
    next.closedByStaffName = undefined;
  }

  return next;
}

export function handoffCloseCompletionPercent(record: HandoffCloseRecord | undefined): number {
  if (!record) return 0;
  const steps = [
    Boolean(record.receivingClinicianName?.trim()),
    record.informationUnderstood,
    record.questionsClarified,
  ];
  const complete = steps.filter(Boolean).length;
  return Math.round((complete / steps.length) * 100);
}