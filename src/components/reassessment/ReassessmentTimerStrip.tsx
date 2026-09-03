import { formatTimerClockTime } from '../../engine/reassessmentTimerEngine';
import './ReassessmentTimerStrip.css';

function TimerPill({ label, value, tone = 'neutral', title = undefined as any }) {
  return (
    <span
      className="reassessment-timer-strip__pill"
      data-tone={tone}
      title={title || `${label}: ${value}`}
    >
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

/** Compact unified timer strip for whiteboard cards and safety board rows. */
export default function ReassessmentTimerStrip({ timer, showDueTimes = false, className = '' }) {
  if (!timer) return null;

  return (
    <div
      className={['reassessment-timer-strip', className].filter(Boolean).join(' ')}
      aria-label={`Reassessment timers for ${timer.displayName}`}
    >
      <TimerPill label="Arrival" value={timer.arrivalAgeLabel} />
      <TimerPill label="Triage" value={timer.triageAgeLabel} />
      <TimerPill label="Nurse" value={timer.lastNurseContactAgeLabel} />
      <TimerPill
        label="Vitals"
        value={timer.lastVitalsAgeLabel}
        tone={timer.lastVitalsAgeMinutes >= 30 ? 'warning' : 'neutral'}
      />
      <TimerPill
        label="Reassess"
        value={timer.lastReassessmentAgeLabel}
        tone={timer.isOverdue ? 'critical' : 'neutral'}
      />
      <TimerPill
        label="Due"
        value={timer.dueInLabel}
        tone={timer.isOverdue ? 'critical' : timer.stage === 'due' ? 'warning' : 'neutral'}
      />
      {showDueTimes && timer.reassessmentDueTime ? (
        <TimerPill
          label="Due at"
          value={formatTimerClockTime(timer.reassessmentDueTime)}
          title={new Date(timer.reassessmentDueTime).toLocaleString()}
        />
      ) : null}
      {showDueTimes && timer.overdueTime ? (
        <TimerPill
          label="Overdue"
          value={formatTimerClockTime(timer.overdueTime)}
          tone="critical"
          title={new Date(timer.overdueTime).toLocaleString()}
        />
      ) : null}
    </div>
  );
}
