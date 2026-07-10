import type { ReactNode } from 'react';
import { SituationGraphicCard } from '../graphics/CdlGraphicKit';
import type { PublicWaitingDisplaySnapshot } from './publicWaitingDisplayModel';

export type PublicDisplaySituationBriefProps = {
  snapshot: PublicWaitingDisplaySnapshot;
  className?: string;
};

function nextCareStep(snapshot: PublicWaitingDisplaySnapshot): ReactNode {
  const firstEducationStep = snapshot.processEducation?.steps?.[0]?.label;
  if (firstEducationStep) {
    return `${firstEducationStep} → triage → clinician review`;
  }
  const firstStage = snapshot.careStages?.[0]?.label;
  if (firstStage) return `${firstStage} — registration through discharge`;
  return 'Registration → triage → clinician review';
}

/**
 * PHI-safe four-question strip for waiting-room / kiosk displays.
 */
export default function PublicDisplaySituationBrief({
  snapshot,
  className = '',
}: PublicDisplaySituationBriefProps) {
  const attention =
    snapshot.statusMessaging?.advisories?.[0]?.message ||
    snapshot.guidanceMessages?.[0] ||
    snapshot.escalationMessage ||
    'Tell staff immediately if symptoms worsen';

  return (
    <section
      className={[
        'public-display-situation-brief',
        'cdl-situation-brief',
        'cdl-zone',
        'cdl-zone--operational-summary',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Waiting room status summary"
    >
      <ol className="emergency-route-situation-brief__list emergency-route-situation-brief__list--graphic">
        <SituationGraphicCard id="status" label="Happening now" value={snapshot.summaryLine} />
        <SituationGraphicCard id="attention" label="Needs attention" value={attention} />
        <SituationGraphicCard
          id="owner"
          label="Who can help"
          value="Front desk and triage staff"
        />
        <SituationGraphicCard id="nextAction" label="What happens next" value={nextCareStep(snapshot)} />
      </ol>
    </section>
  );
}