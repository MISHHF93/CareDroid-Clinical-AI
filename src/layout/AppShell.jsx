import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Bot,
  ChevronRight,
  ClipboardList,
  Gauge,
  Info,
  LayoutDashboard,
  Settings,
  Share2,
  Truck,
  X,
} from 'lucide-react';
import ChatInterface from '../components/ChatInterface';
import CommandPalette from '../components/CommandPalette';
import { calculateEMSPressureScore, isEMSPressureElevated } from '../components/EMSPressureScore';
import ReassessmentDrawer from '../components/ReassessmentDrawer';
import { useConversation } from '../contexts/ConversationContext';
import { useUser } from '../contexts/UserContext';
import { hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import { PatientState } from '../../types/emergency';
import { buildStaffWorkloads, getStaffRebalanceSuggestion } from '../utils/staffManagement';
import './AppShell.css';

const NAV_ITEMS = [
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    path: '/emergency',
    icon: LayoutDashboard,
    activePaths: ['/emergency', '/workspace/emergency', '/workspace/emergency/whiteboard'],
  },
  {
    id: 'queue',
    label: 'Queue',
    path: '/emergency/queues',
    icon: ClipboardList,
    activePaths: [
      '/emergency/queues',
      '/workspace/emergency/queues',
      '/workspace/emergency/waiting-room',
    ],
  },
  {
    id: 'ems',
    label: 'EMS',
    path: '/emergency/ems',
    icon: Truck,
    activePaths: ['/emergency/ems', '/workspace/emergency/ems', '/workspace/emergency/pre-arrival'],
  },
  {
    id: 'referrals',
    label: 'Referrals',
    path: '/emergency/referrals',
    icon: Share2,
    activePaths: ['/emergency/referrals', '/workspace/emergency/referrals'],
  },
  {
    id: 'capacity',
    label: 'Capacity',
    path: '/emergency/capacity',
    icon: Gauge,
    activePaths: [
      '/emergency/capacity',
      '/workspace/emergency/capacity',
      '/workspace/emergency/boarding',
    ],
  },
  {
    id: 'copilot',
    label: 'Copilot',
    path: '/emergency/copilot',
    icon: Bot,
    activePaths: ['/emergency/copilot', '/workspace/emergency/copilot', '/assistant', '/chat'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    activePaths: ['/settings', '/workspace/emergency/settings', '/profile/settings'],
  },
];

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
      ['Shift + S', 'Open shift summary'],
      ['Shift + C', 'Open capacity detail'],
      ['?', 'Open shortcut reference'],
    ],
  },
  {
    title: 'Whiteboard',
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
    if (activePath === '/emergency' || activePath === '/workspace/emergency') {
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

function CapacityDetailPanel({ open, onClose }) {
  const capacity = useEmergencyStore((state) => state.capacity);
  const patients = useEmergencyStore((state) => state.patients);
  const rooms = useEmergencyStore((state) => state.rooms);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const dischargePatient = useEmergencyStore((state) => state.dischargePatient);
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
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

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
                    <button type="button" onClick={() => dischargePatient(patient.id)}>
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

function StaffAvatar({ user, onClick, expanded }) {
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
      {initials || 'ED'}
    </button>
  );
}

function StaffManagementPanel({ open, workloads, rebalanceSuggestion }) {
  if (!open) return null;

  return (
    <section className="ed-staff-panel" aria-label="On-shift staff">
      <header>
        <span>Staff Management</span>
        <strong>{workloads.length} on shift</strong>
      </header>

      {rebalanceSuggestion ? (
        <div className="ed-staff-panel__rebalance" role="status">
          {rebalanceSuggestion.message}
        </div>
      ) : null}

      <div className="ed-staff-panel__list">
        {workloads.map((member) => (
          <article key={member.id} className="ed-staff-panel__row">
            <span className="ed-staff-panel__avatar">{member.initials}</span>
            <div className="ed-staff-panel__identity">
              <strong>{member.displayName}</strong>
              <span>{member.roleLabel}</span>
            </div>
            <strong className="ed-staff-panel__count">{member.assignedCount}</strong>
            <div
              className={`ed-staff-panel__bar ed-staff-panel__bar--${member.workloadTone}`}
              aria-label={`${member.assignedCount} assigned patients`}
            >
              <span style={{ width: `${Math.max(8, member.workloadPercent)}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function isAlertActive(alert, now) {
  if (alert.dismissedAt) return false;
  if (!alert.autoDismissAfter) return true;
  const createdAt = new Date(alert.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return true;
  return now.getTime() - createdAt < alert.autoDismissAfter * 1000;
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

function CriticalAlertToast({ alerts, onDismiss, onAction }) {
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'Critical').slice(0, 3);
  if (!criticalAlerts.length) return null;

  return (
    <div className="ed-alert-toast-stack" aria-live="assertive" aria-label="Critical alert toasts">
      {criticalAlerts.map((alert) => (
        <article key={alert.id} className="ed-alert-toast">
          <div>
            <strong>{alert.title}</strong>
            <p>{alert.message}</p>
          </div>
          <div>
            {alert.patientId ? (
              <button type="button" onClick={() => onAction(alert)}>
                View Patient
              </button>
            ) : null}
            <button type="button" onClick={() => onDismiss(alert.id)} aria-label="Dismiss alert">
              <X size={14} aria-hidden />
            </button>
          </div>
        </article>
      ))}
    </div>
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
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const capacity = useEmergencyStore((state) => state.capacity);
  const alerts = useEmergencyStore((state) => state.alerts);
  const updateAlerts = useEmergencyStore((state) => state.updateAlerts);
  const dismissAlert = useEmergencyStore((state) => state.dismissAlert);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const setWhiteboardSearchQuery = useEmergencyStore((state) => state.setWhiteboardSearchQuery);
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
  const reassessmentCount = useEmergencyStore(
    (state) =>
      state.patients.filter(
        (patient) =>
          ACTIVE_PATIENT_STATES.has(patient.state) && hasPatientFlag(patient, 'ReassessmentDue')
      ).length
  );
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const activePatientCount = useMemo(
    () => patients.filter((patient) => ACTIVE_PATIENT_STATES.has(patient.state)).length,
    [patients]
  );
  const [clock, setClock] = useState(() => new Date());
  const isCopilotCollapsed = !copilotOpen;
  const [isReassessmentDrawerOpen, setIsReassessmentDrawerOpen] = useState(false);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [isStaffPanelOpen, setIsStaffPanelOpen] = useState(false);
  const [isCapacityDetailOpen, setIsCapacityDetailOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutReferenceOpen, setIsShortcutReferenceOpen] = useState(false);
  const routeNotice = location.state?.edNotice;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    updateAlerts();
    const timer = window.setInterval(updateAlerts, 30_000);
    return () => window.clearInterval(timer);
  }, [updateAlerts]);

  const closeAllPanels = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setIsShortcutReferenceOpen(false);
    setIsReassessmentDrawerOpen(false);
    setIsAlertDrawerOpen(false);
    setIsStaffPanelOpen(false);
    setIsCapacityDetailOpen(false);
    selectPatient(null);
    window.dispatchEvent(new CustomEvent('ed:close-overlays'));
  }, [selectPatient]);

  useEffect(() => {
    const handleGlobalShortcut = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeAllPanels();
        return;
      }

      if (isEditableShortcutTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const run = (callback) => {
        event.preventDefault();
        callback();
      };

      if (event.key === '/') {
        run(() => setIsCommandPaletteOpen(true));
        return;
      }

      if (event.key === '?') {
        run(() => setIsShortcutReferenceOpen(true));
        return;
      }

      if (event.shiftKey && key === 's') {
        run(() => navigate('/emergency/shift'));
        return;
      }

      if (event.shiftKey && key === 'c') {
        run(() => setIsCapacityDetailOpen(true));
        return;
      }

      if (event.shiftKey) return;

      if (key === 'n') {
        run(() => {
          navigate('/emergency');
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
        run(() => setIsReassessmentDrawerOpen(true));
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, [closeAllPanels, navigate, toggleCopilot]);

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
    () => NAV_ITEMS.find((item) => isNavItemActive(item, location.pathname))?.id,
    [location.pathname]
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
  const staffRebalanceSuggestion = useMemo(
    () => getStaffRebalanceSuggestion(staffWorkloads),
    [staffWorkloads]
  );
  const activeAlerts = useMemo(
    () => alerts.filter((alert) => isAlertActive(alert, clock)),
    [alerts, clock]
  );
  const hasCriticalAlert = activeAlerts.some((alert) => alert.severity === 'Critical');
  const hasWarningAlert = activeAlerts.some((alert) => alert.severity === 'Warning');
  const handleAlertAction = useCallback(
    (alert) => {
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
    (command) => {
      if (!command?.type) return;

      if (command.type === 'OPEN_INTAKE') {
        navigate('/emergency');
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('ed:open-intake')), 50);
      }

      if (command.type === 'FIND_PATIENT') {
        const patient = command.patientId
          ? patientForCommand(command.patientId)
          : findPatientByValue(command.value);
        setQueueFilter(null);
        setWhiteboardSearchQuery(command.value || '');
        if (patient?.id) selectPatient(patient.id);
        navigate('/emergency');
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
        const patient = patientForCommand(command.patientId);
        navigate('/emergency');
        if (patient?.id) selectPatient(patient.id);
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('ed:open-calculator', {
              detail: {
                calculatorId: command.calculatorId,
                patientId: patient?.id || null,
              },
            })
          );
        }, 50);
      }

      if (command.type === 'OPEN_CAPACITY') {
        setIsCapacityDetailOpen(true);
      }

      if (command.type === 'CLEAR_FILTERS') {
        setQueueFilter(null);
        setWhiteboardSearchQuery('');
        navigate('/emergency');
      }

      if (command.type === 'VIEW_PATIENT') {
        if (command.patientId) selectPatient(command.patientId);
        navigate('/emergency');
      }

      setIsCommandPaletteOpen(false);
    },
    [
      navigate,
      findPatientByValue,
      patientForCommand,
      selectPatient,
      setQueueFilter,
      setWhiteboardSearchQuery,
    ]
  );

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
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeNavId;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={[
                  'ed-nav-rail__item',
                  isActive ? 'ed-nav-rail__item--active' : '',
                  item.id === 'ems' && shouldFlashEMSNav ? 'ed-nav-rail__item--flash' : '',
                  item.id === 'ems' && shouldFlashEMSNav
                    ? `ed-nav-rail__item--flash-${emsPressure.band.id}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <Icon size={21} strokeWidth={2.1} aria-hidden />
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="ed-os-shell__workspace">
        <header className="ed-os-header" aria-label="Emergency OS header">
          <div className="ed-os-header__left">
            <strong className="ed-os-wordmark">Emergency OS</strong>
            <time className="ed-shift-clock" dateTime={clock.toISOString()}>
              {formatShiftClock(clock)}
            </time>
          </div>

          <div className="ed-os-header__center">
            <CapacityBadge
              expanded={isCapacityDetailOpen}
              onClick={() => setIsCapacityDetailOpen((open) => !open)}
            />
          </div>

          <div className="ed-os-header__right">
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
                user={user}
                expanded={isStaffPanelOpen}
                onClick={() => setIsStaffPanelOpen((open) => !open)}
              />
              <StaffManagementPanel
                open={isStaffPanelOpen}
                workloads={staffWorkloads}
                rebalanceSuggestion={staffRebalanceSuggestion}
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
        <CriticalAlertToast
          alerts={activeAlerts}
          onDismiss={dismissAlert}
          onAction={handleAlertAction}
        />
        <CommandPalette
          open={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onExecute={executeCommand}
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
