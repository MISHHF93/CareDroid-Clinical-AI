import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { CRITICAL_CHECKLISTS } from '../../config/criticalChecklists';
import {
  EMERGENCY_ACTIONS,
  getReceptionEmbeddedIntakePath,
  prefersReceptionForPatientCreate,
} from '../../config/emergencyRolePermissions';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useUser } from '../../contexts/UserContext';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import { navigateProfileAware } from '../../navigation/profileRouteLaunch';
import { convertEmsArrivalForReception } from '../../services/receptionIntakeBridge';
import { staffDisplayName } from '../../utils/staffManagement';
import type { EMSArrival } from '../../types/emergency';
import './EmsCriticalArrivalPrep.css';

function activeCriticalArrivals(emsArrivals: EMSArrival[]) {
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

function roomName(rooms: ReturnType<typeof useEmergencyStore.getState>['rooms'], roomId?: string | null) {
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
  const fallback = matchedStaff || staff.find((member) => member.id === activeShift.chargeStaffId) || staff[0];
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

/**
 * Critical EMS pre-arrival prep — bay assignment, physician notification, checklist.
 * Lives on the page (Reception) instead of a header dropdown so it's visible without
 * an extra click and doesn't compete with the Sidebar's alert count for attention.
 */
export default function EmsCriticalArrivalPrep() {
  const navigate = useNavigate();
  const { user } = useUser();
  const emergencyRole = useEmergencyRolePermissions();
  const { saasRole } = useEffectiveUserProfile();
  const now = useNow();

  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const rooms = useEmergencyStore((state) => state.rooms);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const checkCriticalEMSChecklistItem = useEmergencyStore((state) => state.checkCriticalEMSChecklistItem);
  const completeCriticalEMSChecklist = useEmergencyStore((state) => state.completeCriticalEMSChecklist);

  const arrival = activeCriticalArrivals(emsArrivals)[0];
  const [checklistOpen, setChecklistOpen] = useState(true);

  const currentStaff = useMemo(
    () => resolveCurrentStaff({ user, staff, activeShift }),
    [activeShift, staff, user],
  );

  const addToWhiteboard = useCallback(() => {
    if (!arrival) return;
    const convertPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.convertEmsArrival);
    if (!convertPresentation.visible || !convertPresentation.enabled) return;
    const result = convertEmsArrivalForReception(arrival.id, { actorName: emergencyRole.roleLabel });
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
  }, [arrival, emergencyRole, navigate, saasRole]);

  if (!arrival) return null;

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

  return (
    <section
      className={[
        'ems-critical-arrival-prep',
        isPrepComplete ? 'ems-critical-arrival-prep--complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Critical EMS inbound"
    >
      <div className="ems-critical-arrival-prep__summary">
        <AlertTriangle size={18} aria-hidden className="ems-critical-arrival-prep__icon" />
        <div className="ems-critical-arrival-prep__copy">
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
        <div className="ems-critical-arrival-prep__actions">
          {!isPrepComplete ? (
            <button type="button" onClick={() => setChecklistOpen((open) => !open)}>
              {checklistOpen ? 'Hide prep' : 'Show prep'}
            </button>
          ) : null}
          <button type="button" onClick={addToWhiteboard} disabled={!canConvert}>
            Add to whiteboard
          </button>
        </div>
      </div>

      {checklistOpen && !isPrepComplete ? (
        <div className="ems-critical-arrival-prep__checklist" aria-label={arrival.criticalChecklist?.title}>
          <div className="ems-critical-arrival-prep__checklist-head">
            <div>
              <span className="ems-critical-arrival-prep__checklist-eyebrow">Critical EMS prep</span>
              <h2>{arrival.criticalChecklist?.title}</h2>
              <p>
                {arrival.unitName} · {assignedBay} · Notify {doctors}
              </p>
            </div>
            <div className="ems-critical-arrival-prep__checklist-meta">
              <div
                className="ems-critical-arrival-prep__progress"
                aria-label={`${progress}% checklist complete`}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <strong>
                {completedCount}/{items.length}
              </strong>
            </div>
          </div>
          <div className="ems-critical-arrival-prep__checklist-items">
            {items.map((item) => {
              const completion = arrival.criticalChecklist?.completions.find(
                (entry) => entry.itemId === item.id,
              );
              const label = item.id === 'physician-notified' ? `${item.label}: ${doctors}` : item.label;
              return (
                <label
                  key={item.id}
                  className={completion ? 'ems-critical-arrival-prep__item--done' : ''}
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
          <div className="ems-critical-arrival-prep__checklist-actions">
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
    </section>
  );
}
