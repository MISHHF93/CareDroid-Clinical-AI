import {
  alarmDotClassNames,
  alarmSeverityAriaLabel,
  resolveAlarmSeverity,
  type AlarmToneInput,
} from '../../config/alarmVisualModel';

type AlarmDotProps = {
  tone?: AlarmToneInput;
  className?: string;
  title?: string;
};

/** Inline severity marker for lists, tables, and badges. */
export default function AlarmDot({ tone = 'neutral', className = '', title }: AlarmDotProps) {
  const severity = resolveAlarmSeverity(tone);
  const label = alarmSeverityAriaLabel(severity) || 'Status';
  return (
    <span
      className={[alarmDotClassNames(tone), className].filter(Boolean).join(' ')}
      data-alarm={severity}
      role="img"
      aria-label={label}
      title={title || label}
    />
  );
}
