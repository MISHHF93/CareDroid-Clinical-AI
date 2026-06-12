import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  Activity,
  Baby,
  BarChart3,
  Bell,
  Bot,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Gauge,
  Info,
  LayoutDashboard,
  Settings,
  Share2,
  Stethoscope,
  Truck,
  X,
} from 'lucide-react';
import ChatInterface from '../components/ChatInterface';
import CommandPalette from '../components/CommandPalette';
import EMSCriticalBroadcast, { EMSCriticalCountdownBadge } from '../components/EMSCriticalBroadcast';
import { calculateEMSPressureScore, isEMSPressureElevated } from '../components/EMSPressureScore';
import PediatricDrugCalculator from '../components/PediatricDrugCalculator';
import ReassessmentDrawer from '../components/ReassessmentDrawer';
import WorkloadBalancePanel from '../components/WorkloadBalancePanel';
import { useConversation } from '../contexts/ConversationContext';
import { useUser } from '../contexts/UserContext';
import {
  hasPatientFlag,
  selectActiveAlerts,
  selectActivePatients,
  selectReassessmentCount,
  useEmergencyStore,
} from '../../store/emergencyStore';
import { useFeatureStore } from '../../store/featureStore';
import { FEATURE_REGISTRY_BY_ID } from '../../lib/features/featureRegistry';
import { PatientState } from '../../types/emergency';
import { movePatientToState as movePatientWithJourneyRules } from '../../engine/journeyEngine';
import {
  initializeEmergencySimulation,
  isEmergencySimulationAvailable,
  isEmergencySimulationRunning,
  SIMULATION_STATUS_EVENT,
} from '../../engine/simulation';
import { buildStaffWorkloads, getStaffRebalanceSuggestion } from '../utils/staffManagement';
import { pendingReminderCountForStaff } from '../utils/reassessmentScheduler';
import { emergencyPermissionsForUser, emergencyRoleForUser } from '../utils/emergencyRolePermissions';
import { APP_SHELL_NAV_ITEMS } from '../config/navigation.config';
import './AppShell.css';

const SIDEBAR_ICON_COMPONENTS = {
  analytics: BarChart3,
  capacity: Gauge,
  calculators: Stethoscope,
  ems: Truck,
  intake: ClipboardList,
  operations: ClipboardList,
  pulse: Activity,
  referrals: Share2,
  settings: Settings,
  shift: CalendarClock,
  whiteboard: LayoutDashboard,
};

export function buildSidebarItems(isEnabled) {
  return APP_SHELL_NAV_ITEMS.map((item) => {
    const feature = FEATURE_REGISTRY_BY_ID[item.featureId];
    if (!feature?.sidebarIcon || !isEnabled(feature.id)) return null;
    return {
      id: item.id,
      featureId: item.featureId,
      label: feature.label,
      path: item.path,
      icon: SIDEBAR_ICON_COMPONENTS[feature.sidebarIcon] || LayoutDashboard,
      activePaths: item.activePaths,
      tier: feature.tier,
    };
  }).filter(Boolean);
}

const ACTIVE_PATIENT_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

const SHORTCUT_GROUPS = [
  {
    title: 'Global',
    shortcuts: [
      ['/', 'Open command palette'],
      ['Esc', 'Close open panels or modals'],
      ['N', 'New patient intake'],
      ['C', 'Toggle Copilot panel'],
      ['E', 'Go to EMS panel'],
      ['R', 'Open reassessment drawer'],
      ['Shift + H', 'Open shift handoff brief'],
      ['Shift + S', 'Open shift summary'],
      ['Shift + C', 'Open capacity detail'],
      ['Shift + P', 'Open pediatric drug calculator'],
      ['?', 'Open shortcut reference'],
    ],
  },
  {
    title: 'Emergency Whiteboard',
    shortcuts: [
      ['1-5', 'Set queue filter by index'],
      ['G', 'Grid view'],
      ['L', 'List view'],
      ['↑ / ↓', 'Navigate patient cards'],
      ['Enter', 'Open selected patient detail'],
      ['F', 'Flag selected patient for reassessment'],
    ],
  },
  {
    title: 'Patient Detail',
    shortcuts: [
      ['→', 'Move patient to next state'],
      ['←', 'Go back to whiteboard'],
      ['A', 'Assign staff'],
      ['Tab', 'Next patient in current filter'],
    ],
  },
];

const SIDEBAR_NEW_FEATURES_KEY = 'caredroid.emergency.sidebarNewFeatures.v1';
const CHARGE_NURSE_PULSE_DEFAULT_KEY = 'caredroid.ed.departmentPulse.chargeDefaultSeen';

function readSessionFeatureSet() {
  if (typeof sessionStorage === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SIDEBAR_NEW_FEATURES_KEY) || '[]'));
  } catch (_error) {
    return new Set();
  }
}

function writeSessionFeatureSet(featureIds) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SIDEBAR_NEW_FEATURES_KEY, JSON.stringify([...featureIds]));
}

function isEditableShortcutTarget(target) {
  return (
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.tagName === 'SELECT' ||
    target?.isContentEditable
  );
}

function isNavItemActive(item, pathname) {
  return item.activePaths.some((activePath) => {
    if (activePath === '/emergency/whiteboard') {
      return pathname === activePath;
    }

    return pathname === activePath || pathname.startsWith(`${activePath}/`);
  });
}

function formatShiftClock(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function formatShiftDuration(activeShift, clock) {
  if (!activeShift?.startTime) return 'No active shift';
  if (activeShift.status === 'Closed') return 'Shift ended';
  const elapsedMs = Math.max(0, clock.getTime() - new Date(activeShift.startTime).getTime());
  const hours = Math.floor(elapsedMs / 3_600_000);
  const minutes = Math.floor((elapsedMs % 3_600_000) / 60_000);
  return `${hours}h ${String(minutes).padStart(2, '0')}m active`;
}

function realtimeStatusLabel(connection) {
  if (connection.status === 'connected') return 'Real-time connected';
  if (connection.status === 'reconnecting') return 'Reconnecting...';
  return 'Real-time disconnected';
}

function RealtimeConnectionIndicator({ connection }) {
  const tone =
    connection.status === 'connected'
      ? 'connected'
      : connection.status === 'reconnecting'
        ? 'reconnecting'
        : 'disconnected';
  const title =
    connection.message ||
    (connection.status === 'connected'
      ? 'Real-time connected'
      : connection.status === 'reconnecting'
        ? 'Reconnecting...'
        : 'Real-time disconnected');

  return (
    <span
      className={`ed-realtime-status ed-realtime-status--${tone}`}
      title={title}
      aria-label={realtimeStatusLabel(connection)}
      role="status"
    >
      <span aria-hidden />
    </span>
  );
}

function minutesSince(timestamp, now) {
  const startedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(startedAt)) return 0;
  return Math.max(0, Math.round((now.getTime() - startedAt) / 60000));
}

function patientName(patient) {
  return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown patient';
}

function capacityToneClass(riskLevel) {
  return String(riskLevel || 'Green').toLowerCase();
}

function CapacityBadge({ onClick, expanded }) {
  const capacity = useEmergencyStore((state) => state.capacity);
  const tone = capacityToneClass(capacity.riskLevel);
  return (
    <button
      type="button"
      className={`ed-capacity-badge ed-capacity-badge--${tone}`}
      onClick={onClick}
      aria-label={`${capacity.label}: ${capacity.score}`}
      aria-expanded={expanded}
    >
      <span className="ed-capacity-badge__dot" aria-hidden />
      <span>{capacity.label}</span>
      <strong>{capacity.score}</strong>
    </button>
  );
}

function ReassessmentBadge({ count, onClick, expanded }) {
  const hasFlaggedPatients = count > 0;

  return (
    <button
      type="button"
      className={[
        'ed-reassessment-badge',
        hasFlaggedPatients ? 'ed-reassessment-badge--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-label={`${count} flagged patient${count === 1 ? '' : 's'} for reassessment`}
      aria-expanded={expanded}
    >
      <span className="ed-reassessment-badge__pulse" aria-hidden />
      <AlertTriangle size={15} strokeWidth={2.2} aria-hidden />
      <strong>{count}</strong>
    </button>
  );
}

function formatCapacityTimestamp(timestamp) {
  if (!timestamp) return '--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

function formatDuration(minutes) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function secondsSince(timestamp, now) {
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 1000));
}

function latestStateTimestamp(patient, state) {
  const event = [...patient.timeline].reverse().find((item) => {
    const stateTarget = item.toState || item.to;
    return stateTarget === state || item.summary.toLowerCase().includes(state.toLowerCase());
  });

  return event?.timestamp || patient.lastAssessedTime || patient.triageTime || patient.arrivalTime;
}

function durationTone(minutes, warningAt, criticalAt) {
  if (minutes >= criticalAt) return 'critical';
  if (minutes >= warningAt) return 'warning';
  return 'normal';
}

function targetDepartmentForPatient(patient, referrals) {
  const referral = referrals
    .filter((candidate) => candidate.patientId === patient.id)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0];

  return referral?.targetDepartment || 'Bed Management';
}

function minutesUntil(timestamp, now) {
  const target = new Date(timestamp).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.max(0, Math.ceil((target - now.getTime()) / 60000));
}

function roomTone(room, patientById) {
  const patient = room.currentPatientId ? patientById.get(room.currentPatientId) : null;
  if (patient?.state === PatientState.Admission) return 'boarding';
  if (room.type === 'Isolation' || (patient && hasPatientFlag(patient, 'Isolation')))
    return 'isolation';
  if (room.status === 'Available') return 'available';
  if (room.status === 'Occupied' || room.currentPatientId) return 'occupied';
  return 'unavailable';
}

function buildCapacityRecommendations({
  capacity,
  boardingPatients,
  dischargePatients,
  incomingEMS,
}) {
  const recommendations = [];

  if (boardingPatients.length) {
    recommendations.push(
      `Prioritize bed management escalation for ${boardingPatients.length} boarding patient${boardingPatients.length === 1 ? '' : 's'} before new admissions accumulate.`
    );
  }

  if (dischargePatients.length) {
    recommendations.push(
      `Expedite ${dischargePatients.length} discharge-ready patient${dischargePatients.length === 1 ? '' : 's'} in Disposition to recover room capacity.`
    );
  }

  if (incomingEMS.length) {
    recommendations.push(
      `Pre-assign receiving bays for ${incomingEMS.length} inbound EMS case${incomingEMS.length === 1 ? '' : 's'} and protect one monitored space for critical arrivals.`
    );
  }

  if (capacity.reassessmentDueCount > 3) {
    recommendations.push(
      'Assign a clinician to clear reassessments now; the reassessment queue is contributing to capacity strain.'
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      'Maintain current flow, keep discharge readiness visible, and continue monitoring EMS arrivals.'
    );
  }

  return recommendations.slice(0, 3);
}

function CapacityHistorySparkline({ history = [] }) {
  if (!history.length) {
    return <p className="capacity-detail-panel__empty">No capacity history returned yet.</p>;
  }

  return (
    <div className="capacity-history-sparkline" aria-label="Capacity score over last 8 hours">
      <ResponsiveContainer width="100%" height={126}>
        <LineChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="score"
            name="Capacity score"
            stroke="var(--status-info)"
            strokeWidth={2}
            dot={(props) => {
              const level = String(props.payload?.riskLevel || '').toLowerCase();
              const fill =
                level === 'red'
                  ? 'var(--status-critical)'
                  : level === 'orange'
                    ? '#f97316'
                    : level === 'yellow'
                      ? 'var(--status-warning)'
                      : 'var(--status-stable)';
              const dotKey = props.payload?.label || props.index || `${props.cx}-${props.cy}`;
              return <circle key={dotKey} cx={props.cx} cy={props.cy} r={3.5} fill={fill} />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CapacityDetailPanel({ open, onClose }) {
  const capacity = useEmergencyStore((state) => state.capacity);
  const patients = useEmergencyStore((state) => state.patients);
  const rooms = useEmergencyStore((state) => state.rooms);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emergencyAnalytics = useEmergencyStore((state) => state.emergencyAnalytics);
  const loadEmergencyAnalytics = useEmergencyStore((state) => state.loadEmergencyAnalytics);
  const [recommendations, setRecommendations] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const tone = capacityToneClass(capacity.riskLevel);
  const isVisible = Boolean(open);
  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const boardingPatients = useMemo(
    () => patients.filter((patient) => patient.state === PatientState.Admission),
    [patients]
  );
  const dischargePatients = useMemo(
    () => patients.filter((patient) => patient.state === PatientState.Disposition),
    [patients]
  );
  const incomingEMS = useMemo(
    () =>
      emsArrivals
        .filter((arrival) => arrival.status === 'Inbound')
        .sort(
          (a, b) =>
            new Date(a.estimatedArrivalTime).getTime() - new Date(b.estimatedArrivalTime).getTime()
        ),
    [emsArrivals]
  );
  const incomingNext30 = incomingEMS.filter((arrival) => {
    const eta = minutesUntil(arrival.estimatedArrivalTime, now);
    return eta !== null && eta <= 30;
  });

  useEffect(() => {
    if (!open) {
      setRecommendations([]);
      return;
    }

    setNow(new Date());
    void loadEmergencyAnalytics({ force: true });
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [loadEmergencyAnalytics, open]);

  useEffect(() => {
    if (!open || recommendations.length) return;
    setRecommendations(
      buildCapacityRecommendations({ capacity, boardingPatients, dischargePatients, incomingEMS })
    );
  }, [boardingPatients, capacity, dischargePatients, incomingEMS, open, recommendations.length]);

  return (
    <section
      className={`capacity-detail-panel capacity-detail-panel--${tone}${isVisible ? ' capacity-detail-panel--open' : ''}`}
      aria-hidden={!isVisible}
      aria-labelledby="capacity-detail-title"
    >
      <header className="capacity-detail-panel__header">
        <div>
          <span>Capacity Intelligence</span>
          <h2 id="capacity-detail-title">{capacity.label}</h2>
        </div>
        <strong>{capacity.score}</strong>
        <button type="button" onClick={onClose} aria-label="Close capacity detail panel">
          <X size={17} aria-hidden />
        </button>
      </header>

      <div className="capacity-detail-panel__body">
        <section className="capacity-detail-panel__score-card">
          <span>Current Score</span>
          <div>
            <strong>{capacity.score}</strong>
            <p>{capacity.label}</p>
          </div>
          <small>Last recalculated {secondsSince(capacity.generatedAt, now)} seconds ago</small>
        </section>

        <section className="capacity-detail-panel__section">
          <div className="capacity-detail-panel__section-heading">
            <span>Capacity History</span>
            <small>
              {emergencyAnalytics.source === 'backend' ? 'Backend' : 'Local fallback'} · last 8h
            </small>
          </div>
          <CapacityHistorySparkline history={emergencyAnalytics.data?.capacityHistory || []} />
        </section>

        <section className="capacity-detail-panel__section">
          <div className="capacity-detail-panel__section-heading">
            <span>Room Occupancy</span>
            <small>
              {capacity.currentOccupancy}/{capacity.maxCapacity} rooms occupied
            </small>
          </div>
          <div className="capacity-room-grid" aria-label="Room occupancy grid">
            {rooms.map((room) => {
              const patient = room.currentPatientId ? patientById.get(room.currentPatientId) : null;
              const toneName = roomTone(room, patientById);
              return (
                <span
                  key={room.id}
                  className={`capacity-room-grid__room capacity-room-grid__room--${toneName}`}
                  title={`${room.name}: ${toneName}${patient ? ` - ${patientName(patient)}` : ''}`}
                />
              );
            })}
          </div>
          <div className="capacity-room-grid__legend" aria-label="Room grid legend">
            <span>
              <i className="capacity-room-grid__room--available" />
              Available
            </span>
            <span>
              <i className="capacity-room-grid__room--occupied" />
              Occupied
            </span>
            <span>
              <i className="capacity-room-grid__room--boarding" />
              Boarding
            </span>
            <span>
              <i className="capacity-room-grid__room--isolation" />
              Isolation
            </span>
          </div>
        </section>

        <section className="capacity-detail-panel__section">
          <div className="capacity-detail-panel__section-heading">
            <span>Boarding Pressure</span>
            <small>{boardingPatients.length} patients</small>
          </div>
          <div className="capacity-detail-panel__list">
            {boardingPatients.length ? (
              boardingPatients.map((patient) => {
                const minutes = minutesSince(
                  latestStateTimestamp(patient, PatientState.Admission),
                  now
                );
                return (
                  <article key={patient.id}>
                    <div>
                      <strong>{patientName(patient)}</strong>
                      <span>{targetDepartmentForPatient(patient, referrals)}</span>
                    </div>
                    <em
                      className={`capacity-duration capacity-duration--${durationTone(minutes, 60, 120)}`}
                    >
                      Boarding since {formatDuration(minutes)}
                    </em>
                  </article>
                );
              })
            ) : (
              <p>No boarding patients.</p>
            )}
          </div>
        </section>

        <section className="capacity-detail-panel__section">
          <div className="capacity-detail-panel__section-heading">
            <span>Discharge Pipeline</span>
            <small>{dischargePatients.length} ready</small>
          </div>
          <div className="capacity-detail-panel__list">
            {dischargePatients.length ? (
              dischargePatients.map((patient) => {
                const minutes = minutesSince(
                  latestStateTimestamp(patient, PatientState.Disposition),
                  now
                );
                return (
                  <article key={patient.id}>
                    <div>
                      <strong>{patientName(patient)}</strong>
                      <span
                        className={`capacity-duration capacity-duration--${durationTone(minutes, 30, 60)}`}
                      >
                        In Disposition {formatDuration(minutes)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          movePatientWithJourneyRules(patient.id, PatientState.Discharge, {
                            staffId: patient.assignedStaffId || 'capacity-panel',
                            note: 'Expedited from CapacityDetailPanel discharge pipeline.',
                          });
                        } catch {
                          // The capacity list only shows disposition patients; stale clicks can be ignored.
                        }
                      }}
                    >
                      Expedite Discharge
                    </button>
                  </article>
                );
              })
            ) : (
              <p>No discharge-ready patients.</p>
            )}
          </div>
        </section>

        <section className="capacity-detail-panel__section">
          <div className="capacity-detail-panel__section-heading">
            <span>Incoming Pressure</span>
            <small>{incomingNext30.length} arrivals in next 30m</small>
          </div>
          <div className="capacity-detail-panel__list">
            {incomingEMS.length ? (
              incomingEMS.map((arrival) => {
                const eta = minutesUntil(arrival.estimatedArrivalTime, now);
                return (
                  <article key={arrival.id}>
                    <div>
                      <strong>{arrival.unitName || arrival.unitId}</strong>
                      <span>{arrival.chiefComplaint}</span>
                    </div>
                    <em
                      className={`capacity-duration capacity-duration--${arrival.severity === 'Critical' ? 'critical' : 'normal'}`}
                    >
                      ETA {eta === null ? '--' : `${eta}m`} · {arrival.severity}
                    </em>
                  </article>
                );
              })
            ) : (
              <p>No inbound EMS arrivals.</p>
            )}
          </div>
        </section>

        <section className="capacity-detail-panel__section capacity-detail-panel__recommendations">
          <div className="capacity-detail-panel__section-heading">
            <span>Recommendations</span>
            <small>Generated on open</small>
          </div>
          {recommendations.map((recommendation) => (
            <p key={recommendation}>{recommendation}</p>
          ))}
        </section>

        <section className="capacity-detail-panel__section capacity-detail-panel__deductions">
          <div className="capacity-detail-panel__section-heading">
            <span>Score Deductions</span>
            <small>Updated {formatCapacityTimestamp(capacity.generatedAt)}</small>
          </div>
          {capacity.deductions.length ? (
            capacity.deductions.map((deduction) => (
              <article key={deduction.id}>
                <span>{deduction.label}</span>
                <strong>-{deduction.value}</strong>
              </article>
            ))
          ) : (
            <p>No active deductions. Capacity remains normal.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function StaffAvatar({ user, onClick, expanded, reminderCount = 0 }) {
  const initials = useMemo(() => {
    const name = user?.fullName || user?.name || user?.email || 'ED';
    return name
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [user]);

  return (
    <button
      type="button"
      className="ed-staff-avatar"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={user?.fullName || user?.name || 'Current staff member'}
    >
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" loading="lazy" /> : initials || 'ED'}
      {reminderCount > 0 ? <span className="ed-staff-avatar__badge">{reminderCount}</span> : null}
    </button>
  );
}

function ShiftControls({ activeShift, staff, clock, canManageShift, onStartShift, onEndShift }) {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [selectedStaffIds, setSelectedStaffIds] = useState(() => staff.map((member) => member.id));
  const isActive = activeShift?.status === 'Active';

  useEffect(() => {
    setSelectedStaffIds((current) => {
      if (current.length) return current;
      return staff.map((member) => member.id);
    });
  }, [staff]);

  const toggleStaff = (staffId) => {
    setSelectedStaffIds((current) =>
      current.includes(staffId) ? current.filter((id) => id !== staffId) : [...current, staffId]
    );
  };

  const submitStartShift = (event) => {
    event.preventDefault();
    onStartShift({
      startTime: new Date(startTime).toISOString(),
      staffIds: selectedStaffIds.length ? selectedStaffIds : staff.map((member) => member.id),
      chargeStaffId: selectedStaffIds[0] || staff[0]?.id,
    });
    setOpen(false);
  };

  return (
    <div className="ed-shift-control">
      <button
        type="button"
        className="ed-shift-control__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{formatShiftDuration(activeShift, clock)}</span>
        <strong>{isActive ? 'End Shift' : 'Start Shift'}</strong>
      </button>
      {open ? (
        <section className="ed-shift-control__panel" aria-label="Shift management">
          <header>
            <span>Shift Management</span>
            <strong>{canManageShift ? 'Admin' : 'View only'}</strong>
          </header>
          {!canManageShift ? (
            <p>Only Admin can start or end shifts. Current duration remains visible in the header.</p>
          ) : isActive ? (
            <>
              <p>
                Active since {new Date(activeShift.startTime).toLocaleString()} with{' '}
                {activeShift.staffIds.length} staff on duty.
              </p>
              <button
                type="button"
                className="ed-shift-control__danger"
                onClick={() => {
                  onEndShift(new Date().toISOString());
                  setOpen(false);
                }}
              >
                End Shift and Open Summary
              </button>
            </>
          ) : (
            <form onSubmit={submitStartShift}>
              <label>
                Start date and time
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </label>
              <fieldset>
                <legend>Staff on duty</legend>
                {staff.map((member) => (
                  <label key={member.id} className="ed-shift-control__staff-check">
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(member.id)}
                      onChange={() => toggleStaff(member.id)}
                    />
                    <span>{member.displayName || `${member.firstName} ${member.lastName}`}</span>
                  </label>
                ))}
              </fieldset>
              <button type="submit">Start Shift</button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}

function alertToneClass(severity) {
  return String(severity || 'Info').toLowerCase();
}

function AlertIcon({ alert }) {
  if (alert.severity === 'Critical') return <AlertTriangle size={18} aria-hidden />;
  if (alert.severity === 'Warning') return <Bell size={18} aria-hidden />;
  return <Info size={18} aria-hidden />;
}

function AlertDrawer({ open, alerts, onClose, onDismiss, onAction }) {
  if (!open) return null;

  return (
    <section className="ed-alert-drawer" aria-label="Alert center">
      <header className="ed-alert-drawer__header">
        <div>
          <span>Alert Center</span>
          <h2>{alerts.length} active alerts</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close alert center">
          <X size={18} aria-hidden />
        </button>
      </header>
      <div className="ed-alert-drawer__list">
        {alerts.length ? (
          alerts.map((alert) => (
            <article
              key={alert.id}
              className={`ed-alert-drawer__item ed-alert-drawer__item--${alertToneClass(alert.severity)}`}
            >
              <span className="ed-alert-drawer__icon">
                <AlertIcon alert={alert} />
              </span>
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
                <time>{formatCapacityTimestamp(alert.createdAt)}</time>
              </div>
              <div className="ed-alert-drawer__actions">
                {alert.patientId ? (
                  <button type="button" onClick={() => onAction(alert)}>
                    View Patient
                  </button>
                ) : alert.actionLabel ? (
                  <button type="button" onClick={() => onAction(alert)}>
                    {alert.actionLabel}
                  </button>
                ) : null}
                <button type="button" onClick={() => onDismiss(alert.id)}>
                  Dismiss
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="ed-alert-drawer__empty">No active alerts.</p>
        )}
      </div>
    </section>
  );
}

function AlertToastStack({ alerts, onDismiss, onAction, onSnoozeReminder }) {
  const [hiddenToastIds, setHiddenToastIds] = useState(() => new Set());
  const toastAlerts = useMemo(
    () => alerts.filter((alert) => !hiddenToastIds.has(alert.id)).slice(0, 3),
    [alerts, hiddenToastIds]
  );

  useEffect(() => {
    const timers = toastAlerts
      .filter((alert) => alert.severity !== 'Critical' && alert.autoDismissAfter != null)
      .map((alert) =>
        window.setTimeout(() => {
          setHiddenToastIds((current) => new Set(current).add(alert.id));
        }, alert.autoDismissAfter * 1000)
      );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toastAlerts]);

  if (!toastAlerts.length) return null;

  return (
    <div className="ed-alert-toast-stack" aria-live="assertive" aria-label="Alert toasts">
      {toastAlerts.map((alert) => (
        <article
          key={alert.id}
          className={`ed-alert-toast ed-alert-toast--${alertToneClass(alert.severity)}`}
        >
          <div>
            <strong>{alert.title}</strong>
            <p>{alert.message}</p>
          </div>
          <div>
            {alert.patientId ? (
              <button type="button" onClick={() => onAction(alert)}>
                {alert.actionType === 'REASSESSMENT_REMINDER' ? 'Go to Patient' : 'View Patient'}
              </button>
            ) : null}
            {alert.actionType === 'REASSESSMENT_REMINDER' && alert.patientId && alert.reminderId ? (
              <button
                type="button"
                onClick={() => {
                  onSnoozeReminder(alert.patientId, alert.reminderId, 10);
                  setHiddenToastIds((current) => new Set(current).add(alert.id));
                }}
              >
                Snooze 10min
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (alert.severity === 'Critical' || alert.actionType === 'REASSESSMENT_REMINDER') {
                  onDismiss(alert.id);
                  return;
                }
                setHiddenToastIds((current) => new Set(current).add(alert.id));
              }}
              aria-label="Acknowledge alert toast"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function CriticalVitalsBanner({ alert, audioEnabled, onDismiss, onAction }) {
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    setCanDismiss(false);
    if (!alert) return undefined;
    const timer = window.setTimeout(() => setCanDismiss(true), 5000);
    return () => window.clearTimeout(timer);
  }, [alert?.id]);

  useEffect(() => {
    if (!alert || !audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      window.setTimeout(() => {
        oscillator.stop();
        context.close();
      }, 420);
    } catch (_error) {
      // Audio can be blocked by browser autoplay policy; visual escalation still fires.
    }
  }, [alert, audioEnabled]);

  if (!alert) return null;

  return (
    <section className="ed-critical-vitals-banner" role="alert" aria-live="assertive">
      <div>
        <AlertTriangle size={34} aria-hidden />
        <div>
          <strong>{alert.title}</strong>
          <p>{alert.message}</p>
          {!canDismiss ? <span>Action required - acknowledgement unlocks in 5 seconds.</span> : null}
        </div>
      </div>
      <div className="ed-critical-vitals-banner__actions">
        <button type="button" onClick={() => onAction(alert)}>
          Go to Patient
        </button>
        <button type="button" disabled={!canDismiss} onClick={() => onDismiss(alert.id)}>
          {canDismiss ? 'Acknowledge' : 'Locked'}
        </button>
      </div>
    </section>
  );
}

function KeyboardShortcutReference({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="ed-shortcuts-modal" role="presentation" onMouseDown={onClose}>
      <section
        className="ed-shortcuts-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ed-shortcuts-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ed-shortcuts-modal__header">
          <div>
            <span>Keyboard control</span>
            <h2 id="ed-shortcuts-title">Shortcut Reference</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close shortcut reference">
            <X size={17} aria-hidden />
          </button>
        </header>
        <div className="ed-shortcuts-modal__groups">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className="ed-shortcuts-modal__group">
              <h3>{group.title}</h3>
              <dl>
                {group.shortcuts.map(([keys, label]) => (
                  <div key={`${group.title}-${keys}`}>
                    <dt>
                      {keys.split(' + ').map((key, index) => (
                        <React.Fragment key={`${keys}-${key}`}>
                          {index > 0 ? <span>+</span> : null}
                          <kbd>{key}</kbd>
                        </React.Fragment>
                      ))}
                    </dt>
                    <dd>{label}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

const AppShell = ({
  isAuthed = false,
  activeConversation,
  onNewConversation,
  isDevAuthBypass = false,
  devAuthBannerLabel = 'Platform Access',
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authToken } = useUser();
  const { messages, addMessage } = useConversation();
  const patients = useEmergencyStore((state) => state.patients);
  const activePatients = useEmergencyStore(selectActivePatients);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const loadBackendStaffProfile = useEmergencyStore((state) => state.loadBackendStaffProfile);
  const startShift = useEmergencyStore((state) => state.startShift);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const realtimeConnection = useEmergencyStore((state) => state.realtimeConnection);
  const startRealtime = useEmergencyStore((state) => state.startRealtime);
  const stopRealtime = useEmergencyStore((state) => state.stopRealtime);
  const capacity = useEmergencyStore((state) => state.capacity);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const activeAlerts = useEmergencyStore(selectActiveAlerts);
  const updateAlerts = useEmergencyStore((state) => state.updateAlerts);
  const dismissAlert = useEmergencyStore((state) => state.dismissAlert);
  const snoozeReassessmentReminder = useEmergencyStore((state) => state.snoozeReassessmentReminder);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const setWhiteboardSearchQuery = useEmergencyStore((state) => state.setWhiteboardSearchQuery);
  const searchBackendPatients = useEmergencyStore((state) => state.searchBackendPatients);
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
  const featureFlags = useFeatureStore((state) => state.flags);
  const featureOverrides = useFeatureStore((state) => state.overrides);
  const featureTier = useFeatureStore((state) => state.tier);
  const isFeatureEnabled = useFeatureStore((state) => state.isEnabled);
  const toggleFeature = useFeatureStore((state) => state.toggleFeature);
  const reassessmentCount = useEmergencyStore(selectReassessmentCount);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const activePatientCount = activePatients.length;
  const [clock, setClock] = useState(() => new Date());
  const isCopilotCollapsed = !copilotOpen;
  const [isReassessmentDrawerOpen, setIsReassessmentDrawerOpen] = useState(false);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [isStaffPanelOpen, setIsStaffPanelOpen] = useState(false);
  const [isCapacityDetailOpen, setIsCapacityDetailOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutReferenceOpen, setIsShortcutReferenceOpen] = useState(false);
  const [pediatricDrugPatientId, setPediatricDrugPatientId] = useState(null);
  const [isPediatricDrugCalculatorOpen, setIsPediatricDrugCalculatorOpen] = useState(false);
  const [sidebarMenu, setSidebarMenu] = useState(null);
  const longPressTimerRef = useRef(null);
  const suppressSidebarClickRef = useRef(false);
  const previousSidebarFeatureIdsRef = useRef(null);
  const [newSidebarFeatureIds, setNewSidebarFeatureIds] = useState(() => readSessionFeatureSet());
  const [isDemoSimulationActive, setIsDemoSimulationActive] = useState(
    () => isEmergencySimulationAvailable() && isEmergencySimulationRunning()
  );
  const routeNotice = location.state?.edNotice;
  const pediatricDrugPatient = useMemo(
    () =>
      pediatricDrugPatientId
        ? patients.find((patient) => patient.id === pediatricDrugPatientId) || null
        : selectedPatientId
          ? patients.find((patient) => patient.id === selectedPatientId) || null
          : null,
    [patients, pediatricDrugPatientId, selectedPatientId]
  );
  const sidebarItems = useMemo(
    () => buildSidebarItems(isFeatureEnabled),
    [featureFlags, featureOverrides, featureTier, isFeatureEnabled]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentIds = new Set(sidebarItems.map((item) => item.featureId));
    if (!previousSidebarFeatureIdsRef.current) {
      previousSidebarFeatureIdsRef.current = currentIds;
      return;
    }

    const sessionIds = readSessionFeatureSet();
    currentIds.forEach((featureId) => {
      if (!previousSidebarFeatureIdsRef.current.has(featureId) && !sessionIds.has(featureId)) {
        sessionIds.add(featureId);
      }
    });
    previousSidebarFeatureIdsRef.current = currentIds;
    setNewSidebarFeatureIds(sessionIds);
    writeSessionFeatureSet(sessionIds);
  }, [sidebarItems]);

  useEffect(() => {
    const closeSidebarMenu = () => setSidebarMenu(null);
    const closeSidebarMenuOnEscape = (event) => {
      if (event.key === 'Escape') setSidebarMenu(null);
    };
    window.addEventListener('click', closeSidebarMenu);
    window.addEventListener('keydown', closeSidebarMenuOnEscape);
    return () => {
      window.removeEventListener('click', closeSidebarMenu);
      window.removeEventListener('keydown', closeSidebarMenuOnEscape);
    };
  }, []);

  useEffect(() => {
    void loadBackendStaffProfile();
  }, [loadBackendStaffProfile]);

  useEffect(() => {
    startRealtime();
    return () => stopRealtime();
  }, [startRealtime, stopRealtime]);

  useEffect(() => {
    if (!isEmergencySimulationAvailable()) return undefined;

    const syncSimulationStatus = () => {
      setIsDemoSimulationActive(isEmergencySimulationRunning());
    };

    initializeEmergencySimulation();
    syncSimulationStatus();
    window.addEventListener(SIMULATION_STATUS_EVENT, syncSimulationStatus);
    return () => window.removeEventListener(SIMULATION_STATUS_EVENT, syncSimulationStatus);
  }, []);

  useEffect(() => {
    updateAlerts();
    const timer = window.setInterval(updateAlerts, 30_000);
    return () => window.clearInterval(timer);
  }, [updateAlerts]);

  const closeTopmostPanel = useCallback(() => {
    if (isPediatricDrugCalculatorOpen) {
      setIsPediatricDrugCalculatorOpen(false);
      return true;
    }
    if (isShortcutReferenceOpen) {
      setIsShortcutReferenceOpen(false);
      return true;
    }
    if (isCommandPaletteOpen) {
      setIsCommandPaletteOpen(false);
      return true;
    }
    if (isCapacityDetailOpen) {
      setIsCapacityDetailOpen(false);
      return true;
    }
    if (isAlertDrawerOpen) {
      setIsAlertDrawerOpen(false);
      return true;
    }
    if (isReassessmentDrawerOpen) {
      setIsReassessmentDrawerOpen(false);
      return true;
    }
    if (isStaffPanelOpen) {
      setIsStaffPanelOpen(false);
      return true;
    }
    if (selectedPatientId) {
      selectPatient(null);
      return true;
    }

    window.dispatchEvent(new CustomEvent('ed:close-overlays'));
    return false;
  }, [
    isAlertDrawerOpen,
    isCapacityDetailOpen,
    isCommandPaletteOpen,
    isPediatricDrugCalculatorOpen,
    isReassessmentDrawerOpen,
    isShortcutReferenceOpen,
    isStaffPanelOpen,
    selectPatient,
    selectedPatientId,
  ]);

  const openPediatricDrugCalculator = useCallback(
    (patientId = null) => {
      const targetPatientId = patientId || selectedPatientId || null;
      setPediatricDrugPatientId(targetPatientId);
      if (targetPatientId) selectPatient(targetPatientId);
      setIsPediatricDrugCalculatorOpen(true);
    },
    [selectPatient, selectedPatientId]
  );

  useEffect(() => {
    const handleGlobalShortcut = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeTopmostPanel();
        return;
      }

      const key = event.key.toLowerCase();
      const run = (callback) => {
        event.preventDefault();
        callback();
      };

      if (event.key === '/') {
        run(() => setIsCommandPaletteOpen(true));
        return;
      }

      if (isEditableShortcutTarget(event.target)) return;

      if (event.key === '?') {
        run(() => setIsShortcutReferenceOpen(true));
        return;
      }

      if (event.shiftKey && key === 's') {
        run(() => navigate('/emergency/analytics?view=shift'));
        return;
      }

      if (event.shiftKey && key === 'h') {
        run(() => navigate('/emergency/analytics?handoff=1'));
        return;
      }

      if (event.shiftKey && key === 'c') {
        run(() => setIsCapacityDetailOpen(true));
        return;
      }

      if (event.shiftKey && key === 'p') {
        run(() => openPediatricDrugCalculator());
        return;
      }

      if (event.shiftKey) return;

      if (key === 'n') {
        run(() => {
          navigate('/emergency/intake');
          window.setTimeout(() => window.dispatchEvent(new CustomEvent('ed:open-intake')), 50);
        });
        return;
      }

      if (key === 'c') {
        run(toggleCopilot);
        return;
      }

      if (key === 'e') {
        run(() => navigate('/emergency/ems'));
        return;
      }

      if (key === 'r') {
        run(() => {
          navigate('/emergency/reassessment');
          setIsReassessmentDrawerOpen(true);
        });
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, [closeTopmostPanel, navigate, openPediatricDrugCalculator, toggleCopilot]);

  const handleAppendMessage = useCallback(
    (_conversationId, message) => {
      addMessage(message);
    },
    [addMessage]
  );

  const closeReassessmentDrawer = useCallback(() => {
    setIsReassessmentDrawerOpen(false);
  }, []);

  const activeNavId = useMemo(
    () => sidebarItems.find((item) => isNavItemActive(item, location.pathname))?.id,
    [location.pathname, sidebarItems]
  );
  const emsPressure = useMemo(
    () => calculateEMSPressureScore(emsArrivals, clock),
    [emsArrivals, clock]
  );
  const shouldFlashEMSNav = isEMSPressureElevated(emsPressure);
  const staffWorkloads = useMemo(
    () => buildStaffWorkloads(staff, patients, activeShift),
    [activeShift, patients, staff]
  );
  const emergencyRole = emergencyRoleForUser(user);
  const emergencyPermissions = emergencyPermissionsForUser(user);
  const currentStaffProfile = useMemo(
    () =>
      staff.find((member) => member.email && member.email === user?.email) ||
      staff.find((member) => user?.id && member.id.includes(user.id)) ||
      null,
    [staff, user]
  );
  const headerUser = useMemo(
    () => ({
      ...user,
      fullName: currentStaffProfile?.displayName || user?.fullName || user?.name,
      name: currentStaffProfile?.displayName || user?.name,
      avatarUrl: currentStaffProfile?.avatarUrl || user?.avatarUrl,
      roleLabel: currentStaffProfile?.roleLabel || emergencyRole,
    }),
    [currentStaffProfile, emergencyRole, user]
  );
  const currentStaffReminderCount = useMemo(
    () => pendingReminderCountForStaff(patients, currentStaffProfile?.id),
    [currentStaffProfile?.id, patients]
  );
  const isChargeNurseProfile = /charge\s*nurse|chargenurse/i.test(
    String(currentStaffProfile?.role || currentStaffProfile?.roleLabel || user?.role || '')
  );
  useEffect(() => {
    if (!isChargeNurseProfile || location.pathname !== '/emergency/whiteboard') return;
    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem(CHARGE_NURSE_PULSE_DEFAULT_KEY) === 'true') return;
      sessionStorage.setItem(CHARGE_NURSE_PULSE_DEFAULT_KEY, 'true');
    }
    navigate('/emergency/analytics', { replace: true });
  }, [isChargeNurseProfile, location.pathname, navigate]);
  const staffRebalanceSuggestion = useMemo(
    () => getStaffRebalanceSuggestion(staffWorkloads),
    [staffWorkloads]
  );
  const hasCriticalAlert = activeAlerts.some((alert) => alert.severity === 'Critical');
  const hasWarningAlert = activeAlerts.some((alert) => alert.severity === 'Warning');
  const criticalVitalsAlert = activeAlerts.find((alert) => alert.actionType === 'VITALS_CRITICAL');
  const vitalsAudioEnabled = Boolean(emergencySettings.alertRules?.VitalsAudio?.enabled);
  const handleAlertAction = useCallback(
    (alert) => {
      if (typeof alert.actionFn === 'function') {
        alert.actionFn();
        setIsAlertDrawerOpen(false);
        return;
      }

      if (alert.actionType === 'OPEN_REFERRALS') {
        const search = alert.patientId
          ? `?patientId=${encodeURIComponent(alert.patientId)}`
          : '';
        navigate(`/emergency/referrals${search}`);
        setIsAlertDrawerOpen(false);
        return;
      }

      if (alert.patientId) {
        selectPatient(alert.patientId);
        setIsAlertDrawerOpen(false);
        return;
      }

      if (alert.actionType === 'OPEN_CAPACITY') {
        setIsCapacityDetailOpen(true);
        setIsAlertDrawerOpen(false);
        return;
      }

      if (alert.actionType === 'OPEN_EMS') {
        navigate('/emergency/ems');
        setIsAlertDrawerOpen(false);
        return;
      }

      if (alert.actionType === 'OPEN_QUEUE') {
        navigate('/emergency/queues');
        setIsAlertDrawerOpen(false);
      }
    },
    [navigate, selectPatient]
  );

  const handleEndShift = useCallback(
    () => {
      navigate('/emergency/analytics?handoff=1');
    },
    [navigate]
  );

  const patientForCommand = useCallback(
    (patientId) => {
      if (patientId) return patients.find((patient) => patient.id === patientId) || null;
      if (selectedPatientId) {
        return patients.find((patient) => patient.id === selectedPatientId) || null;
      }
      return (
        patients.find((patient) => ACTIVE_PATIENT_STATES.has(patient.state)) || patients[0] || null
      );
    },
    [patients, selectedPatientId]
  );

  const findPatientByValue = useCallback(
    (value) => {
      const query = String(value || '')
        .trim()
        .toLowerCase();
      if (!query) return null;
      return (
        patients.find(
          (patient) => `${patient.firstName} ${patient.lastName}`.toLowerCase() === query
        ) ||
        patients.find((patient) =>
          `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(query)
        ) ||
        patients.find((patient) => patient.mrn.toLowerCase().includes(query)) ||
        null
      );
    },
    [patients]
  );

  const executeCommand = useCallback(
    async (command) => {
      if (!command?.type) return;

      if (command.type === 'OPEN_INTAKE') {
        navigate('/emergency/intake');
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('ed:open-intake')), 50);
      }

      if (command.type === 'FIND_PATIENT') {
        let patient = command.patientId
          ? patientForCommand(command.patientId)
          : findPatientByValue(command.value);
        if (!patient && command.value) {
          const backendSearch = await searchBackendPatients(command.value);
          const firstMatchedPatientId = backendSearch.results?.[0]?.patientId;
          patient = firstMatchedPatientId ? patientForCommand(firstMatchedPatientId) : null;
        }
        setQueueFilter(null);
        setWhiteboardSearchQuery(command.value || '');
        if (patient?.id) selectPatient(patient.id);
        navigate('/emergency/patients');
      }

      if (command.type === 'OPEN_ROUTE') {
        navigate(command.path);
      }

      if (command.type === 'OPEN_REFERRAL') {
        const patient = command.patientId
          ? patientForCommand(command.patientId)
          : findPatientByValue(command.value);
        const params = patient?.id
          ? `?patientId=${encodeURIComponent(patient.id)}&new=1`
          : command.value
            ? `?patientSearch=${encodeURIComponent(command.value)}&new=1`
            : '?new=1';
        navigate(`/emergency/referrals${params}`);
      }

      if (command.type === 'OPEN_CALCULATOR') {
        if (command.calculatorId === 'pediatric-dose-safety-checker') {
          const patient = command.patientId
            ? patientForCommand(command.patientId)
            : selectedPatientId
              ? patientForCommand(selectedPatientId)
              : null;
          openPediatricDrugCalculator(patient?.id || null);
          setIsCommandPaletteOpen(false);
          return;
        }
        const patient = command.patientId
          ? patientForCommand(command.patientId)
          : selectedPatientId
            ? patientForCommand(selectedPatientId)
            : null;
        if (patient?.id) selectPatient(patient.id);
        const params = new URLSearchParams();
        if (command.calculatorId) params.set('tool', command.calculatorId);
        if (patient?.id) params.set('patientId', patient.id);
        navigate(`/emergency/tools${params.toString() ? `?${params.toString()}` : ''}`);
      }

      if (command.type === 'OPEN_PEDIATRIC_DRUGS') {
        const patient = command.patientId
          ? patientForCommand(command.patientId)
          : selectedPatientId
            ? patientForCommand(selectedPatientId)
            : null;
        openPediatricDrugCalculator(patient?.id || null);
      }

      if (command.type === 'OPEN_CAPACITY') {
        setIsCapacityDetailOpen(true);
      }

      if (command.type === 'OPEN_REASSESSMENT_QUEUE') {
        navigate('/emergency/reassessment');
        setIsReassessmentDrawerOpen(true);
      }

      if (command.type === 'CLEAR_FILTERS') {
        setQueueFilter(null);
        setWhiteboardSearchQuery('');
        navigate('/emergency/whiteboard');
      }

      if (command.type === 'VIEW_PATIENT') {
        if (command.patientId) selectPatient(command.patientId);
        navigate('/emergency/patients');
      }

      setIsCommandPaletteOpen(false);
    },
    [
      navigate,
      findPatientByValue,
      openPediatricDrugCalculator,
      patientForCommand,
      selectPatient,
      selectedPatientId,
      setQueueFilter,
      setWhiteboardSearchQuery,
      searchBackendPatients,
    ]
  );

  useEffect(() => {
    const handlePediatricDrugLaunch = (event) => {
      openPediatricDrugCalculator(event.detail?.patientId || event.detail?.target || null);
    };
    window.addEventListener('ed:open-pediatric-drug-calculator', handlePediatricDrugLaunch);
    return () =>
      window.removeEventListener('ed:open-pediatric-drug-calculator', handlePediatricDrugLaunch);
  }, [openPediatricDrugCalculator]);

  useEffect(() => {
    const handleCalculatorLaunch = (event) => {
      const calculatorId =
        event.detail?.calculatorId || event.detail?.toolId || event.detail?.value || '';
      if (!calculatorId) return;
      if (calculatorId === 'pediatric-dose-safety-checker') {
        openPediatricDrugCalculator(event.detail?.patientId || event.detail?.target || null);
        return;
      }
      const requestedPatientId = event.detail?.patientId || event.detail?.target || null;
      const patient = requestedPatientId
        ? patientForCommand(requestedPatientId)
        : selectedPatientId
          ? patientForCommand(selectedPatientId)
          : null;
      if (patient?.id) selectPatient(patient.id);
      const params = new URLSearchParams();
      params.set('tool', calculatorId);
      if (patient?.id) params.set('patientId', patient.id);
      navigate(`/emergency/tools?${params.toString()}`);
    };

    window.addEventListener('ed:open-calculator', handleCalculatorLaunch);
    return () => window.removeEventListener('ed:open-calculator', handleCalculatorLaunch);
  }, [navigate, openPediatricDrugCalculator, patientForCommand, selectPatient, selectedPatientId]);

  useEffect(() => {
    const handleClinicalToolsLaunch = (event) => {
      const search = event.detail?.search ? `?${event.detail.search}` : '';
      navigate(`/emergency/tools${search}`, {
        state: { pendingPatient: event.detail?.pendingPatient || null },
      });
    };

    window.addEventListener('ed:open-clinical-tools', handleClinicalToolsLaunch);
    return () => window.removeEventListener('ed:open-clinical-tools', handleClinicalToolsLaunch);
  }, [navigate]);

  const clearSidebarLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openSidebarMenu = useCallback((event, item) => {
    event.preventDefault();
    event.stopPropagation();
    clearSidebarLongPress();
    setSidebarMenu({
      item,
      x: Math.min(event.clientX || 64, window.innerWidth - 220),
      y: Math.min(event.clientY || 72, window.innerHeight - 132),
    });
  }, [clearSidebarLongPress]);

  const handleSidebarPointerDown = useCallback(
    (event, item) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      const clientX = event.clientX || 64;
      const clientY = event.clientY || 72;
      clearSidebarLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        suppressSidebarClickRef.current = true;
        setSidebarMenu({
          item,
          x: Math.min(clientX, window.innerWidth - 220),
          y: Math.min(clientY, window.innerHeight - 132),
        });
      }, 520);
    },
    [clearSidebarLongPress]
  );

  const handleSidebarPointerEnd = useCallback(() => {
    clearSidebarLongPress();
    window.setTimeout(() => {
      suppressSidebarClickRef.current = false;
    }, 0);
  }, [clearSidebarLongPress]);

  const handleSidebarClick = useCallback((event) => {
    if (!suppressSidebarClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDisableSidebarFeature = useCallback(async () => {
    if (!sidebarMenu?.item || sidebarMenu.item.tier === 'core') return;
    const item = sidebarMenu.item;
    setSidebarMenu(null);
    try {
      await toggleFeature(item.featureId, false);
    } catch (_error) {
      // toggleFeature reverts failed optimistic updates; keep the rail stable.
    }
  }, [sidebarMenu, toggleFeature]);

  const handleOpenFeatureSettings = useCallback(() => {
    if (!sidebarMenu?.item) return;
    const featureId = sidebarMenu.item.featureId;
    setSidebarMenu(null);
    navigate(`/settings/features#feature-${featureId}`);
  }, [navigate, sidebarMenu]);

  return (
    <div
      className={[
        'ed-os-shell',
        isAuthed ? 'ed-os-shell--authed' : '',
        isCopilotCollapsed ? 'ed-os-shell--copilot-collapsed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isAuthed && (
        <a className="ed-skip-link" href="#main-content">
          Skip to main content
        </a>
      )}

      <aside className="ed-nav-rail" aria-label="Emergency OS navigation">
        <nav className="ed-nav-rail__items">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeNavId;
            const isNew = newSidebarFeatureIds.has(item.featureId);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={[
                  'ed-nav-rail__item',
                  'ed-nav-rail__item--appearing',
                  isActive ? 'ed-nav-rail__item--active' : '',
                  isNew ? 'ed-nav-rail__item--new' : '',
                  item.featureId === 'ems_pipeline' && shouldFlashEMSNav ? 'ed-nav-rail__item--flash' : '',
                  item.featureId === 'ems_pipeline' && shouldFlashEMSNav
                    ? `ed-nav-rail__item--flash-${emsPressure.band.id}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={isNew ? `${item.label}. New.` : item.label}
                aria-current={isActive ? 'page' : undefined}
                title={isNew ? `${item.label} - New` : item.label}
                onClick={handleSidebarClick}
                onContextMenu={(event) => openSidebarMenu(event, item)}
                onPointerDown={(event) => handleSidebarPointerDown(event, item)}
                onPointerUp={handleSidebarPointerEnd}
                onPointerCancel={handleSidebarPointerEnd}
                onPointerLeave={handleSidebarPointerEnd}
              >
                <Icon size={21} strokeWidth={2.1} aria-hidden />
                {isNew ? <span className="ed-nav-rail__new-dot" aria-hidden /> : null}
              </Link>
            );
          })}
          <button
            type="button"
            className="ed-nav-rail__item ed-nav-rail__item--button"
            aria-label="Pediatric drug calculator"
            title="Pediatric drug calculator"
            onClick={() => openPediatricDrugCalculator()}
          >
            <Baby size={21} strokeWidth={2.1} aria-hidden />
          </button>
        </nav>
        {sidebarMenu ? (
          <div
            className="ed-nav-context-menu"
            style={{ left: sidebarMenu.x, top: sidebarMenu.y }}
            role="menu"
            aria-label={`${sidebarMenu.item.label} feature shortcuts`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              disabled={sidebarMenu.item.tier === 'core'}
              onClick={handleDisableSidebarFeature}
            >
              Disable {sidebarMenu.item.label}
            </button>
            <button type="button" role="menuitem" onClick={handleOpenFeatureSettings}>
              Feature Settings
            </button>
          </div>
        ) : null}
      </aside>

      <div className="ed-os-shell__workspace">
        <header className="ed-os-header" aria-label="Emergency OS header">
          <div className="ed-os-header__left">
            <button
              type="button"
              className="ed-os-wordmark"
              onClick={() => navigate('/emergency/whiteboard')}
              aria-label="Go to Emergency Whiteboard"
            >
              CareDroid Emergency OS
            </button>
            <button
              type="button"
              className="ed-shift-clock"
              onClick={() => navigate('/emergency/analytics?view=shift')}
              aria-label={`Open shift summary. Current time ${formatShiftClock(clock)}`}
            >
              <time dateTime={clock.toISOString()}>{formatShiftClock(clock)}</time>
            </button>
            <ShiftControls
              activeShift={activeShift}
              staff={staff}
              clock={clock}
              canManageShift={emergencyPermissions.canManageShift}
              onStartShift={startShift}
              onEndShift={handleEndShift}
            />
            <RealtimeConnectionIndicator connection={realtimeConnection} />
            {isDemoSimulationActive ? (
              <span className="ed-demo-badge" title="Development demo simulation is running">
                DEMO
              </span>
            ) : null}
          </div>

          <div className="ed-os-header__center">
            <CapacityBadge
              expanded={isCapacityDetailOpen}
              onClick={() => setIsCapacityDetailOpen((open) => !open)}
            />
            <EMSCriticalCountdownBadge />
          </div>

          <div className="ed-os-header__right">
            <ReassessmentBadge
              count={reassessmentCount}
              expanded={isReassessmentDrawerOpen}
              onClick={() => setIsReassessmentDrawerOpen((open) => !open)}
            />
            <div className="ed-alert-menu">
              <button
                type="button"
                className={[
                  'ed-icon-button',
                  hasCriticalAlert ? 'ed-icon-button--critical' : '',
                  hasWarningAlert && !hasCriticalAlert ? 'ed-icon-button--warning' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`${activeAlerts.length} unread alerts`}
                aria-expanded={isAlertDrawerOpen}
                onClick={() => setIsAlertDrawerOpen((open) => !open)}
              >
                <Bell size={18} strokeWidth={2.1} aria-hidden />
                {activeAlerts.length ? (
                  <span className="ed-icon-button__count">{activeAlerts.length}</span>
                ) : (
                  <span className="ed-icon-button__indicator" aria-hidden />
                )}
              </button>
            </div>
            <div className="ed-staff-menu">
              <StaffAvatar
                user={headerUser}
                expanded={isStaffPanelOpen}
                reminderCount={currentStaffReminderCount}
                onClick={() => setIsStaffPanelOpen((open) => !open)}
              />
              <WorkloadBalancePanel
                open={isStaffPanelOpen}
                activeShift={activeShift}
                workloads={staffWorkloads}
                rebalanceSuggestion={staffRebalanceSuggestion}
                currentStaffProfile={currentStaffProfile}
                onAssignStaff={assignStaff}
                onClose={() => setIsStaffPanelOpen(false)}
              />
            </div>
          </div>
        </header>

        <AlertDrawer
          open={isAlertDrawerOpen}
          alerts={activeAlerts}
          onClose={() => setIsAlertDrawerOpen(false)}
          onDismiss={dismissAlert}
          onAction={handleAlertAction}
        />
        <AlertToastStack
          alerts={activeAlerts}
          onDismiss={dismissAlert}
          onAction={handleAlertAction}
          onSnoozeReminder={snoozeReassessmentReminder}
        />
        <CriticalVitalsBanner
          alert={criticalVitalsAlert}
          audioEnabled={vitalsAudioEnabled}
          onDismiss={dismissAlert}
          onAction={handleAlertAction}
        />
        <EMSCriticalBroadcast />
        <CommandPalette
          open={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onExecute={executeCommand}
        />
        <PediatricDrugCalculator
          open={isPediatricDrugCalculatorOpen}
          patient={pediatricDrugPatient}
          onClose={() => setIsPediatricDrugCalculatorOpen(false)}
        />
        <KeyboardShortcutReference
          open={isShortcutReferenceOpen}
          onClose={() => setIsShortcutReferenceOpen(false)}
        />

        <ReassessmentDrawer
          open={isReassessmentDrawerOpen}
          count={reassessmentCount}
          onClose={closeReassessmentDrawer}
        />

        <CapacityDetailPanel
          open={isCapacityDetailOpen}
          onClose={() => setIsCapacityDetailOpen(false)}
        />

        <div className="ed-os-shell__body">
          <main
            className="ed-os-main"
            data-layout-role="MainContent"
            id="main-content"
            tabIndex={-1}
          >
            {isAuthed && isDevAuthBypass && (
              <div className="ed-os-banner" role="status">
                <strong>{devAuthBannerLabel}</strong> active
              </div>
            )}
            {routeNotice && (
              <div className="ed-os-banner ed-os-banner--route-notice" role="status">
                <strong>{routeNotice.title}</strong>
                {routeNotice.message ? <span>{routeNotice.message}</span> : null}
              </div>
            )}
            {children}
          </main>

          <aside
            className="ed-copilot-panel"
            aria-label="ED Copilot chat"
            aria-expanded={!isCopilotCollapsed}
          >
            <button
              type="button"
              className="ed-copilot-panel__toggle"
              onClick={toggleCopilot}
              aria-label={isCopilotCollapsed ? 'Expand ED Copilot' : 'Collapse ED Copilot'}
              aria-expanded={!isCopilotCollapsed}
            >
              {isCopilotCollapsed ? (
                <Bot size={18} strokeWidth={2.2} aria-hidden />
              ) : (
                <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
              )}
            </button>

            <div className="ed-copilot-panel__content" aria-hidden={isCopilotCollapsed}>
              <div className="ed-copilot-panel__header">
                <div className="ed-copilot-panel__heading">
                  <div className="ed-copilot-panel__title-row">
                    <span className="ed-copilot-panel__live-dot" aria-hidden />
                    <strong>ED Copilot</strong>
                    <span>Live</span>
                  </div>
                  <div className="ed-copilot-panel__snapshot" aria-label="Department snapshot">
                    <span>{activePatientCount} patients</span>
                    <span>{capacity.score} capacity</span>
                    <span>{reassessmentCount} reassessments</span>
                  </div>
                </div>
                <div className="ed-copilot-panel__actions">
                  <button
                    type="button"
                    onClick={onNewConversation}
                    className="ed-copilot-panel__new"
                  >
                    New
                  </button>
                  <button
                    type="button"
                    className="ed-copilot-panel__minimize"
                    onClick={() => setCopilotOpen(false)}
                    aria-label="Minimize ED Copilot"
                  >
                    <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
                  </button>
                </div>
              </div>
              <ChatInterface
                conversationId={activeConversation}
                messages={messages}
                onAppendMessage={handleAppendMessage}
                authToken={authToken}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
