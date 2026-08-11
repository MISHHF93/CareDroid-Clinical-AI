import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, ChevronDown, ChevronUp, X } from 'lucide-react';
import { CRITICAL_CHECKLISTS } from '../../config/criticalChecklists';
import {
  EMERGENCY_ACTIONS,
  getReceptionEmbeddedIntakePath,
  prefersReceptionForPatientCreate,
} from '../../config/emergencyRolePermissions';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useUser } from '../../contexts/UserContext';
import { useNotificationShell } from '../../contexts/NotificationShellContext';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import { navigateProfileAware } from '../../navigation/profileRouteLaunch';
import { convertEmsArrivalForReception } from '../../services/receptionIntakeBridge';
import {
  countActionableAlerts,
  getAlertClassificationTier,
  isAlertActionable,
} from '../../engine/alertClassificationModel';
import { staffDisplayName } from '../../utils/staffManagement';
import type { Alert } from '../../types/emergency';
import './OperationalAlarmDock.css';

function activeCriticalArrivals(emsArrivals: ReturnType<typeof useEmergencyStore.getState>['emsArrivals']) {
  return emsArrivals
    .filter(
      (arrival) =>
        arrival.criticalChecklist &&
        !arrival.patientId &&
        !['Complete', 'Cancelled'].includes(arrival.status),
    )
    .sort(
      (a, b) =>
        new Date(a.estimatedArrivalTime).getTime() - new Date(b.estimatedArrivalTime).getTime(),
    );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function countdownLabel(arrival: { estimatedArrivalTime: string; eta?: number }, now: Date) {
  const target = new Date(arrival.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) {
    const minutes = arrival.eta || 0;
    return `${minutes}:00`;
  }
  const totalSeconds = Math.max(0, Math.ceil((target - now.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function roomName(
  rooms: ReturnType<typeof useEmergencyStore.getState>['rooms'],
  roomId?: string | null,
) {
  return rooms.find((room) => room.id === roomId)?.name || 'Bay pending';
}

function resolveCurrentStaff({
  user,
  staff,
  activeShift,
}: {
  user: ReturnType<typeof useUser>['user'];
  staff: ReturnType<typeof useEmergencyStore.getState>['staff'];
  activeShift: ReturnType<typeof useEmergencyStore.getState>['activeShift'];
}) {
  const userText = [user?.id, user?.email, user?.name, user?.fullName].filter(Boolean).join(' ').toLowerCase();
  const matchedStaff = staff.find((member) => {
    const memberText = [member.id, member.email, member.name, member.displayName, member.firstName, member.lastName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return userText && memberText && (userText.includes(memberText) || memberText.includes(userText));
  });
  const fallback =
    matchedStaff || staff.find((member) => member.id === activeShift.chargeStaffId) || staff[0];
  const staffId = fallback?.id || user?.id || 'staff-unknown';
  const staffName = fallback ? staffDisplayName(fallback) : user?.fullName || user?.name || staffId;
  return { staffId, staffName };
}

function physicianList(
  staff: ReturnType<typeof useEmergencyStore.getState>['staff'],
  activeShift: ReturnType<typeof useEmergencyStore.getState>['activeShift'],
) {
  const activeIds = new Set(activeShift.staffIds || []);
  const physicians = staff.filter(
    (member) =>
      (!activeIds.size || activeIds.has(member.id)) &&
      member.status === 'OnShift' &&
      ['Attending', 'Resident', 'Consultant'].includes(member.role),
  );
  return physicians.map(staffDisplayName).join(', ') || 'on-duty MD';
}

type OperationalAlarmDockProps = {
  showEmsInbound?: boolean;
};

function topDockAlert(alerts: Alert[]): Alert | null {
  return alerts.find((alert) => isAlertActionable(alert)) || null;
}

/**
 * Header-anchored alarm notification control.
 * Chip lives in the top bar; expanded panel drops below the header (not full-width).
 */
export default function OperationalAlarmDock({ showEmsInbound = true }: OperationalAlarmDockProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const emergencyRole = useEmergencyRolePermissions();
  const { saasRole } = useEffectiveUserProfile();
  const now = useNow();
  const panelId = useId();
  const chipRef = useRef<HTMLButtonElement>(null);

  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const rooms = useEmergencyStore((state) => state.rooms);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const checkCriticalEMSChecklistItem = useEmergencyStore((state) => state.checkCriticalEMSChecklistItem);
  const completeCriticalEMSChecklist = useEmergencyStore((state) => state.completeCriticalEMSChecklist);

  const {
    visibleNotificationAlerts,
    openPanel,
    recordAlertAcknowledged,
    openAlertRoute,
  } = useNotificationShell();

  const arrival = showEmsInbound ? activeCriticalArrivals(emsArrivals)[0] : undefined;
  const storeAlert = useMemo(
    () => topDockAlert(visibleNotificationAlerts),
    [visibleNotificationAlerts],
  );
  const alertCount = useMemo(
    () => countActionableAlerts(visibleNotificationAlerts) + (arrival ? 1 : 0),
    [visibleNotificationAlerts, arrival],
  );

  const [windowOpen, setWindowOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [seenEmsId, setSeenEmsId] = useState<string | null>(null);

  const currentStaff = useMemo(
    () => resolveCurrentStaff({ user, staff, activeShift }),
    [activeShift, staff, user],
  );

  // Soft-open once for a newly seen critical EMS inbound (user can collapse after).
  useEffect(() => {
    if (arrival?.id && arrival.id !== seenEmsId) {
      setSeenEmsId(arrival.id);
      setWindowOpen(true);
      setChecklistOpen(true);
    }
  }, [arrival?.id, seenEmsId]);

  useEffect(() => {
    if (!windowOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setWindowOpen(false);
        chipRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [windowOpen]);

  if (!arrival && !storeAlert) {
    return null;
  }

  const tier = arrival
    ? 'critical'
    : storeAlert
      ? getAlertClassificationTier(storeAlert)
      : 'high';

  const chipLabel = arrival
    ? `EMS ETA ${countdownLabel(arrival, now)}`
    : storeAlert
      ? storeAlert.title
      : 'Alerts';

  const chipSummary =
    alertCount > 1
      ? `${alertCount} active`
      : arrival
        ? 'Critical EMS'
        : tier === 'critical'
          ? 'Critical alert'
          : 'Priority alert';

  const renderStoreAlert = (alert: Alert) => {
    const alertTier = getAlertClassificationTier(alert);
    const primaryAction = openAlertRoute(alert);
    return (
      <section
        className={`operational-alarm-dock__card operational-alarm-dock__card--${alertTier}`}
        aria-label={alert.title}
      >
        <AlertTriangle size={16} aria-hidden className="operational-alarm-dock__icon" />
        <div className="operational-alarm-dock__copy">
          <strong>{alert.title}</strong>
          <span>{alert.message}</span>
        </div>
        <div className="operational-alarm-dock__actions">
          {primaryAction && !primaryAction.disabled ? (
            <button type="button" onClick={() => primaryAction.onSelect?.()}>
              {primaryAction.label}
            </button>
          ) : null}
          <button type="button" onClick={() => recordAlertAcknowledged(alert.id)}>
            Acknowledge
          </button>
        </div>
      </section>
    );
  };

  let emsBody: ReactNode = null;
  if (arrival) {
    const checklist = CRITICAL_CHECKLISTS.find((entry) => entry.type === arrival.criticalChecklist?.type);
    const items = checklist?.items || [];
    const completedCount = arrival.criticalChecklist?.completions.length || 0;
    const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;
    const assignedBay = roomName(rooms, arrival.preparedRoomId || arrival.criticalChecklist?.assignedRoomId);
    const doctors = physicianList(staff, activeShift);
    const isPrepComplete = Boolean(arrival.criticalChecklist?.completedAt);
    const canMarkPrepComplete = items.length > 0 && completedCount >= items.length;
    const prepareBayPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.prepareEmsBay);
    const convertPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.convertEmsArrival);
    const canPrepareBay = prepareBayPresentation.visible && prepareBayPresentation.enabled;
    const canConvert = convertPresentation.visible && convertPresentation.enabled;

    const toggleItem = (item: { id: string; label: string }, checked: boolean) => {
      if (!canPrepareBay) return;
      checkCriticalEMSChecklistItem(arrival.id, {
        itemId: item.id,
        label: item.label,
        checked,
        staffId: currentStaff.staffId,
        staffName: currentStaff.staffName,
        timestamp: new Date().toISOString(),
      });
    };

    const markPrepComplete = () => {
      if (!canMarkPrepComplete || !canPrepareBay) return;
      completeCriticalEMSChecklist(arrival.id, {
        staffId: currentStaff.staffId,
        staffName: currentStaff.staffName,
        timestamp: new Date().toISOString(),
      });
      setChecklistOpen(false);
    };

    const addToWhiteboard = () => {
      if (!canConvert) return;
      const result = convertEmsArrivalForReception(arrival.id, {
        actorName: emergencyRole.roleLabel,
      });
      if (!result.ok) return;
      if (prefersReceptionForPatientCreate(emergencyRole.role)) {
        navigateProfileAware(
          navigate,
          result.data.receptionVerifyPath ||
            getReceptionEmbeddedIntakePath({
              step: 'verify',
              patientId: result.data.patientId,
              emsArrivalId: arrival.id,
            }),
          { emergencyRole, saasRole },
        );
      }
    };

    emsBody = (
      <>
        <section
          className={[
            'operational-alarm-dock__card',
            'operational-alarm-dock__card--critical',
            isPrepComplete ? 'operational-alarm-dock__card--complete' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Critical EMS inbound"
        >
          <AlertTriangle size={16} aria-hidden className="operational-alarm-dock__icon" />
          <div className="operational-alarm-dock__copy">
            <strong>
              Critical EMS — {arrival.chiefComplaint || arrival.prearrivalComplaint}
            </strong>
            <span>
              ETA {countdownLabel(arrival, now)} · {assignedBay}
              {isPrepComplete
                ? ` · Prep complete by ${arrival.criticalChecklist?.completedByStaffName || 'team'}`
                : ` · ${completedCount}/${items.length} prep steps`}
            </span>
          </div>
          <div className="operational-alarm-dock__actions">
            {!isPrepComplete ? (
              <button type="button" onClick={() => setChecklistOpen((open) => !open)}>
                {checklistOpen ? 'Hide prep' : 'Show prep'}
              </button>
            ) : null}
            <button type="button" onClick={addToWhiteboard} disabled={!canConvert}>
              Add to whiteboard
            </button>
          </div>
        </section>

        {checklistOpen && !isPrepComplete ? (
          <div className="operational-alarm-dock__checklist" aria-label={arrival.criticalChecklist?.title}>
            <div className="operational-alarm-dock__checklist-head">
              <div>
                <span className="operational-alarm-dock__checklist-eyebrow">Critical EMS prep</span>
                <h2>{arrival.criticalChecklist?.title}</h2>
                <p>
                  {arrival.unitName} · {assignedBay} · Notify {doctors}
                </p>
              </div>
              <div className="operational-alarm-dock__checklist-meta">
                <div
                  className="operational-alarm-dock__progress"
                  aria-label={`${progress}% checklist complete`}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
                <strong>
                  {completedCount}/{items.length}
                </strong>
              </div>
            </div>
            <div className="operational-alarm-dock__checklist-items">
              {items.map((item) => {
                const completion = arrival.criticalChecklist?.completions.find(
                  (entry) => entry.itemId === item.id,
                );
                const label =
                  item.id === 'physician-notified' ? `${item.label}: ${doctors}` : item.label;
                return (
                  <label
                    key={item.id}
                    className={completion ? 'operational-alarm-dock__item--done' : ''}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(completion)}
                      onChange={(event) => toggleItem(item, event.target.checked)}
                      disabled={!canPrepareBay}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
            <div className="operational-alarm-dock__checklist-actions">
              <button
                type="button"
                onClick={markPrepComplete}
                disabled={!canMarkPrepComplete || !canPrepareBay}
              >
                Mark prep complete
              </button>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div
      className={[
        'operational-alarm-dock',
        'operational-alarm-dock--header',
        windowOpen ? 'operational-alarm-dock--open' : 'operational-alarm-dock--collapsed',
        `operational-alarm-dock--tier-${tier}`,
      ].join(' ')}
      data-alarm-surface="header-notification"
    >
      <button
        ref={chipRef}
        type="button"
        className="operational-alarm-dock__chip"
        aria-expanded={windowOpen ? 'true' : 'false'}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={`${chipSummary}: ${chipLabel}. ${windowOpen ? 'Collapse' : 'Expand'} alarms`}
        onClick={() => setWindowOpen((open) => !open)}
      >
        <Bell size={15} aria-hidden className="operational-alarm-dock__chip-icon" />
        <span className="operational-alarm-dock__chip-count" aria-hidden>
          {Math.max(1, alertCount)}
        </span>
        <span className="operational-alarm-dock__chip-text">
          <strong>{chipSummary}</strong>
          <span>{chipLabel}</span>
        </span>
        {windowOpen ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      </button>

      {windowOpen ? (
        <div
          id={panelId}
          className="operational-alarm-dock__window"
          role="region"
          aria-label="Operational alarms"
        >
          <header className="operational-alarm-dock__window-header">
            <div className="operational-alarm-dock__window-title">
              <AlertTriangle size={14} aria-hidden />
              <strong>Alarms</strong>
              <span className="sr-only" aria-live="polite">
                {chipSummary}. {chipLabel}
              </span>
            </div>
            <div className="operational-alarm-dock__window-header-actions">
              <button type="button" className="operational-alarm-dock__ghost" onClick={openPanel}>
                All alerts
              </button>
              <button
                type="button"
                className="operational-alarm-dock__icon-btn"
                aria-label="Collapse alarms"
                onClick={() => {
                  setWindowOpen(false);
                  chipRef.current?.focus();
                }}
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          </header>

          <div className="operational-alarm-dock__window-body">
            {emsBody}
            {storeAlert && (!arrival || storeAlert.id !== arrival.id)
              ? renderStoreAlert(storeAlert)
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
