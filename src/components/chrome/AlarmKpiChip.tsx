import {
  alarmKpiClassNames,
  alarmSeverityAriaLabel,
  isAlarmingSeverity,
  resolveAlarmSeverity,
  type AlarmToneInput,
} from '../../config/alarmVisualModel';

export type AlarmKpiChipProps = {
  id?: string;
  label: string;
  value: string | number;
  tone?: AlarmToneInput;
  hint?: string;
  /** Force pulse animation (critical always pulses when alarming) */
  pulse?: boolean;
  size?: 'sm' | 'md';
  as?: 'li' | 'div' | 'button';
  onClick?: () => void;
  className?: string;
};

/**
 * Platform KPI chip with severity-driven visual alarm.
 * Use for chrome status, strips, and any alarming metric surface.
 */
export default function AlarmKpiChip({
  id,
  label,
  value,
  tone = 'neutral',
  hint,
  pulse = false,
  size = 'md',
  as = 'li',
  onClick,
  className = '',
}: AlarmKpiChipProps) {
  const severity = resolveAlarmSeverity(tone);
  const alarming = isAlarmingSeverity(severity);
  const badge =
    severity === 'critical' ? 'CRIT' : severity === 'warning' ? 'WARN' : null;
  const severityPhrase = alarmSeverityAriaLabel(severity);
  const ariaLabel = [label, String(value), severityPhrase].filter(Boolean).join(', ');

  const classes = [alarmKpiClassNames(tone, { pulse: pulse || severity === 'critical', size }), className]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      <strong className="alarm-kpi__value">{value}</strong>
      <span className="alarm-kpi__label">
        {label}
        {badge ? <span className="alarm-kpi__badge">{badge}</span> : null}
      </span>
    </>
  );

  const shared = {
    className: classes,
    'data-alarm': severity,
    'data-metric-id': id,
    'data-tone': tone || 'neutral',
    title: hint ? `${label}: ${hint}` : ariaLabel,
    'aria-label': ariaLabel,
    ...(alarming ? { 'aria-live': 'polite' as const } : {}),
  };

  if (as === 'button') {
    return (
      <button type="button" {...shared} onClick={onClick}>
        {body}
      </button>
    );
  }

  if (as === 'div') {
    return <div {...shared}>{body}</div>;
  }

  return <li {...shared}>{body}</li>;
}
