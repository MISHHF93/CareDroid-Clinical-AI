import { useCallback, useState } from 'react';
import type { Patient } from '../../types/emergency';
import {
  fetchInvestigationRun,
  runDeteriorationInvestigation,
  type InvestigationFindingState,
  type InvestigationRunResult,
} from '../../services/chiefInvestigationApi';
import { AiTruthLabel } from '../ai/AiTruthLabel';
import './ChiefInvestigationPanel.css';

type ChiefInvestigationPanelProps = {
  patient: Patient;
  defaultExpanded?: boolean;
};

const FINDING_STATE_LABELS: Record<InvestigationFindingState, string> = {
  SUPPORTED: 'Supported',
  PARTIALLY_SUPPORTED: 'Partially supported',
  INSUFFICIENT_DATA: 'Insufficient data',
  STALE_DATA: 'Stale data',
  TOOL_FAILURE: 'Tool failure',
  OUTSIDE_SCOPE: 'Outside scope',
  REQUIRES_HUMAN_REVIEW: 'Requires human review',
};

const FINDING_STATE_TONE: Record<InvestigationFindingState, 'success' | 'warning' | 'critical' | 'info'> = {
  SUPPORTED: 'success',
  PARTIALLY_SUPPORTED: 'warning',
  INSUFFICIENT_DATA: 'info',
  STALE_DATA: 'warning',
  TOOL_FAILURE: 'critical',
  OUTSIDE_SCOPE: 'info',
  REQUIRES_HUMAN_REVIEW: 'warning',
};

const STEP_STATUS_TONE: Record<string, 'success' | 'warning' | 'critical' | 'info'> = {
  completed: 'success',
  warning: 'warning',
  failed: 'critical',
  skipped: 'info',
};

function FindingStateChip({ state }: { state: InvestigationFindingState }) {
  return (
    <span
      className="chief-investigation-panel__chip"
      data-tone={FINDING_STATE_TONE[state]}
    >
      {FINDING_STATE_LABELS[state]}
    </span>
  );
}

export default function ChiefInvestigationPanel({
  patient,
  defaultExpanded = false,
}: ChiefInvestigationPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(false);
  const [run, setRun] = useState<InvestigationRunResult | null>(null);
  const [error, setError] = useState('');

  const startInvestigation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await runDeteriorationInvestigation(patient.id);
      setRun(result);
    } catch (err: any) {
      setRun(null);
      setError(
        err?.status === 403
          ? 'Not authorized to run Chief Investigation for this role.'
          : 'Chief Investigation is unavailable — use the patient chart and vitals directly.',
      );
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  const refreshRun = useCallback(async () => {
    if (!run?.runId) return;
    try {
      const result = await fetchInvestigationRun(run.runId);
      setRun(result);
    } catch {
      // Keep the last known result; a refresh failure isn't worth surfacing an error for.
    }
  }, [run?.runId]);

  return (
    <section
      className="chief-investigation-panel"
      aria-label="Chief Investigation — deterioration investigation"
    >
      <header className="chief-investigation-panel__header">
        <div className="chief-investigation-panel__title-block">
          <h3 className="chief-investigation-panel__title">
            Chief Investigation · {patient.firstName} {patient.lastName}
          </h3>
          <span className="chief-investigation-panel__safety-badge">
            Observe + prepare only — no autonomous clinical action
          </span>
        </div>
        <button
          type="button"
          className="chief-investigation-panel__toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </header>

      {expanded ? (
        <div className="chief-investigation-panel__body">
          {!run ? (
            <div className="chief-investigation-panel__intro">
              <p>
                Runs a bounded, deterministic plan: verify patient context, retrieve vitals,
                calculate NEWS2, assess trend, and synthesize findings with truthful states. Any
                suggested action is prepared as a proposal requiring human approval — nothing here
                changes patient state.
              </p>
              <button
                type="button"
                className="chief-investigation-panel__run-button"
                onClick={() => void startInvestigation()}
                disabled={loading}
              >
                {loading ? 'Investigating…' : 'Investigate deterioration'}
              </button>
              {error ? <p className="chief-investigation-panel__error" role="alert">{error}</p> : null}
            </div>
          ) : (
            <div className="chief-investigation-panel__result">
              <div className="chief-investigation-panel__result-head">
                <div className="chief-investigation-panel__result-meta">
                  <span>Plan {run.planVersion}</span>
                  <span>·</span>
                  <span>{run.autonomyLevelUsed === 'LEVEL_2_PREPARE' ? 'Observe + prepare' : 'Observe only'}</span>
                  <span>·</span>
                  <span>{new Date(run.createdAt).toLocaleTimeString()}</span>
                </div>
                <FindingStateChip state={run.overallState} />
              </div>

              <AiTruthLabel
                state="Manual"
                sourceContext="Deterministic Chief Investigation plan runner — no LLM planning in v1"
                reviewRequired
                compact
              />

              <ol className="chief-investigation-panel__steps">
                {run.steps.map((step) => (
                  <li key={step.stepId} data-tone={STEP_STATUS_TONE[step.status] || 'info'}>
                    <span className="chief-investigation-panel__step-label">{step.label}</span>
                    <span className="chief-investigation-panel__step-detail">{step.detail}</span>
                  </li>
                ))}
              </ol>

              <div className="chief-investigation-panel__findings">
                {run.findings.map((finding, index) => (
                  <article key={`${finding.state}-${index}`} className="chief-investigation-panel__finding">
                    <div className="chief-investigation-panel__finding-head">
                      <FindingStateChip state={finding.state} />
                    </div>
                    <p>{finding.summary}</p>
                    {finding.evidence.length ? (
                      <ul className="chief-investigation-panel__evidence">
                        {finding.evidence.map((item, evidenceIndex) => (
                          <li key={evidenceIndex}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>

              {run.preparedActions.length ? (
                <div className="chief-investigation-panel__prepared-actions">
                  <h4>Prepared actions — require clinician approval</h4>
                  {run.preparedActions.map((action, index) => (
                    <article key={index} className="chief-investigation-panel__prepared-action">
                      <strong>{action.description}</strong>
                      <p>{action.rationale}</p>
                      <span className="chief-investigation-panel__proposal-note">
                        {action.proposalId
                          ? `Proposal ${action.proposalId.slice(0, 8)} created — pending clinician review.`
                          : 'Proposal creation failed — no approval request is pending for this action.'}
                      </span>
                    </article>
                  ))}
                </div>
              ) : null}

              <p className="chief-investigation-panel__disclaimer">{run.disclaimer}</p>

              <div className="chief-investigation-panel__actions">
                <button
                  type="button"
                  className="chief-investigation-panel__rerun-button"
                  onClick={() => void startInvestigation()}
                  disabled={loading}
                >
                  {loading ? 'Investigating…' : 'Run again'}
                </button>
                <button
                  type="button"
                  className="chief-investigation-panel__refresh-button"
                  onClick={() => void refreshRun()}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>
              {error ? <p className="chief-investigation-panel__error" role="alert">{error}</p> : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
