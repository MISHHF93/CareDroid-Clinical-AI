import { useMemo } from 'react';
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

  // Store mutations to any slice (or an unrelated parent re-render) previously
  // reran these filter/sort chains on every render, even when patients/alerts
  // hadn't actually changed.
  const waiting = useMemo(
    () => patients.filter((p) => WAITING_STATES.has(p.state)).sort(sortByPriorityThenWait),
    [patients],
  );

  const filtered = useMemo(
    () =>
      filter ? waiting.filter((p) => String(p.priority) === filter || p.state === filter) : waiting,
    [filter, waiting],
  );

  const criticalCount = useMemo(
    () => waiting.filter((p) => p.priority === Priority.P1 || p.priority === Priority.P2).length,
    [waiting],
  );
  const activeAlerts = useMemo(() => alerts.filter((a) => !a.dismissed), [alerts]);

  return { patients: filtered, allWaiting: waiting, queues, criticalCount, activeAlerts };
}
