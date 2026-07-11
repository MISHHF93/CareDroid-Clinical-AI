import { useEffect, useMemo, useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useTriageQueue } from './useTriageQueue';
import { QueueHeader } from '../../domain/queue/QueueHeader';
import { QueueList } from '../../domain/queue/QueueList';
import { BottleneckAlert } from '../../domain/queue/BottleneckAlert';
import { AIInsightPanel } from '../../components/ai';
import { useCareDroidAI } from '../../hooks/useCareDroidAI';
import type { Patient } from '../../types/emergency';
import type { CareDroidAIRequest } from '../../../lib/ai/careDroidAI';
import './TriageQueueFeature.css';

const FILTERS = [
  { label: 'All', value: null },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
  { label: 'P3', value: 'P3' },
  { label: 'P4', value: 'P4' },
  { label: 'P5', value: 'P5' },
] as const;

type TriageQueueFeatureProps = {
  onSelectPatient?: (patient: Patient) => void;
};

export function TriageQueueFeature({ onSelectPatient }: TriageQueueFeatureProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const { patients, allWaiting, criticalCount, activeAlerts } = useTriageQueue(filter);
  const setSelected = useEmergencyStore((s) => s.selectPatient);

  const filterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allWaiting.forEach((patient) => {
      const key = String(patient.priority);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [allWaiting]);
  const averageWaitTime = useMemo(() => calculateAverageWaitMinutes(allWaiting), [allWaiting]);
  const queueAiRequest = useMemo<CareDroidAIRequest>(
    () => ({
      intent: 'hospital_command_insight',
      input: {
        averageWaitTime,
        patientsWaiting: allWaiting.length,
        admissionsToday: 0,
        dischargesToday: 0,
        erOccupancy: Math.min(100, Math.round((allWaiting.length / 24) * 100)),
        bedOccupancy: 0,
        staffUtilization: 0,
        triageTime: Math.min(averageWaitTime, 45),
        departmentStatus: {
          triageQueue: patients.length,
          criticalCount,
        },
      },
      context: {
        sourceScreen: 'triage_queue',
        userRole: 'triage_nurse',
      },
    }),
    [allWaiting.length, averageWaitTime, criticalCount, patients.length],
  );
  const {
    response: queueAiInsight,
    isLoading: queueAiLoading,
    error: queueAiError,
    run: runQueueAi,
  } = useCareDroidAI(queueAiRequest);

  useEffect(() => {
    void runQueueAi(queueAiRequest).catch(() => undefined);
  }, [queueAiRequest, runQueueAi]);

  function handleSelect(patient: Patient) {
    setSelected(patient.id);
    onSelectPatient?.(patient);
  }

  const bottleneck = activeAlerts.find((a) => a.type === 'Capacity' || a.type === 'Queue');

  return (
    <section className="cd-triage-queue" aria-label="Triage queue workspace">
      <QueueHeader name="Triage Queue" count={patients.length} criticalCount={criticalCount} />

      <div className="cd-triage-queue__filters" role="group" aria-label="Filter triage queue by acuity">
        {FILTERS.map((f) => {
          const selected = filter === f.value;
          const count = f.value == null ? allWaiting.length : filterCounts.get(f.value) ?? 0;
          return (
            <button
              key={String(f.value)}
              type="button"
              className="cd-triage-queue__filter"
              data-active={selected ? 'true' : 'false'}
              onClick={() => setFilter(f.value)}
              {...((selected) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
            >
              <span>{f.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      {bottleneck ? (
        <div className="cd-triage-queue__bottleneck" aria-live="polite">
          <BottleneckAlert
            title={bottleneck.title}
            subtitle={bottleneck.message}
            severity={bottleneck.severity === 'Critical' ? 'critical' : 'warning'}
          />
        </div>
      ) : null}

      <AIInsightPanel
        title="Queue AI Insight"
        subtitle="Operational decision support for triage flow"
        responses={queueAiInsight ? [queueAiInsight] : []}
        isLoading={queueAiLoading}
        error={queueAiError}
        emptyMessage="Queue insight will appear when live queue data is available."
      />

      <div className="cd-triage-queue__list">
        <QueueList patients={patients} onSelect={handleSelect} />
      </div>
    </section>
  );
}

function calculateAverageWaitMinutes(patients: Patient[]): number {
  if (!patients.length) return 0;
  const now = Date.now();
  const total = patients.reduce((sum, patient) => {
    const arrivedAt = new Date(patient.arrivalTime).getTime();
    if (!Number.isFinite(arrivedAt)) return sum;
    return sum + Math.max(0, Math.round((now - arrivedAt) / 60000));
  }, 0);
  return Math.round(total / patients.length);
}
