import { COPILOT_RISK_LAYERS } from '@lib/native-ai';
import type { Patient } from '../../types/emergency';
import { buildNativeAiPatientSnapshot, formatRoutingLabel } from '../../services/nativeAiCore';
import { AiTruthLabel, fromNativeAiSourceState } from '../ai/AiTruthLabel';
import '../native-ai/native-ai-dashboard-theme.css';
import './CopilotRiskLayerPanel.css';

type CopilotRiskLayerPanelProps = {
  activeLayerId?: string;
  patient?: Patient | null;
  className?: string;
  compact?: boolean;
};

export default function CopilotRiskLayerPanel({
  activeLayerId = 'clinical_decision_support',
  patient = null,
  className = '',
  compact = false,
}: CopilotRiskLayerPanelProps) {
  const nativeAiSnapshot = patient ? buildNativeAiPatientSnapshot(patient) : null;
  const routingSignals = nativeAiSnapshot?.routing?.keySignals ?? [];
  const specialistInferences = nativeAiSnapshot?.specialistInferences ?? [];
  const layers = compact
    ? COPILOT_RISK_LAYERS.filter((layer) => layer.id === activeLayerId)
    : COPILOT_RISK_LAYERS;

  return (
    <section
      className={[
        'copilot-risk-layer-panel',
        compact ? 'copilot-risk-layer-panel--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Copilot safety"
    >
      {!compact ? (
        <header>
          <p className="copilot-risk-layer-panel__eyebrow">Safety layers</p>
          <h3>How Copilot is bounded</h3>
        </header>
      ) : null}
      <div className="copilot-risk-layer-panel__layers">
        {layers.map((layer) => (
          <article
            key={layer.id}
            className={[
              'copilot-risk-layer-panel__layer',
              layer.id === activeLayerId ? 'copilot-risk-layer-panel__layer--active' : '',
              layer.allowedInCoreProduct ? '' : 'copilot-risk-layer-panel__layer--blocked',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="copilot-risk-layer-panel__layer-head">
              {!compact ? <span>L{layer.layer}</span> : null}
              <strong>{layer.label}</strong>
            </div>
            <p>{compact ? layer.disclaimer : layer.description}</p>
            {!compact ? (
              <ul>
                {layer.examples.slice(0, 2).map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            ) : null}
            {!compact ? <small>{layer.disclaimer}</small> : null}
            {layer.id === 'clinical_decision_support' && nativeAiSnapshot ? (
              <div className="copilot-risk-layer-panel__cds-detail" aria-label="Patient routing signals">
                {routingSignals.length ? (
                  <p>{routingSignals.slice(0, 3).join(' · ')}</p>
                ) : null}
                {specialistInferences[0] ? (
                  <p>
                    {specialistInferences[0].specialistLabel}: {specialistInferences[0].prediction} (
                    {Math.round(specialistInferences[0].confidence * 100)}%)
                  </p>
                ) : null}
                <p>
                  Route: {formatRoutingLabel(nativeAiSnapshot.routing)} ·{' '}
                  {Math.round(nativeAiSnapshot.routing.confidence * 100)}%
                </p>
                <AiTruthLabel
                  {...fromNativeAiSourceState(nativeAiSnapshot.sourceState, {
                    sourceContext: 'Panel-of-experts routing + specialist inference (CDS layer)',
                  })}
                  compact
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {compact && !patient ? (
        <p className="copilot-risk-layer-panel__hint">Select a patient on the board for routing detail.</p>
      ) : null}
    </section>
  );
}