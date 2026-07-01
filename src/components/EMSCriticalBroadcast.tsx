import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { CRITICAL_CHECKLISTS } from '../config/criticalChecklists';
import { useEmergencyStore } from '../store/emergencyStore';
import { useUser } from '../contexts/UserContext';
import {
  EMERGENCY_ACTIONS,
  getReceptionEmbeddedIntakePath,
  prefersReceptionForPatientCreate,
} from '../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import { convertEmsArrivalForReception } from '../services/receptionIntakeBridge';
import { staffDisplayName } from '../utils/staffManagement';
import './EMSCriticalBroadcast.css';

function activeCriticalArrivals(emsArrivals) {
  return emsArrivals
    .filter(
      (arrival) =>
        arrival.criticalChecklist &&
        !arrival.patientId &&
        !['Complete', 'Cancelled'].includes(arrival.status)
    )
    .sort((a, b) => new Date(a.estimatedArrivalTime).getTime() - new Date(b.estimatedArrivalTime).getTime());
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function countdownParts(arrival, now) {
  const target = new Date(arrival.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) return { totalSeconds: Math.max(0, (arrival.eta || 0) * 60), label: `${arrival.eta || 0}:00` };
  const totalSeconds = Math.max(0, Math.ceil((target - now.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { totalSeconds, label: `${minutes}:${String(seconds).padStart(2, '0')}` };
}

function etaMinutes(arrival, now) {
  return Math.max(0, Math.ceil(countdownParts(arrival, now).totalSeconds / 60));
}

function roomName(rooms, roomId) {
  return rooms.find((room) => room.id === roomId)?.name || 'Bay pending';
}

function sexLabel(sex) {
  if (sex === 'Male') return 'Male';
  if (sex === 'Female') return 'Female';
  return sex || 'Unknown sex';
}

function vitalsSummary(vitals) {
  if (!vitals) return 'Vitals pending';
  const bp =
    vitals.bpSystolic != null
      ? `BP ${vitals.bpSystolic}/${vitals.bpDiastolic ?? '--'}`
      : null;
  return [
    bp,
    vitals.hr != null ? `HR ${vitals.hr}` : null,
    vitals.spo2 != null ? `SpO2 ${vitals.spo2}%` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'Vitals pending';
}

function resolveCurrentStaff({ user, staff, activeShift }) {
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

function physicianList(staff, activeShift) {
  const activeIds = new Set(activeShift.staffIds || []);
  const physicians = staff.filter(
    (member) =>
      (!activeIds.size || activeIds.has(member.id)) &&
      member.status === 'OnShift' &&
      ['Attending', 'Resident', 'Consultant'].includes(member.role)
  );
  return physicians.map(staffDisplayName).join(', ') || 'on-duty MD';
}

function checklistConfig(type) {
  return CRITICAL_CHECKLISTS.find((checklist) => checklist.type === type);
}

function completionFor(arrival, itemId) {
  return arrival.criticalChecklist?.completions.find((completion) => completion.itemId === itemId);
}

function arrivalHeadline(arrival, now) {
  return [
    arrival.chiefComplaint || arrival.prearrivalComplaint,
    `${sexLabel(arrival.patientSex)} ${arrival.patientAge}`,
    vitalsSummary(arrival.vitals),
    `ETA ${etaMinutes(arrival, now)} MIN`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function EMSCriticalCountdownBadge() {
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const now = useNow();
  const arrival = activeCriticalArrivals(emsArrivals)[0];
  if (!arrival) return null;
  const { label } = countdownParts(arrival, now);
  return (
    <span className="ems-critical-countdown" role="status" aria-label={`${arrival.chiefComplaint} inbound ETA ${label}`}>
      ? {arrival.chiefComplaint || arrival.prearrivalComplaint} — {label}
    </span>
  );
}

export default function EMSCriticalBroadcast() {
  const navigate = useNavigate();
  const { user } = useUser();
  const emergencyRole = useEmergencyRolePermissions();
  const { saasRole } = useEffectiveUserProfile();
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const rooms = useEmergencyStore((state) => state.rooms);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const checkCriticalEMSChecklistItem = useEmergencyStore((state) => state.checkCriticalEMSChecklistItem);
  const completeCriticalEMSChecklist = useEmergencyStore((state) => state.completeCriticalEMSChecklist);
  const now = useNow();
  const arrival = activeCriticalArrivals(emsArrivals)[0];
  const currentStaff = useMemo(
    () => resolveCurrentStaff({ user, staff, activeShift }),
    [activeShift, staff, user]
  );
  const [showOverlay, setShowOverlay] = useState(false);
  const [collapsedArrivalIds, setCollapsedArrivalIds] = useState<any>({});

  useEffect(() => {
    if (!arrival?.id || arrival.criticalChecklist?.completedAt) return undefined;
    setShowOverlay(true);
    const timer = window.setTimeout(() => setShowOverlay(false), 5000);
    return () => window.clearTimeout(timer);
  }, [arrival?.criticalChecklist?.completedAt, arrival?.id]);

  if (!arrival) return null;

  const checklist = checklistConfig(arrival.criticalChecklist.type);
  const items = checklist?.items || [];
  const completedCount = arrival.criticalChecklist.completions.length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;
  const assignedBay = roomName(rooms, arrival.preparedRoomId || arrival.criticalChecklist.assignedRoomId);
  const doctors = physicianList(staff, activeShift);
  const isPrepComplete = Boolean(arrival.criticalChecklist.completedAt);
  const isCollapsed = Boolean(collapsedArrivalIds[arrival.id]);
  const isChecklistExpanded = !isPrepComplete && !isCollapsed;
  const canMarkPrepComplete = items.length > 0 && completedCount >= items.length;
  const prepareBayPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.prepareEmsBay);
  const convertPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.convertEmsArrival);
  const canPrepareBay = prepareBayPresentation.visible && prepareBayPresentation.enabled;
  const canConvert = convertPresentation.visible && convertPresentation.enabled;

  const toggleItem = (item, checked) => {
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

  const minimizeChecklist = () => {
    setCollapsedArrivalIds((current) => ({ ...current, [arrival.id]: true }));
  };

  const reopenChecklist = () => {
    setCollapsedArrivalIds((current) => {
      const next = { ...current };
      delete next[arrival.id];
      return next;
    });
  };

  const markPrepComplete = () => {
    if (!canMarkPrepComplete || !canPrepareBay) return;
    completeCriticalEMSChecklist(arrival.id, {
      staffId: currentStaff.staffId,
      staffName: currentStaff.staffName,
      timestamp: new Date().toISOString(),
    });
    minimizeChecklist();
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
        result.receptionVerifyPath ||
          getReceptionEmbeddedIntakePath({
            step: 'verify',
            patientId: result.patientId,
            emsArrivalId: arrival.id,
          }),
        { emergencyRole, saasRole },
      );
    }
  };

  return (
    <>
      {showOverlay ? (
        <section className="ems-critical-overlay" role="alert" aria-live="assertive">
          <AlertTriangle size={72} aria-hidden />
          <h2>?? CRITICAL INCOMING</h2>
          <p>{arrivalHeadline(arrival, now)}</p>
          <strong>Assigned Bay: {assignedBay}</strong>
        </section>
      ) : null}

      <section
        className={[
          'ems-critical-banner',
          isCollapsed ? 'ems-critical-banner--collapsed' : '',
          isPrepComplete ? 'ems-critical-banner--complete' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="alert"
        aria-live="polite"
      >
        <strong>{arrival.chiefComplaint || arrival.prearrivalComplaint} inbound</strong>
        <span>ETA {countdownParts(arrival, now).label}</span>
        <span>{assignedBay}</span>
        {isPrepComplete ? (
          <span>Prep complete by {arrival.criticalChecklist.completedByStaffName || 'team'}</span>
        ) : null}
        <div className="ems-critical-banner__actions">
          {isChecklistExpanded ? (
            <button type="button" onClick={minimizeChecklist}>
              Minimize
            </button>
          ) : !isPrepComplete ? (
            <button type="button" onClick={reopenChecklist}>
              Reopen prep
            </button>
          ) : null}
          <button type="button" onClick={addToWhiteboard} disabled={!canConvert}>
            Add to whiteboard
          </button>
        </div>
      </section>

      {isChecklistExpanded ? (
      <aside className="ems-critical-checklist ems-critical-checklist--expanded" aria-label={arrival.criticalChecklist.title}>
        <header>
          <div className="ems-critical-checklist__header-row">
            <span>Critical EMS prep</span>
            <button type="button" onClick={minimizeChecklist}>
              Minimize
            </button>
          </div>
          <h2>{arrival.criticalChecklist.title}</h2>
          <p>
            {arrival.unitName} · {arrivalHeadline(arrival, now)} · {assignedBay}
          </p>
          <div className="ems-critical-checklist__progress" aria-label={`${progress}% checklist complete`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <strong>
            {completedCount}/{items.length} complete
          </strong>
          <div className="ems-critical-checklist__actions">
            <button type="button" onClick={markPrepComplete} disabled={!canMarkPrepComplete || !canPrepareBay}>
              Mark prep complete
            </button>
            <button type="button" onClick={addToWhiteboard} disabled={!canConvert}>
              Add to whiteboard
            </button>
          </div>
        </header>

        <div className="ems-critical-checklist__items">
          {items.map((item) => {
            const completion = completionFor(arrival, item.id);
            const label =
              item.id === 'physician-notified' ? `${item.label}: ${doctors}` : item.label;
            return (
              <label key={item.id} className={completion ? 'ems-critical-checklist__item--done' : ''}>
                <input
                  type="checkbox"
                  checked={Boolean(completion)}
                  onChange={(event) => toggleItem(item, event.target.checked)}
                  disabled={!canPrepareBay}
                />
                <span>{label}</span>
                {completion ? (
                  <small>
                    {completion.checkedByStaffName} ·{' '}
                    {new Date(completion.checkedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                ) : null}
              </label>
            );
          })}
        </div>
      </aside>
      ) : null}
    </>
  );
}
