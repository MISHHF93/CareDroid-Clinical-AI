import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useEmergencyStore } from '../store/emergencyStore';
import { useUser } from '../contexts/UserContext';
import { staffDisplayName } from '../utils/staffManagement';
import './EscalateButton.css';

function patientName(patient) {
  return patient?.name || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || 'Unknown patient';
}

function latestActiveEscalation(patient) {
  const events = [...(patient?.timeline || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestEscalation = events.find((event) => event.type === 'ESCALATION');
  const latestCancel = events.find((event) => event.type === 'ESCALATION_CANCELLED');
  if (!latestEscalation) return null;
  if (
    latestCancel &&
    new Date(latestCancel.timestamp).getTime() >= new Date(latestEscalation.timestamp).getTime()
  ) {
    return null;
  }
  return latestEscalation;
}

function resolveCurrentStaff({ user, staff, activeShift, patient }) {
  const userText = [user?.id, user?.email, user?.name, user?.fullName].filter(Boolean).join(' ').toLowerCase();
  const matchedStaff = staff.find((member) => {
    const memberText = [member.id, member.email, member.name, member.displayName, member.firstName, member.lastName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return userText && memberText && (userText.includes(memberText) || memberText.includes(userText));
  });
  const fallback =
    matchedStaff ||
    staff.find((member) => member.id === patient?.assignedStaffId) ||
    staff.find((member) => member.id === activeShift.chargeStaffId);
  const staffId = fallback?.id || user?.id || 'staff-unknown';
  const staffName = fallback ? staffDisplayName(fallback) : user?.fullName || user?.name || staffId;
  return { staffId, staffName, staff: fallback || null };
}

export default function EscalateButton({ patient, variant = 'card' }) {
  const { user } = useUser();
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const escalatePatient = useEmergencyStore((state) => state.escalatePatient);
  const cancelEscalation = useEmergencyStore((state) => state.cancelEscalation);
  const [confirming, setConfirming] = useState(false);
  const currentStaff = useMemo(
    () => resolveCurrentStaff({ user, staff, activeShift, patient }),
    [activeShift, patient, staff, user]
  );
  const activeEscalation = latestActiveEscalation(patient);
  const isCharge =
    currentStaff.staffId === activeShift.chargeStaffId ||
    /charge/i.test(String(currentStaff.staff?.role || currentStaff.staff?.roleLabel || ''));
  const canCancel =
    Boolean(activeEscalation) &&
    (activeEscalation.by === currentStaff.staffId ||
      activeEscalation.staffId === currentStaff.staffId ||
      activeEscalation.actorStaffId === currentStaff.staffId ||
      isCharge);

  useEffect(() => {
    if (!confirming) return undefined;
    const timer = window.setTimeout(() => {
      escalatePatient(patient.id, {
        staffId: currentStaff.staffId,
        staffName: currentStaff.staffName,
        timestamp: new Date().toISOString(),
      });
      setConfirming(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [confirming, currentStaff.staffId, currentStaff.staffName, escalatePatient, patient.id]);

  const confirmNow = () => {
    escalatePatient(patient.id, {
      staffId: currentStaff.staffId,
      staffName: currentStaff.staffName,
      timestamp: new Date().toISOString(),
    });
    setConfirming(false);
  };

  const cancelActiveEscalation = () => {
    cancelEscalation(patient.id, {
      staffId: currentStaff.staffId,
      staffName: currentStaff.staffName,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div
      className={[
        'escalate-button',
        variant === 'detail' ? 'escalate-button--detail' : 'escalate-button--card',
        confirming ? 'escalate-button--confirming' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {confirming ? (
        <div className="escalate-button__confirm" role="alert">
          <strong>Escalate {patientName(patient)}?</strong>
          <span>This will alert all on-duty staff.</span>
          <div>
            <button type="button" onClick={confirmNow}>
              Confirm Escalation
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="escalate-button__trigger"
          onClick={() => setConfirming(true)}
          aria-label={`Escalate ${patientName(patient)}`}
          title={`Escalate ${patientName(patient)}`}
        >
          <AlertTriangle size={variant === 'detail' ? 18 : 20} aria-hidden />
          {variant === 'detail' ? <span>Escalate</span> : null}
        </button>
      )}
      {variant === 'detail' && canCancel ? (
        <button type="button" className="escalate-button__cancel-active" onClick={cancelActiveEscalation}>
          Cancel escalation
        </button>
      ) : null}
    </div>
  );
}
