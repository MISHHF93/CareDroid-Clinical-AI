import { BrainCircuit } from 'lucide-react';
import {
  CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  type CareDroidAIResponse,
} from '../../lib/ai/careDroidAI';
import { AIConfidenceBadge } from './AIConfidenceBadge';
import { AiMaturityBadge, inferAiMaturity } from './AiMaturityBadge';
import { AIReasoningList } from './AIReasoningList';
import { ClinicalSafetyNotice } from './ClinicalSafetyNotice';
import { MissingDataAlert } from './MissingDataAlert';
import { OverrideActionButtons } from './OverrideActionButtons';
import './AIComponents.css';

type AIRecommendationCardProps = {
  response: CareDroidAIResponse;
  title?: string;
  compact?: boolean;
  onAccept?: () => void;
  onModify?: () => void;
  onDismiss?: () => void;
  onEscalate?: () => void;
};

export function AIChiefRecommendationCard({
  response,
  title,
  compact = false,
  onAccept,
  onModify,
  onDismiss,
  onEscalate,
}: AIRecommendationCardProps) {
  const primary = getPrimaryRecommendation(response);
  const facts = getDisplayFacts(response.data);
  const missingData = getStringArray(response.data.missingFields ?? response.data.missingInformation);
  const responseRedFlags = Array.isArray(response.redFlags) ? response.redFlags : [];
  const redFlags = responseRedFlags.length ? responseRedFlags : getStringArray(response.data.redFlags);
  const visibleWarnings = response.warnings.filter(
    (warning) => warning !== CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  );
  const heading = title || formatIntent(response.intent);
  const provenance = response.provenance;
  const maturity = inferAiMaturity({
    modelOrEngine: provenance?.modelOrEngine,
    responseClass: provenance?.responseClass,
    evidenceKinds: provenance?.evidence?.map((e) => e.kind),
  });
  const provenanceMissing =
    provenance?.missingInformation?.length
      ? provenance.missingInformation
      : missingData;

  return (
    <article
      className={`cd-ai-card ${compact ? 'cd-ai-card--compact' : ''}`}
      aria-label={`${heading}: ${primary}`}
    >
      <header className="cd-ai-card__header">
        <div className="cd-ai-card__title">
          <BrainCircuit aria-hidden="true" size={18} />
          <div>
            <p>AI decision support</p>
            <h3>{heading}</h3>
          </div>
        </div>
        <div className="cd-ai-card__meta-row">
          <AiMaturityBadge kind={maturity} />
          <AIConfidenceBadge confidence={response.confidence} />
        </div>
      </header>

      <p className="cd-ai-card__primary">{primary}</p>

      {facts.length ? (
        <dl className="cd-ai-card__facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {redFlags.length ? (
        <div className="cd-ai-card__red-flags" role="status">
          <strong>Red flags</strong>
          <ul>
            {redFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <MissingDataAlert items={provenanceMissing} />

      {provenance ? (
        <div className="cd-ai-card__provenance" data-provenance-version={provenance.contractVersion}>
          <strong>Provenance</strong>
          {provenance.uncertainty ? <p className="cd-ai-card__provenance-line">{provenance.uncertainty}</p> : null}
          {provenance.recommendedReviewerRole ? (
            <p className="cd-ai-card__provenance-line">
              Reviewer: <span>{provenance.recommendedReviewerRole}</span>
            </p>
          ) : null}
          {provenance.limitations?.length ? (
            <ul>
              {provenance.limitations.slice(0, compact ? 2 : 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {provenance.evidence?.length ? (
            <p className="cd-ai-card__provenance-line">
              Evidence items: {provenance.evidence.length}
              {provenance.sourceVersions?.length
                ? ` · sources: ${provenance.sourceVersions.length}`
                : ''}
            </p>
          ) : (
            <p className="cd-ai-card__provenance-line">No retrieved evidence attached — treat as ungrounded draft.</p>
          )}
        </div>
      ) : null}

      {visibleWarnings.length ? (
        <div className="cd-ai-card__warnings" role="status">
          <strong>Warnings</strong>
          <ul>
            {visibleWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <AIReasoningList reasoning={response.reasoning} defaultOpen={!compact} />

      {response.nextActions.length ? (
        <div className="cd-ai-card__next">
          <strong>Next actions</strong>
          <ul>
            {response.nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ClinicalSafetyNotice reviewRequired={response.requiresClinicianReview} />

      <OverrideActionButtons
        label={heading}
        onAccept={onAccept}
        onModify={onModify}
        onDismiss={onDismiss}
        onEscalate={onEscalate}
      />
    </article>
  );
}

export const AIRecommendationCard = AIChiefRecommendationCard;

function getPrimaryRecommendation(response: CareDroidAIResponse): string {
  const data = response.data;
  const direct =
    readText(data.recommendation) ||
    readText(data.nextStep) ||
    readText(data.recommendedAction) ||
    readText(data.oneLineSummary) ||
    readText(data.routingReason) ||
    readText(data.expectedImpact);
  if (direct) return direct;

  const triageLevel = readText(data.recommendedTriageLevel);
  if (triageLevel) return `Recommended triage level: ${triageLevel}.`;

  const department = readText(data.recommendedDepartment);
  if (department) return `Recommended department: ${department}.`;

  const wait = readText(data.estimatedWaitTime);
  if (wait) return `Estimated wait time: ${wait}.`;

  const insights = getStringArray(data.topInsights);
  if (insights.length) return insights[0];

  if (response.status === 'error') return 'AI request could not be processed safely.';
  return 'Review AI output with the accountable clinician or operations lead.';
}

function getDisplayFacts(data: Record<string, unknown>): Array<[string, string]> {
  const candidates: Array<[string, unknown]> = [
    ['Triage level', data.recommendedTriageLevel],
    ['Department', data.recommendedDepartment],
    ['Alternate', data.alternateDepartment],
    ['Wait estimate', data.estimatedWaitTime],
    ['Bottleneck', data.bottleneck],
    ['Risk', data.operationalRisk ?? data.staffingRisk],
    ['Urgency', data.urgency],
    ['Severity', data.severity],
    ['Assigned role', data.owner],
  ];
  return candidates
    .map(([label, value]) => [label, readText(value)] as [string, string])
    .filter(([, value]) => Boolean(value))
    .slice(0, 4);
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => readText(item))
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function readText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function formatIntent(intent: CareDroidAIResponse['intent']): string {
  return String(intent)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
