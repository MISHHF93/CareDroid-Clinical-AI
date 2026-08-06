import { selectReassessmentTimerForPatient } from '../../engine/reassessmentTimerEngine';
import './ReassessmentTimerPanel.css';

export default function ReassessmentTimerBadge({ patient, thresholds = null }) {
  const timer = selectReassessmentTimerForPatient(patient, { thresholds: thresholds || undefined });
  if (!timer || timer.stage === 'none') return null;

  return (
    <span
      className="reassessment-timer-badge"
      data-tone={timer.tone}
      title={`Reassessment ${timer.dueInLabel}. Last vitals ${timer.lastVitalsAgeLabel} ago.`}
    >
      {timer.isOverdue ? 'Reassess overdue' : timer.dueInLabel}
    </span>
  );
}
