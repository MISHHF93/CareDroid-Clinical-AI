import { useMemo } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import type { AlertSeverity } from '../../types/emergency';

export function useAlertsCenter() {
  const alerts = useEmergencyStore((s) => s.alerts);
  const dismissAlert = useEmergencyStore((s) => s.dismissAlert);
  const acknowledgeAlert = useEmergencyStore((s) => s.acknowledgeAlert);

  const sorted = useMemo(() => {
    const active = alerts.filter((a) => !a.dismissed);
    return [...active].sort((a, b) => {
      const sev = { Critical: 0, Warning: 1, Info: 2 };
      const sd = (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
      if (sd !== 0) return sd;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts]);

  const unread = useMemo(() => sorted.filter((a) => !a.read).length, [sorted]);

  const maxSeverity: AlertSeverity = useMemo(
    () =>
      sorted.some((a) => a.severity === 'Critical')
        ? 'Critical'
        : sorted.some((a) => a.severity === 'Warning')
          ? 'Warning'
          : 'Info',
    [sorted],
  );

  return { alerts: sorted, unread, maxSeverity, dismissAlert, acknowledgeAlert };
}
