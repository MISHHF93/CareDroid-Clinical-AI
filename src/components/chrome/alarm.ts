/**
 * Platform alarming system — public exports.
 *
 * Visual: `src/styles/alarm-system.css` (global)
 * Model:  `src/config/alarmVisualModel.ts`
 *
 * Use:
 *   <AlarmKpiChip label="Breached" value={2} tone="critical" />
 *   <AlarmDot tone="warning" />
 *   className={alarmRowClassNames(row.severity)}
 *   className={alarmSurfaceClassNames(card.tone)}
 */

export {
  alarmDataAttrs,
  alarmDotClassNames,
  alarmKpiClassNames,
  alarmRowClassNames,
  alarmSeverityAriaLabel,
  alarmSeverityBadge,
  alarmSurfaceClassNames,
  compareAlarmSeverity,
  isAlarmingSeverity,
  resolveAlarmSeverity,
  type AlarmSeverity,
  type AlarmToneInput,
} from '../../config/alarmVisualModel';

export { default as AlarmKpiChip } from './AlarmKpiChip';
export { default as AlarmDot } from './AlarmDot';
export { default as ChromeStatusChips } from './ChromeStatusChips';
