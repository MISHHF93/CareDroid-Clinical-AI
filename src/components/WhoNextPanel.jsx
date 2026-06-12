import React, { useEffect, useMemo, useState } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useEmergencyStore } from '../../store/emergencyStore';
import { createSnooze, getWhoNextRecommendation } from '../utils/whoNext';
import { formatLongestWaitBroadcast } from '../utils/longWaitRescue';
import './WhoNextPanel.css';

function readPinned() {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('caredroid.ed.whoNext.pinned') !== 'false';
}

function writePinned(value) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('caredroid.ed.whoNext.pinned', value ? 'true' : 'false');
}

function formatPatientLine(recommendation) {
  if (!recommendation?.patient) return 'No recommendation';
  const complaint = recommendation.patient.complaintCategory || recommendation.patient.chiefComplaint || 'Complaint pending';
  return `${recommendation.displayName} · ${recommendation.room} · ${complaint}`;
}

function formatContextLine(recommendation) {
  if (!recommendation?.patient) return recommendation?.reason || 'No active patients found';
  return `${recommendation.patient.priority} · Waiting ${recommendation.waitMinutes}min · ${recommendation.reason}`;
}

export default function WhoNextPanel({ variant = 'floating', selectedPatientId = null }) {
  const { user } = useUser();
  const patients = useEmergencyStore((state) => state.patients);
  const rooms = useEmergencyStore((state) => state.rooms);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const backendDetailsByPatientId = useEmergencyStore((state) => state.patientBackendDetails);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const setWhiteboardSearchQuery = useEmergencyStore((state) => state.setWhiteboardSearchQuery);
  const [now, setNow] = useState(() => new Date());
  const [snoozes, setSnoozes] = useState({});
  const [pinned, setPinned] = useState(() => readPinned());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const recommendation = useMemo(
    () =>
      getWhoNextRecommendation({
        patients,
        rooms,
        staff,
        activeShift,
        user,
        snoozes,
        backendDetailsByPatientId,
        now,
      }),
    [activeShift, backendDetailsByPatientId, now, patients, rooms, snoozes, staff, user]
  );
  const longWaitBroadcast = useMemo(
    () => formatLongestWaitBroadcast(patients, now),
    [now, patients]
  );

  if (variant === 'floating' && !pinned) {
    return (
      <button
        type="button"
        className="who-next-panel__pin-tab"
        onClick={() => {
          setPinned(true);
          writePinned(true);
        }}
      >
        <Pin size={14} aria-hidden />
        Who next
      </button>
    );
  }

  const goToPatient = () => {
    if (!recommendation?.patient?.id) return;
    setQueueFilter(null);
    setWhiteboardSearchQuery('');
    selectPatient(recommendation.patient.id);
  };

  const skipPatient = () => {
    if (!recommendation?.patient?.id) return;
    setSnoozes((current) => ({
      ...current,
      [recommendation.patient.id]: createSnooze(recommendation.patient.id, now),
    }));
    setNow(new Date());
  };

  const togglePinned = () => {
    const nextPinned = !pinned;
    setPinned(nextPinned);
    writePinned(nextPinned);
  };

  return (
    <section
      className={[
        'who-next-panel',
        variant === 'detail' ? 'who-next-panel--detail' : 'who-next-panel--floating',
        recommendation?.patient?.id === selectedPatientId ? 'who-next-panel--current' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="See next patient recommendation"
    >
      <div className="who-next-panel__header">
        <span>See next</span>
        {variant === 'floating' ? (
          <button
            type="button"
            className="who-next-panel__pin"
            onClick={togglePinned}
            aria-label={pinned ? 'Unpin who next panel' : 'Pin who next panel'}
          >
            {pinned ? <PinOff size={14} aria-hidden /> : <Pin size={14} aria-hidden />}
          </button>
        ) : null}
      </div>
      <strong>{formatPatientLine(recommendation)}</strong>
      {longWaitBroadcast ? <small className="who-next-panel__long-wait">⏱ {longWaitBroadcast}</small> : null}
      <p>{formatContextLine(recommendation)}</p>
      <div className="who-next-panel__actions">
        <button type="button" onClick={goToPatient} disabled={!recommendation?.patient}>
          Go to Patient
        </button>
        <button type="button" onClick={skipPatient} disabled={!recommendation?.patient}>
          Skip - show next
        </button>
      </div>
    </section>
  );
}
