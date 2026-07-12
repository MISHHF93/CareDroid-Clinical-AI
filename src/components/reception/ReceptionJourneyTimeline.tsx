import { ArrowRight } from 'lucide-react';
import './ReceptionJourneyTimeline.css';

export type ReceptionJourneyStageTone = 'neutral' | 'attention' | 'critical';

export type ReceptionJourneyStage = {
  id: string;
  label: string;
  count: number;
  avgWaitMinutes: number | null;
  queueTab: string | null;
  tone: ReceptionJourneyStageTone;
  badge?: string | null;
};

export type ReceptionJourneyTimelineProps = {
  stages: ReceptionJourneyStage[];
  activeQueueTab?: string | null;
  onSelectStage?: (queueTab: string) => void;
  className?: string;
};

/**
 * Live front-door journey: replaces the flat arrival-count button bar with a
 * stage-by-stage view (count + average wait) that drills into the matching
 * waiting list. Read-only stages (no queueTab) render as static steps.
 */
export default function ReceptionJourneyTimeline({
  stages,
  activeQueueTab = null,
  onSelectStage,
  className = '',
}: ReceptionJourneyTimelineProps) {
  return (
    <ol
      className={['reception-journey-timeline', className].filter(Boolean).join(' ')}
      aria-label="Reception patient flow"
    >
      {stages.map((stage, index) => {
        const clickable = Boolean(stage.queueTab && onSelectStage);
        const isActive = Boolean(stage.queueTab) && stage.queueTab === activeQueueTab;
        const Element = clickable ? 'button' : 'div';

        return (
          <li key={stage.id} className="reception-journey-timeline__step">
            <Element
              type={clickable ? 'button' : undefined}
              className={[
                'reception-journey-timeline__stage',
                `reception-journey-timeline__stage--${stage.tone}`,
                isActive ? 'reception-journey-timeline__stage--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              {...(isActive ? { 'aria-current': 'step' as const } : {})}
              onClick={clickable ? () => onSelectStage?.(stage.queueTab as string) : undefined}
            >
              <span className="reception-journey-timeline__label">{stage.label}</span>
              <span className="reception-journey-timeline__count">{stage.count}</span>
              <span className="reception-journey-timeline__meta">
                {stage.avgWaitMinutes != null ? `Avg wait ${stage.avgWaitMinutes}m` : 'Not yet waiting'}
                {stage.badge ? <strong className="reception-journey-timeline__badge">{stage.badge}</strong> : null}
              </span>
            </Element>
            {index < stages.length - 1 ? (
              <ArrowRight
                className="reception-journey-timeline__connector"
                size={16}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
