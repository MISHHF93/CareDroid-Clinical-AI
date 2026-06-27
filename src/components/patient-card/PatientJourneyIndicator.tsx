import { PatientState, Priority } from '../../types/emergency';
import './PatientJourneyIndicator.css';

/**
 * Ordered patient workflow stages.
 * Maps to PatientState enum values where possible.
 */
const JOURNEY_STAGES: { state: PatientState; label: string }[] = [
  { state: PatientState.Registration, label: 'Registration' },
  { state: PatientState.Waiting,      label: 'Waiting' },
  { state: PatientState.Triage,       label: 'Triage' },
  { state: PatientState.Assessment,   label: 'Doctor Review' },
  { state: PatientState.Orders,       label: 'Labs / Imaging' },
  { state: PatientState.Disposition,  label: 'Treatment' },
  { state: PatientState.Discharge,    label: 'Discharge' },
];

/** Index into JOURNEY_STAGES for each PatientState, or -1 if not in the journey */
const STATE_INDEX: Partial<Record<PatientState, number>> = Object.fromEntries(
  JOURNEY_STAGES.map((s, i) => [s.state, i]),
);

export type JourneyVariant = 'default' | 'compact' | 'mini';

interface PatientJourneyIndicatorProps {
  /** Current patient state */
  currentState: PatientState | string;
  /** Used to style the active stage with critical tone for P1/P2 patients */
  priority?: Priority | string;
  /** Layout variant */
  variant?: JourneyVariant;
  className?: string;
}

/**
 * Displays the patient's position within the ED care workflow as a
 * horizontal stage indicator (Registration → Waiting → … → Discharge).
 */
export function PatientJourneyIndicator({
  currentState,
  priority,
  variant = 'default',
  className,
}: PatientJourneyIndicatorProps) {
  const activeIndex = STATE_INDEX[currentState as PatientState] ?? -1;

  const isCriticalPriority =
    priority === Priority.P1 ||
    priority === Priority.P2 ||
    priority === 'P1' ||
    priority === 'P2';

  const isDischarged = currentState === PatientState.Discharge;

  return (
    <div
      className={[
        'patient-journey',
        variant !== 'default' ? `patient-journey--${variant}` : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label={`Patient workflow: currently at ${JOURNEY_STAGES[activeIndex]?.label ?? currentState}`}
    >
      {JOURNEY_STAGES.map((stage, i) => {
        const isDone = isDischarged
          ? true
          : i < activeIndex;
        const isActive = !isDischarged && i === activeIndex;
        const isLast = i === JOURNEY_STAGES.length - 1;

        let stageClass = 'patient-journey__stage--upcoming';
        if (isDischarged && isLast) stageClass = 'patient-journey__stage--discharge-done';
        else if (isDone && !isActive) stageClass = 'patient-journey__stage--done';
        else if (isActive && isCriticalPriority) stageClass = 'patient-journey__stage--active-critical';
        else if (isActive) stageClass = 'patient-journey__stage--active';

        return (
          <span
            key={stage.state}
            className={`patient-journey__stage ${stageClass}`}
            role="listitem"
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="patient-journey__stage-btn" title={stage.label}>
              {variant !== 'mini' && (
                <span className="patient-journey__dot" aria-hidden="true" />
              )}
              {variant !== 'mini' && stage.label}
            </span>
            {!isLast && (
              <span
                className={['patient-journey__connector', isDone ? 'patient-journey__connector--done' : ''].filter(Boolean).join(' ')}
                aria-hidden="true"
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

export default PatientJourneyIndicator;
