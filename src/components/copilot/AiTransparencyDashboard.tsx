import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import {
  buildAiTransparencyDashboardSnapshot,
  normalizeAiTransparencySnapshot,
} from '../../services/aiTransparencyModel';
import { COPILOT_RISK_LAYERS } from '../../../lib/native-ai';
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

  return (
    <section
      className={[
        'ai-transparency-dashboard',
        compact ? 'ai-transparency-dashboard--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="AI transparency dashboard"
    >
      <header className="ai-transparency-dashboard__header">
        <p className="ai-transparency-dashboard__eyebrow">Native AI transparency</p>
        <h2>{compact ? 'AI transparency' : 'AI Transparency Dashboard'}</h2>
        {!compact ? (
          <p className="ai-transparency-dashboard__subtitle">
            Provenance, routing, confidence, and key predictors for CareDroid native AI recommendations.
          </p>
        ) : null}
      </header>

      <div className="ai-transparency-dashboard__routing" aria-label="Router dispatch decisions">
        <h3>Router dispatch</h3>
        {!routingTraces.length ? (
          <p className="ai-transparency-dashboard__empty">
            No routing traces yet. Select patients on the board to populate native AI provenance.
          </p>
        ) : null}
        <ul>
          {routingTraces.map((trace) => (
            <li key={trace.runId}>
              <strong>{trace.chiefComplaint}</strong>
              <span>
                Routed to {(trace.specialistDomains ?? []).join(', ') || 'general'} ·{' '}
                {Math.round((trace.confidence ?? 0) * 100)}% · {trace.sourceState}
              </span>
              <small>{(trace.keySignals ?? []).join(' · ') || 'No routing signals recorded'}</small>
            </li>
          ))}
        </ul>
      </div>

      <div className="ai-transparency-dashboard__records" role="list">
        {!records.length ? (
          <p className="ai-transparency-dashboard__empty">
            No transparency records for the current patient set. Native AI scores appear after board patients load.
          </p>
        ) : null}
        {records.map((record) => (
          <article key={record.id} className="ai-transparency-dashboard__record" role="listitem">
            <div className="ai-transparency-dashboard__record-head">
              <strong>{record.capabilityLabel}</strong>
              <span className={`ai-transparency-dashboard__state ai-transparency-dashboard__state--${record.sourceState}`}>
                {record.sourceState}
              </span>
            </div>
            <p>
              Layer {LAYER_LABELS[record.layer] || record.layer} · Confidence {Math.round(record.confidence * 100)}% ·{' '}
              {record.modelId} v{record.modelVersion}
            </p>
            <ul>
              {(record.keyPredictors ?? []).map((predictor) => (
                <li key={predictor}>{predictor}</li>
              ))}
            </ul>
            <small>{record.disclaimer}</small>
          </article>
        ))}
      </div>
    </section>
  );
}