import { COPILOT_RISK_LAYERS } from '../../../lib/native-ai';
import type { Patient } from '../../types/emergency';
import { buildNativeAiPatientSnapshot, formatRoutingLabel } from '../../services/nativeAiCore';
import '../native-ai/native-ai-dashboard-theme.css';
import './CopilotRiskLayerPanel.css';

type CopilotRiskLayerPanelProps = {
  activeLayerId?: string;
  patient?: Patient | null;
  className?: string;
};

export default function CopilotRiskLayerPanel({
  activeLayerId = 'clinical_decision_support',
  patient = null,
  className = '',
}: CopilotRiskLayerPanelProps) {
  const nativeAiSnapshot = patient ? buildNativeAiPatientSnapshot(patient) : null;
  const routingSignals = nativeAiSnapshot?.routing?.keySignals ?? [];
  const specialistInferences = nativeAiSnapshot?.specialistInferences ?? [];
  return (
    <section className={['copilot-risk-layer-panel', className].filter(Boolean).join(' ')} aria-label="Copilot risk layers">
      <header>
        <p className="copilot-risk-layer-panel__eyebrow">5-layer AI stack</p>
        <h3>Copilot Safety Layers</h3>
      </header>
      <div className="copilot-risk-layer-panel__layers">
        {COPILOT_RISK_LAYERS.map((layer) => (
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
              <span>L{layer.layer}</span>
              <strong>{layer.label}</strong>
            </div>
            <p>{layer.description}</p>
            <ul>
              {layer.examples.slice(0, 2).map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
            <small>{layer.disclaimer}</small>
            {layer.id === 'clinical_decision_support' && nativeAiSnapshot ? (
              <div className="copilot-risk-layer-panel__cds-detail" aria-label="Validated specialist model signals">
                <strong>Key predictors</strong>
                <ul>
                  {routingSignals.slice(0, 4).map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
                {specialistInferences.slice(0, 2).map((inference) => (
                  <p key={inference.domainId}>
                    {inference.specialistLabel}: {inference.prediction} ·{' '}
                    {Math.round(inference.confidence * 100)}% · {inference.sourceState}
                  </p>
                ))}
                <p>
                  Routed to {formatRoutingLabel(nativeAiSnapshot.routing)} ·{' '}
                  {Math.round(nativeAiSnapshot.routing.confidence * 100)}% confidence ·{' '}
                  {nativeAiSnapshot.sourceState}
                </p>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}