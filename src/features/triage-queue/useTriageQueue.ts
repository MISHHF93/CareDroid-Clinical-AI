import { useEmergencyStore } from '../../store/emergencyStore';
import { Priority } from '../../types/emergency';
import type { Patient } from '../../types/emergency';

const PRIORITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3, P5: 4 };

function sortByPriorityThenWait(a: Patient, b: Patient): number {
  const pa = PRIORITY_ORDER[String(a.priority)] ?? 5;
  const pb = PRIORITY_ORDER[String(b.priority)] ?? 5;
  if (pa !== pb) return pa - pb;
  return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime();
}

const WAITING_STATES = new Set(['Arrival', 'Registration', 'Triage', 'Waiting', 'Assessment']);

export function useTriageQueue(filter?: string | null) {
  const patients = useEmergencyStore((s) => s.patients);
  const queues = useEmergencyStore((s) => s.queues);
  const alerts = useEmergencyStore((s) => s.alerts);

  const waiting = patients
    .filter((p) => WAITING_STATES.has(p.state))
    .sort(sortByPriorityThenWait);

  const filtered = filter
    ? waiting.filter((p) => String(p.priority) === filter || p.state === filter)
    : waiting;

  const criticalCount = waiting.filter((p) => p.priority === Priority.P1 || p.priority === Priority.P2).length;
  const activeAlerts = alerts.filter((a) => !a.dismissed);

  return { patients: filtered, allWaiting: waiting, queues, criticalCount, activeAlerts };
}
