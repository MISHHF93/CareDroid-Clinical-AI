import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import type { AiChiefExplainableRecommendation } from '../../config/aiChiefOrchestrationModel';

import useAiChiefOrchestrator from '../../hooks/useAiChiefOrchestrator';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import {
  confirmCareDroidAction,
  showActionSuccess,
} from '../../services/careDroidInteractionFeedback';
import { ClinicalSafetyNotice } from './ClinicalSafetyNotice';
import { AiTruthLabel, fromAiChiefRecommendation } from './AiTruthLabel';
import './AIComponents.css';
import '../../pages/emergency/emergency-route.css';

const TONE_LABELS: Record<AiChiefExplainableRecommendation['tone'], string> = {
  critical: 'Critical',
  warning: 'High',
  info: 'Moderate',
  neutral: 'Advisory',
};

const RECOMMENDATION_LIMIT = 8;

function recommendationRequiresEscalation(recommendation: AiChiefExplainableRecommendation): boolean {
  return Boolean(recommendation.patientId) && /escalat|assign physician|reassess/i.test(recommendation.action);
}

type AiChiefRouteRecommendationsPanelProps = Readonly<{
  limit?: number;
}>;

export function AiChiefRouteRecommendationsPanel({
  limit = RECOMMENDATION_LIMIT,
}: AiChiefRouteRecommendationsPanelProps) {
  const { snapshot, refreshError } = useAiChiefOrchestrator({ realtime: true });
  const { profileNavigate } = useProfileNavigate();
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const escalatePatient = useEmergencyStore((state) => state.escalatePatient);
  // HEAL-347.88: PatientDetailPanel.tsx already gates its own Escalate
  // button via emergencyRole.presentAction(EMERGENCY_ACTIONS.escalatePatient)
  // -- this AI-recommendation panel calls the exact same store action
  // (escalatePatient) with no permission check at all, reachable from the
  // Copilot route (gated only by USE_AI_CHAT, a much broader permission
  // than clinical escalation authority).
  const emergencyRole = useEmergencyRolePermissions();
  const canEscalate = emergencyRole.presentAction(EMERGENCY_ACTIONS.escalatePatient).enabled;

  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [accepted, setAccepted] = useState<Set<string>>(() => new Set());

  const patientLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const patient of patients) {
      const name = [patient.lastName || patient.name || 'Patient', patient.firstName]
        .filter(Boolean)
        .join(', ');
      labels.set(patient.id, name);
    }
    return labels;
  }, [patients]);

  const allRecommendations = useMemo(
    () => snapshot.recommendations.slice(0, limit),
    [limit, snapshot.recommendations],
  );

  const visibleRecommendations = allRecommendations.filter(
    (recommendation) => !dismissed.has(recommendation.id),
  );

  const criticalVisibleCount = visibleRecommendations.filter(
    (recommendation) => recommendation.tone === 'critical',
  ).length;

  const handleAccept = useCallback(
    async (recommendation: AiChiefExplainableRecommendation) => {
      const shouldEscalate = recommendationRequiresEscalation(recommendation);

      if (shouldEscalate && !canEscalate) return;

      if (shouldEscalate && recommendation.patientId) {
        const confirmed = await confirmCareDroidAction({
          title: 'Accept AI Chief recommendation?',
          message: `${recommendation.action} — ${recommendation.rationale}`,
          confirmLabel: recommendation.action,
          tone: recommendation.tone === 'critical' ? 'danger' : 'default',
        });
        if (!confirmed) return;

        escalatePatient(recommendation.patientId, {
          staffId: 'charge-nurse-current',
          staffName: 'Charge Nurse',
        });
        showActionSuccess('Escalation recorded', recommendation.action);
      } else {
        showActionSuccess('Recommendation acknowledged', recommendation.action);
      }

      if (recommendation.patientId) {
        selectPatient(recommendation.patientId);
      }
      if (recommendation.route) {
        profileNavigate(recommendation.route);
      }

      setAccepted((previous) => new Set([...previous, recommendation.id]));
    },
    [canEscalate, escalatePatient, profileNavigate, selectPatient],
  );

  if (allRecommendations.length === 0) {
    return refreshError ? (
      <div className="emergency-route-card emergency-route-muted" role="alert">
        AI Chief recommendations unavailable — last refresh failed ({refreshError}). Not a
        confirmation that department signals are stable.
      </div>
    ) : (
      <div className="emergency-route-card emergency-route-muted" role="status">
        No high-priority AI Chief recommendations at this time. Department signals appear stable.
      </div>
    );
  }

  return (
    <section className="cd-ai-panel" aria-label="AI Chief route recommendations">
      <header className="cd-ai-panel__header">
        <div className="cd-ai-card__title">
          <BrainCircuit aria-hidden="true" size={18} />
          <div>
            <p>AI Chief</p>
            <h2>Recommendations</h2>
            <span>
              {visibleRecommendations.length} active · {criticalVisibleCount} critical · clinician review
              required
            </span>
          </div>
        </div>
        <strong aria-label={`${visibleRecommendations.length} active recommendations`}>
          {visibleRecommendations.length}
        </strong>
      </header>

      <div className="cd-ai-panel__list u-grid-gap-8" >
        {visibleRecommendations.map((recommendation) => {
          const isAccepted = accepted.has(recommendation.id);
          const patientLabel = recommendation.patientId
            ? patientLabelById.get(recommendation.patientId)
            : null;

          return (
            <article
              key={recommendation.id}
              className={`emergency-route-card emergency-route-recommendation cd-ai-card cd-ai-card--compact ${
                isAccepted ? 'cd-ai-card--accepted' : ''
              }`}
              data-tone={recommendation.tone}
              aria-label={`${TONE_LABELS[recommendation.tone]}: ${recommendation.action}`}
            >
              <header className="cd-ai-card__header">
                <div className="cd-ai-card__title">
                  <div>
                    <p>{recommendation.domain.replace(/_/g, ' ')}</p>
                    <h3>{recommendation.action}</h3>
                  </div>
                </div>
                <span className="cd-ai-confidence" data-tone={recommendation.tone}>
                  {TONE_LABELS[recommendation.tone]}
                </span>
              </header>

              <AiTruthLabel {...fromAiChiefRecommendation(recommendation)} compact />

              <p className="cd-ai-card__primary">{recommendation.rationale}</p>

              {patientLabel ? (
                <p className="emergency-route-muted u-m-0 u-p-0" >
                  Patient:{' '}
                  <button
                    type="button"
                    className="emergency-route-muted cd-ai-panel__patient-link-btn"
                    onClick={() => recommendation.patientId && selectPatient(recommendation.patientId)}
                  >
                    {patientLabel}
                  </button>
                </p>
              ) : null}

              {recommendation.route ? (
                <p className="emergency-route-muted u-m-0 u-p-0" >
                  <Link to={recommendation.route}>Open related workflow</Link>
                </p>
              ) : null}

              <ClinicalSafetyNotice reviewRequired />

              {!isAccepted ? (
                <div className="cd-ai-actions" aria-label={`${recommendation.action} review actions`}>
                  <button
                    type="button"
                    className="cd-ai-actions__button"
                    disabled={recommendationRequiresEscalation(recommendation) && !canEscalate}
                    onClick={() => void handleAccept(recommendation)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="cd-ai-actions__button"
                    onClick={() =>
                      setDismissed((previous) => new Set([...previous, recommendation.id]))
                    }
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <p className="cd-ai-panel__state" role="status">
                  Accepted — clinician review still required.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {dismissed.size > 0 ? (
        <button
          type="button"
          className="cd-ai-actions__button cd-ai-actions__button--dismissed-toggle"
          onClick={() => setDismissed(new Set())}
        >
          Show {dismissed.size} dismissed
        </button>
      ) : null}
    </section>
  );
}

export default AiChiefRouteRecommendationsPanel;