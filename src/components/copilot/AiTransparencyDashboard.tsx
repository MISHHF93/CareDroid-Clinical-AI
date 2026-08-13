import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import {
  buildAiTransparencyDashboardSnapshot,
  normalizeAiTransparencySnapshot,
} from '../../services/aiTransparencyModel';
import { COPILOT_RISK_LAYERS } from '@lib/native-ai';
import { AiTruthLabel, fromNativeAiSourceState } from '../ai/AiTruthLabel';
import '../native-ai/native-ai-dashboard-theme.css';
import './AiTransparencyDashboard.css';

type AiTransparencyDashboardProps = {
  patients: Patient[];
  compact?: boolean;
  className?: string;
};

const LAYER_LABELS = Object.fromEntries(COPILOT_RISK_LAYERS.map((layer) => [layer.id, layer.label]));

export default function AiTransparencyDashboard({
  patients,
  compact = false,
  className = '',
}: AiTransparencyDashboardProps) {
  const snapshot = useMemo(
    () => normalizeAiTransparencySnapshot(buildAiTransparencyDashboardSnapshot(patients ?? [])),
    [patients],
  );
  const routingTraces = snapshot.routingTraces;
  const records = snapshot.records;

  const visibleTraces = compact ? routingTraces.slice(0, 1) : routingTraces;
  const visibleRecords = compact ? records.slice(0, 1) : records;

  return (
    <section
      className={[
        'ai-transparency-dashboard',
        compact ? 'ai-transparency-dashboard--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="AI transparency"
    >
      {!compact ? (
        <header className="ai-transparency-dashboard__header">
          <p className="ai-transparency-dashboard__eyebrow">Native AI</p>
          <h2>Transparency</h2>
          <p className="ai-transparency-dashboard__subtitle">
            Routing, confidence, and model provenance for native AI outputs.
          </p>
        </header>
      ) : null}

      <div className="ai-transparency-dashboard__routing" aria-label="Routing">
        {!compact ? <h3>Routing</h3> : null}
        {!visibleTraces.length ? (
          <p className="ai-transparency-dashboard__empty">
            {compact ? 'No routing data for this patient yet.' : 'No routing traces yet.'}
          </p>
        ) : null}
        <ul>
          {visibleTraces.map((trace) => (
            <li key={trace.runId}>
              <strong>{trace.chiefComplaint}</strong>
              <span>
                {(trace.specialistDomains ?? []).join(', ') || 'General'} ·{' '}
                {Math.round((trace.confidence ?? 0) * 100)}%
              </span>
              <AiTruthLabel
                {...fromNativeAiSourceState(trace.sourceState, {
                  sourceContext: `Panel-of-experts routing engine ${trace.routerModelVersion}`,
                  reviewRequired: true,
                })}
                compact
              />
              {!compact ? (
                <small>{(trace.keySignals ?? []).join(' · ') || 'No signals recorded'}</small>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {!compact ? (
        <div className="ai-transparency-dashboard__records" role="list">
          {!visibleRecords.length ? (
            <p className="ai-transparency-dashboard__empty">No transparency records yet.</p>
          ) : null}
          {visibleRecords.map((record) => (
            <article key={record.id} className="ai-transparency-dashboard__record" role="listitem">
              <div className="ai-transparency-dashboard__record-head">
                <strong>{record.capabilityLabel}</strong>
                <span
                  className={`ai-transparency-dashboard__state ai-transparency-dashboard__state--${record.sourceState}`}
                >
                  {record.sourceState}
                </span>
              </div>
              <p>
                {LAYER_LABELS[record.layer] || record.layer} · {Math.round(record.confidence * 100)}% ·{' '}
                {record.modelId}
              </p>
              <ul>
                {(record.keyPredictors ?? []).slice(0, 3).map((predictor) => (
                  <li key={predictor}>{predictor}</li>
                ))}
              </ul>
              <small>{record.disclaimer}</small>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}