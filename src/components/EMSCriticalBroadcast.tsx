import OperationalAlarmDock from './chrome/OperationalAlarmDock';

/** @deprecated Use OperationalAlarmDock — kept for route/tests compatibility. */
export default function EMSCriticalBroadcast() {
  return <OperationalAlarmDock showEmsInbound />;
}

export function EMSCriticalCountdownBadge() {
  return null;
}