import type { Alert } from '../types/emergency';
import { classifyOperationalAlert } from '../engine/alertClassificationModel';

/** Where an alarm may appear — never fullscreen. */
export const ALARM_SURFACE = Object.freeze({
  none: 'none',
  sidebarPulse: 'sidebar-pulse',
  shellDock: 'shell-dock',
  panelDrawer: 'panel-drawer',
} as const);

export type AlarmSurface = (typeof ALARM_SURFACE)[keyof typeof ALARM_SURFACE];

export type AlarmSurfacePlan = Readonly<{
  surfaces: readonly AlarmSurface[];
  autoOpenPanel: boolean;
  useFullscreenOverlay: boolean;
}>;

const NO_FULLSCREEN: AlarmSurfacePlan = Object.freeze({
  surfaces: [],
  autoOpenPanel: false,
  useFullscreenOverlay: false,
});

/** Canonical surface routing for operational alarms (all profiles). */
export function resolveAlarmSurfacePlan(
  alert: Alert,
  tier = classifyOperationalAlert(alert),
): AlarmSurfacePlan {
  if (alert.dismissed || alert.acknowledged) {
    return NO_FULLSCREEN;
  }

  switch (tier) {
    case 'critical':
      return Object.freeze({
        surfaces: [ALARM_SURFACE.sidebarPulse, ALARM_SURFACE.shellDock],
        autoOpenPanel: false,
        useFullscreenOverlay: false,
      });
    case 'high':
      return Object.freeze({
        surfaces: [ALARM_SURFACE.sidebarPulse, ALARM_SURFACE.shellDock],
        autoOpenPanel: false,
        useFullscreenOverlay: false,
      });
    case 'medium':
      return Object.freeze({
        surfaces: [ALARM_SURFACE.panelDrawer],
        autoOpenPanel: false,
        useFullscreenOverlay: false,
      });
    default:
      return Object.freeze({
        surfaces: [ALARM_SURFACE.panelDrawer],
        autoOpenPanel: false,
        useFullscreenOverlay: false,
      });
  }
}

/** Operational alerts never use Sonner; user feedback toasts are separate. */
export function shouldShowOperationalToast(_alert: Alert): boolean {
  return false;
}

export const USER_FEEDBACK_TOAST_DEFAULTS = Object.freeze({
  duration: 2800,
  closeButton: true,
});

export function pulseNotificationCenter(alert?: Alert): void {
  document.dispatchEvent(
    new CustomEvent('notification-center-pulse', {
      detail: alert
        ? {
            alertId: alert.id,
            tier: classifyOperationalAlert(alert),
            plan: resolveAlarmSurfacePlan(alert),
          }
        : undefined,
    }),
  );
}

export function raiseOperationalAlarm(alert: Alert): void {
  const plan = resolveAlarmSurfacePlan(alert);
  if (plan.surfaces.includes(ALARM_SURFACE.sidebarPulse)) {
    pulseNotificationCenter(alert);
  }
}
