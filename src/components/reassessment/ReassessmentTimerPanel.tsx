import { formatTimerLabel } from '../../engine/reassessmentTimerEngine';
import './ReassessmentTimerPanel.css';

function TimerCell({ label, value, tone = 'neutral', title = undefined }) {
  return (
    <div
      className="reassessment-timer-panel__cell"
      data-tone={tone}
      title={title || `${label}: ${value}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function ReassessmentTimerPanel({
  timer,
  compact = false,
  onOpenReassessment,
  readOnly = false,
}) {
  if (!timer) return null;

  return (
    <section
      className={['reassessment-timer-panel', compact ? 'reassessment-timer-panel--compact' : '']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={`reassessment-timer-${timer.patientId}`}
    >
      <header className="reassessment-timer-panel__header">
        <div>
          <p className="reassessment-timer-panel__eyebrow">Reassessment timers</p>
          <h3 id={`reassessment-timer-${timer.patientId}`}>{timer.displayName}</h3>
        </div>
        <div className="reassessment-timer-panel__status" data-tone={timer.tone}>
          <strong>{timer.dueInLabel}</strong>
          <span>{timer.priority}</span>
        </div>
      </header>

      <div className="reassessment-timer-panel__grid">
        <TimerCell label="Arrival" value={timer.arrivalAgeLabel} />
        <TimerCell label="Triage" value={timer.triageAgeLabel} />
        <TimerCell label="Last nurse contact" value={timer.lastNurseContactAgeLabel} />
        <TimerCell
          label="Last vitals"
          value={timer.lastVitalsAgeLabel}
          tone={timer.lastVitalsAgeMinutes >= 30 ? 'warning' : 'neutral'}
        />
        <TimerCell
          label="Last reassessment"
          value={timer.lastReassessmentAgeLabel}
          tone={timer.isOverdue ? 'critical' : 'neutral'}
        />
        <TimerCell
          label="Due"
          value={timer.dueInLabel}
          tone={timer.isOverdue ? 'critical' : timer.stage === 'due' ? 'warning' : 'neutral'}
        />
      </div>

      {!compact && (timer.reassessmentDueTime || timer.overdueTime) ? (
        <dl className="reassessment-timer-panel__meta">
          {timer.reassessmentDueTime ? (
            <>
              <dt>Reassessment due</dt>
              <dd>{new Date(timer.reassessmentDueTime).toLocaleString()}</dd>
            </>
          ) : null}
          {timer.overdueTime ? (
            <>
              <dt>Overdue since</dt>
              <dd>{new Date(timer.overdueTime).toLocaleString()}</dd>
            </>
          ) : null}
          <dt>Interval</dt>
          <dd>{formatTimerLabel(timer.intervalMinutes)}</dd>
        </dl>
      ) : null}

      {timer.isOverdue && onOpenReassessment ? (
        <button
          type="button"
          className="reassessment-timer-panel__action"
          onClick={() => onOpenReassessment(timer.patientId)}
          disabled={readOnly}
        >
          Open reassessment
        </button>
      ) : null}
    </section>
  );
}
