import type { ReceptionNextBestAction } from '../../config/receptionSkillModel';
import './ReceptionSkillStrip.css';

export type ReceptionSkillStripProps = {
  action: ReceptionNextBestAction;
  onPrimary?: (cta: NonNullable<ReceptionNextBestAction['primaryCta']>) => void;
};

/** CTA labels — must match executable handlers in ReceptionWorkspace.handleSkillCta. */
export const RECEPTION_SKILL_CTA_LABELS: Record<
  NonNullable<ReceptionNextBestAction['primaryCta']>,
  string
> = {
  lookup: 'Go to search',
  route: 'Create & route',
  crash: 'Send to nurse now',
  resolve_duplicate: 'Review matches',
  ems: 'Open ambulance list',
  resume_draft: 'Resume draft',
  clear_shift: 'Open shift clearance',
};

/**
 * Plain-language next-best-action for registration clerks — not a chatbot.
 * Every visible CTA is executable via onPrimary (no decorative buttons).
 */
export default function ReceptionSkillStrip({ action, onPrimary }: ReceptionSkillStripProps) {
  const ctaLabel =
    action.primaryCta && RECEPTION_SKILL_CTA_LABELS[action.primaryCta]
      ? RECEPTION_SKILL_CTA_LABELS[action.primaryCta]
      : null;

  return (
    <div
      className={`reception-skill-strip reception-skill-strip--${action.tone}`}
      role="status"
      aria-live="polite"
      data-testid="reception-skill-strip"
      data-skill-id={action.skillId}
      data-cta={action.primaryCta || ''}
    >
      <div className="reception-skill-strip__body">
        <p className="reception-skill-strip__eyebrow">What to do next</p>
        <p className="reception-skill-strip__title">{action.title}</p>
        <p className="reception-skill-strip__detail">{action.detail}</p>
      </div>
      {ctaLabel && action.primaryCta && onPrimary ? (
        <button
          type="button"
          className="reception-skill-strip__cta"
          data-testid="reception-skill-strip-cta"
          data-cta={action.primaryCta}
          onClick={() => onPrimary(action.primaryCta!)}
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
