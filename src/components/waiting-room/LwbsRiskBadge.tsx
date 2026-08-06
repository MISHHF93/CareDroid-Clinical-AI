import { resolveLwbsRisk, shouldSurfaceLwbsRisk } from '../../services/lwbsRiskLayer';
import './LwbsRiskBadge.css';

export default function LwbsRiskBadge({
  patient,
  waitingPatientCount,
  congestionThreshold = undefined,
  now = undefined,
  compact = false,
  showScore = false,
}) {
  if (!patient?.id) return null;

  const snapshot = resolveLwbsRisk(patient, {
    waitingPatientCount,
    congestionThreshold,
    now,
  }) as any;
  if (!shouldSurfaceLwbsRisk(snapshot)) return null;

  return (
    <span
      className={[
        'lwbs-risk-badge',
        `lwbs-risk-badge--${snapshot.tone}`,
        compact ? 'lwbs-risk-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[
        snapshot.label,
        'Advisory only — staff review required',
        snapshot.staffDetail,
        showScore ? `Score ${snapshot.score}/100` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {compact ? `LWBS ${snapshot.shortLabel}` : `${snapshot.label} (advisory)`}
      {showScore ? ` · ${snapshot.score}` : null}
    </span>
  );
}
