import React, { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Bed,
  Clock3,
  DoorOpen,
  FilePlus2,
  ShieldAlert,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { PatientState, Priority } from '../../types/emergency';
import { getPatientFlagType, hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import { buildStaffWorkloads, staffDisplayName, staffInitials } from '../utils/staffManagement';
import {
  getNextStates,
  movePatientToState as movePatientWithJourneyRules,
} from '../../engine/journeyEngine';
import JourneyTimeline from './JourneyTimeline';
import FeatureGate from './FeatureGate';
import { useUser } from '../contexts/UserContext';
import ClinicalScoreCalculator, {
  createClinicalScoreEvent,
  createClinicalScoreNote,
} from './ClinicalScoreCalculator';
import ProtocolSuggestion, {
  createProtocolLaunchEvent,
  getProtocolSuggestions,
} from './ProtocolSuggestion';
import { formatScoreAge, getRecentSavedScores, getSavedScores } from '../utils/clinicalScoreEvents';
import {
  emergencyPermissionsForUser,
  emergencyRoleForUser,
} from '../utils/emergencyRolePermissions';
import './PatientCard.css';

const FLAG_ICONS = {
  ReassessmentDue: Clock3,
  DeteriorationRisk: Activity,
  LongWait: Clock3,
  HighRisk: ShieldAlert,
  PendingAdmission: Bed,
  EMSArrival: Ambulance,
  Isolation: AlertTriangle,
  ScoreReassessmentRecommended: Clock3,
};

const ALL_FLAGS = [
  'ReassessmentDue',
  'DeteriorationRisk',
  'LongWait',
  'HighRisk',
  'PendingAdmission',
  'EMSArrival',
  'Isolation',
  'ScoreReassessmentRecommended',
];

const ACTIVE_REFERRAL_TERMINAL_STATUSES = new Set(['Completed', 'Declined']);
const SCORE_OPTIONS = [
  { id: 'heart', label: 'HEART Score' },
  { id: 'qsofa', label: 'qSOFA' },
  { id: 'nihss', label: 'NIHSS' },
];

const BACKEND_DATA_FEATURE_BY_TAB = {
  medications: 'medication_history',
  orders: 'imaging_orders',
  labs: 'lab_results_panel',
  visits: 'visit_history',
  imaging: 'imaging_orders',
  observations: 'vitals_history_chart',
  diagnosis: 'icd10_lookup',
};

const CATEGORY_CLASS = {
  'Chest Pain': 'cardiac',
  Respiratory: 'respiratory',
  'Infectious Respiratory': 'respiratory',
  Neurologic: 'neuro',
  Orthopedic: 'ortho',
  Musculoskeletal: 'ortho',
  Trauma: 'ortho',
  'Abdominal Pain': 'abdominal',
  Allergy: 'allergy',
};

function waitMinutes(arrivalTime) {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function formatWait(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatClock(timestamp) {
  if (!timestamp) return '--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function patientName(patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function formatBackendDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function backendData(entry) {
  return entry?.data || {};
}

function backendArray(entry, key) {
  const value = backendData(entry)[key];
  return Array.isArray(value) ? value : [];
}

function backendCount(entry, key) {
  return backendArray(entry, key).length;
}

function criticalAllergies(entry) {
  return backendArray(entry, 'allergies').filter((allergy) => allergy.isCritical);
}

function backendLoadLabel(entry) {
  if (!entry || entry.status === 'idle') return 'Backend not loaded';
  if (entry.status === 'loading') return 'Loading backend record...';
  if (entry.status === 'error') return entry.error || 'Backend record unavailable';
  if (entry.partial) return 'Loaded with partial backend data';
  return 'Loaded from backend patient endpoints';
}

function groupedOrders(orders = []) {
  return ['Pending', 'Resulted', 'Cancelled'].map((status) => ({
    status,
    orders: orders.filter((order) => order.status === status),
  }));
}

function primaryDiagnosis(entry) {
  const diagnoses = backendArray(entry, 'diagnoses');
  return (
    diagnoses.find((diagnosis) => diagnosis.confirmed) ||
    diagnoses.find((diagnosis) => diagnosis.code) ||
    diagnoses[0] ||
    null
  );
}

function formatDiagnosis(diagnosis) {
  if (!diagnosis) return '';
  return [diagnosis.code, diagnosis.label].filter(Boolean).join(' · ');
}

function isEditableShortcutTarget(target) {
  return (
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.tagName === 'SELECT' ||
    target?.isContentEditable
  );
}

function isActiveReferral(referral) {
  return referral && !ACTIVE_REFERRAL_TERMINAL_STATUSES.has(referral.status);
}

function categoryClass(category) {
  return CATEGORY_CLASS[category] || 'default';
}

function transitionErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unable to move patient state.';
}

function vitalTone(label, value) {
  if (value === null || value === undefined) return 'muted';
  if (label === 'HR') {
    if (value < 45 || value >= 120) return 'critical';
    if (value < 55 || value >= 105) return 'warning';
  }
  if (label === 'BP') {
    if (value.systolic < 90 || value.systolic >= 180 || value.diastolic >= 120) return 'critical';
    if (value.systolic < 100 || value.systolic >= 160 || value.diastolic >= 100) return 'warning';
  }
  if (label === 'SpO2') {
    if (value < 92) return 'critical';
    if (value < 95) return 'warning';
  }
  if (label === 'Temp') {
    if (value >= 39 || value < 35.5) return 'critical';
    if (value >= 38 || value < 36) return 'warning';
  }
  return 'normal';
}

function trendArrow(current, previous) {
  if (typeof current !== 'number' || typeof previous !== 'number') return '→';
  if (current > previous) return '↑';
  if (current < previous) return '↓';
  return '→';
}

function toNumeric(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeVitalsPoint(timestamp, values = {}, source = 'local') {
  if (!timestamp) return null;
  const point = {
    timestamp,
    time: formatClock(timestamp),
    hr: toNumeric(values.hr ?? values.heartRate),
    spo2: toNumeric(values.spo2 ?? values.oxygenSaturation),
    bpSystolic: toNumeric(values.bpSystolic ?? values.systolic),
    bpDiastolic: toNumeric(values.bpDiastolic ?? values.diastolic),
    source,
  };
  if (
    point.hr === null &&
    point.spo2 === null &&
    point.bpSystolic === null &&
    point.bpDiastolic === null
  ) {
    return null;
  }
  return point;
}

function buildVitalsHistory(patient, observations = []) {
  const points = [];
  observations.forEach((observation) => {
    points.push(
      normalizeVitalsPoint(
        observation.recordedAt,
        {
          hr: observation.hr,
          spo2: observation.spo2,
          bpSystolic: observation.bpSystolic,
          bpDiastolic: observation.bpDiastolic,
        },
        observation.source || 'backend'
      )
    );
  });

  patient.timeline
    .filter((event) => event.type === 'VitalsUpdated' && event.metadata)
    .forEach((event) => {
      points.push(
        normalizeVitalsPoint(
          event.timestamp,
          {
            hr: event.metadata.hr,
            spo2: event.metadata.spo2,
            bpSystolic: event.metadata.bpSystolic,
            bpDiastolic: event.metadata.bpDiastolic,
          },
          'timeline'
        )
      );
      points.push(
        normalizeVitalsPoint(
          new Date(new Date(event.timestamp).getTime() - 1).toISOString(),
          {
            hr: event.metadata.previousHr,
            spo2: event.metadata.previousSpo2,
            bpSystolic: event.metadata.previousBpSystolic,
            bpDiastolic: event.metadata.previousBpDiastolic,
          },
          'timeline-previous'
        )
      );
    });

  points.push(normalizeVitalsPoint(patient.vitals.recordedAt, patient.vitals, 'current'));

  const byTimestamp = new Map();
  points.filter(Boolean).forEach((point) => {
    const existing = byTimestamp.get(point.timestamp) || {};
    byTimestamp.set(point.timestamp, { ...existing, ...point });
  });

  return [...byTimestamp.values()]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-8);
}

function VitalsHistoryChart({ readings }) {
  if (!readings.length) {
    return <p>No vitals history readings returned from backend or timeline.</p>;
  }

  return (
    <div className="patient-detail__vitals-history">
      <div className="patient-detail__vitals-chart" aria-label="Vitals history chart">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={readings} margin={{ top: 8, right: 12, bottom: 0, left: -24 }}>
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-elevated)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-primary)',
              }}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.timestamp
                  ? formatBackendDate(payload[0].payload.timestamp)
                  : 'Vitals'
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="hr" name="HR" stroke="var(--status-critical)" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="spo2" name="SpO2" stroke="var(--status-info)" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="bpSystolic" name="SBP" stroke="var(--status-warning)" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="bpDiastolic" name="DBP" stroke="var(--status-stable)" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {readings.length < 4 ? (
        <small>{readings.length} real reading{readings.length === 1 ? '' : 's'} available; backend did not return four readings yet.</small>
      ) : (
        <small>Showing the latest {Math.min(readings.length, 8)} recorded readings.</small>
      )}
    </div>
  );
}

function latestPreviousVitals(patient) {
  const event = [...patient.timeline]
    .reverse()
    .find((item) => item.type === 'VitalsUpdated' && item.metadata);
  const metadata = event?.metadata || {};
  return {
    hr: typeof metadata.previousHr === 'number' ? metadata.previousHr : null,
    bpSystolic:
      typeof metadata.previousBpSystolic === 'number' ? metadata.previousBpSystolic : null,
    bpDiastolic:
      typeof metadata.previousBpDiastolic === 'number' ? metadata.previousBpDiastolic : null,
    spo2: typeof metadata.previousSpo2 === 'number' ? metadata.previousSpo2 : null,
    temp: typeof metadata.previousTemp === 'number' ? metadata.previousTemp : null,
  };
}

function vitalItems(vitals, previousVitals = {}) {
  return [
    {
      label: 'HR',
      value: vitals.hr,
      previous: previousVitals.hr,
      display: vitals.hr ?? '--',
      trendValue: vitals.hr,
    },
    {
      label: 'BP',
      value:
        vitals.bpSystolic !== null && vitals.bpDiastolic !== null
          ? { systolic: vitals.bpSystolic, diastolic: vitals.bpDiastolic }
          : null,
      previous: previousVitals.bpSystolic,
      display:
        vitals.bpSystolic !== null && vitals.bpDiastolic !== null
          ? `${vitals.bpSystolic}/${vitals.bpDiastolic}`
          : '--/--',
      trendValue: vitals.bpSystolic,
    },
    {
      label: 'SpO2',
      value: vitals.spo2,
      previous: previousVitals.spo2,
      display: vitals.spo2 === null ? '--' : `${vitals.spo2}%`,
      trendValue: vitals.spo2,
    },
    {
      label: 'Temp',
      value: vitals.temp,
      previous: previousVitals.temp,
      display: vitals.temp === null ? '--' : `${vitals.temp.toFixed(1)}`,
      trendValue: vitals.temp,
    },
  ];
}

function priorityTone(priority) {
  if (priority === Priority.P1) return 'p1';
  if (priority === Priority.P2) return 'p2';
  if (priority === Priority.P3) return 'p3';
  if (priority === Priority.P4) return 'p4';
  return 'p5';
}

function flagAddedAt(patient, flag) {
  if (flag && typeof flag === 'object') return flag.detectedAt;
  const event = [...patient.timeline]
    .reverse()
    .find((item) => item.type === 'FlagAdded' && item.summary.includes(flag));
  return event?.timestamp || patient.arrivalTime;
}

function buildVitalsForm(vitals) {
  return {
    hr: vitals.hr ?? '',
    bpSystolic: vitals.bpSystolic ?? '',
    bpDiastolic: vitals.bpDiastolic ?? '',
    spo2: vitals.spo2 ?? '',
    temp: vitals.temp ?? '',
    rr: vitals.rr ?? '',
    gcs: vitals.gcs ?? '',
    pain: vitals.pain ?? '',
  };
}

function parseOptionalNumber(value) {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function StaffWorkloadIndicator({ member }) {
  return (
    <span
      className={`staff-selector__workload staff-selector__workload--${member.workloadTone}`}
      aria-label={`${member.assignedCount} assigned patients`}
    >
      <span style={{ width: `${Math.max(8, member.workloadPercent)}%` }} />
    </span>
  );
}

function StaffAvatarBadge({ member, className = 'staff-selector__avatar' }) {
  if (member?.avatarUrl) {
    return <img className={className} src={member.avatarUrl} alt="" loading="lazy" />;
  }
  return <span className={className}>{member.initials || staffInitials(member)}</span>;
}

function StaffAssignmentSelector({ patient, workloads, onAssign, compact = false, onClose }) {
  return (
    <div className={`staff-selector${compact ? ' staff-selector--compact' : ''}`}>
      {workloads.map((member) => (
        <button
          key={member.id}
          type="button"
          className={[
            'staff-selector__option',
            patient.assignedStaffId === member.id ? 'staff-selector__option--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={(event) => {
            event.stopPropagation();
            onAssign(patient.id, member.id);
            onClose?.();
          }}
        >
          <StaffAvatarBadge member={member} />
          <span className="staff-selector__body">
            <strong>{member.displayName}</strong>
            <small>
              <span className="staff-selector__role-badge">{member.roleLabel}</span> ·{' '}
              {member.assignedCount} patients
            </small>
            <StaffWorkloadIndicator member={member} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function PatientDetailPanel() {
  const navigate = useNavigate();
  const { user } = useUser();
  const emergencyPermissions = emergencyPermissionsForUser(user);
  const currentEmergencyRole = emergencyRoleForUser(user);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const patients = useEmergencyStore((state) => state.patients);
  const queues = useEmergencyStore((state) => state.queues);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const whiteboardSearchQuery = useEmergencyStore((state) => state.whiteboardSearchQuery);
  const referrals = useEmergencyStore((state) => state.referrals);
  const patient = patients.find((candidate) => candidate.id === selectedPatientId);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const addVitals = useEmergencyStore((state) => state.addVitals);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const removeFlag = useEmergencyStore((state) => state.removeFlag);
  const addNote = useEmergencyStore((state) => state.addNote);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const assignRoom = useEmergencyStore((state) => state.assignRoom);
  const patientBackendEntry = useEmergencyStore((state) =>
    selectedPatientId ? state.patientBackendDetails[selectedPatientId] : null
  );
  const loadPatientBackendDetails = useEmergencyStore((state) => state.loadPatientBackendDetails);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [vitalsForm, setVitalsForm] = useState(() => buildVitalsForm(patient?.vitals || {}));
  const [noteText, setNoteText] = useState('');
  const [selectedFlag, setSelectedFlag] = useState('ReassessmentDue');
  const [transitionError, setTransitionError] = useState('');
  const [staffSelectorOpen, setStaffSelectorOpen] = useState(false);
  const [scoreCalculatorId, setScoreCalculatorId] = useState('');
  const [clinicalDataTab, setClinicalDataTab] = useState('medications');
  const filteredPatientsForShortcuts = useMemo(() => {
    const query = whiteboardSearchQuery.trim().toLowerCase();
    const queue = activeQueueFilter
      ? queues.find((candidate) => candidate.type === activeQueueFilter)
      : null;
    return patients.filter((candidate) => {
      if (candidate.state === PatientState.Discharge || candidate.state === PatientState.Deceased) {
        return false;
      }
      if (queue && !queue.patientIds.includes(candidate.id)) return false;
      if (!query) return true;
      const name = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
      return (
        name.includes(query) ||
        candidate.mrn.toLowerCase().includes(query) ||
        candidate.chiefComplaint.toLowerCase().includes(query) ||
        candidate.complaintCategory.toLowerCase().includes(query)
      );
    });
  }, [activeQueueFilter, patients, queues, whiteboardSearchQuery]);

  useEffect(() => {
    setVitalsForm(buildVitalsForm(patient?.vitals || {}));
    setNoteText('');
    setVitalsOpen(false);
    setTransitionError('');
    setScoreCalculatorId('');
    setClinicalDataTab('medications');
  }, [patient?.id, patient?.vitals]);

  useEffect(() => {
    if (!patient?.id) return;
    void loadPatientBackendDetails(patient.id);
  }, [loadPatientBackendDetails, patient?.id]);

  useEffect(() => {
    if (!patient) return undefined;

    const handlePatientDetailShortcut = (event) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableShortcutTarget(event.target)
      ) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const shortcutNextState = getNextStates(patient.state)[0];
        if (!shortcutNextState) return;
        try {
          movePatientWithJourneyRules(patient.id, shortcutNextState, {
            staffId: patient.assignedStaffId || activeShift.chargeStaffId,
            note: 'Moved via PatientDetailPanel keyboard shortcut.',
          });
          setTransitionError('');
        } catch (error) {
          setTransitionError(transitionErrorMessage(error));
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectPatient(null);
        return;
      }

      if (event.key.toLowerCase() === 'a' && !event.shiftKey) {
        event.preventDefault();
        setStaffSelectorOpen((open) => !open);
        return;
      }

      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        if (!filteredPatientsForShortcuts.length) return;
        const currentIndex = filteredPatientsForShortcuts.findIndex(
          (candidate) => candidate.id === patient.id
        );
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % filteredPatientsForShortcuts.length;
        selectPatient(filteredPatientsForShortcuts[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handlePatientDetailShortcut);
    return () => window.removeEventListener('keydown', handlePatientDetailShortcut);
  }, [activeShift.chargeStaffId, filteredPatientsForShortcuts, patient, selectPatient]);

  if (!patient) {
    return (
      <aside className="patient-detail patient-detail--empty" aria-label="Patient detail panel">
        <header className="patient-detail__header">
          <div className="patient-detail__identity">
            <span>Patient unavailable</span>
            <h2>No patient selected</h2>
            <p>This patient is no longer in the active Emergency OS store.</p>
          </div>
          <button
            type="button"
            onClick={() => selectPatient(null)}
            aria-label="Close patient details"
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="patient-detail__empty" role="status">
          Select another patient from the whiteboard or clear the active filters.
        </div>
      </aside>
    );
  }

  const previousVitals = latestPreviousVitals(patient);
  const savedScores = getSavedScores(patient);
  const nextStates = getNextStates(patient.state);
  const nextState = nextStates[0] || null;
  const canMoveToNextState =
    Boolean(nextState) &&
    (nextState === PatientState.Discharge
      ? emergencyPermissions.canDischarge
      : nextState === PatientState.Admission
        ? emergencyPermissions.canTransfer
        : emergencyPermissions.canAssignRoom || emergencyPermissions.canAssignStaff);
  const canTransitionState = (state) => {
    if (state === PatientState.Discharge) return emergencyPermissions.canDischarge;
    if (state === PatientState.Admission) return emergencyPermissions.canTransfer;
    return emergencyPermissions.canAssignRoom || emergencyPermissions.canAssignStaff;
  };
  const protocolSuggestions = getProtocolSuggestions(patient.complaintCategory);
  const chronologicalNotes = [...patient.notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const activeReferrals = referrals
    .filter((referral) => referral.patientId === patient.id && isActiveReferral(referral))
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  const referralHistoryLast12Months = referrals.filter((referral) => {
    if (referral.patientId !== patient.id) return false;
    const requestedAt = new Date(referral.requestedAt).getTime();
    if (!Number.isFinite(requestedAt)) return false;
    return requestedAt >= Date.now() - 365 * 24 * 60 * 60 * 1000;
  }).length;
  const medications = backendArray(patientBackendEntry, 'medications');
  const allergies = backendArray(patientBackendEntry, 'allergies');
  const labs = backendArray(patientBackendEntry, 'labs');
  const visits = backendArray(patientBackendEntry, 'visits');
  const imaging = backendArray(patientBackendEntry, 'imaging');
  const backendDocuments = backendArray(patientBackendEntry, 'documents');
  const observations = backendArray(patientBackendEntry, 'observations');
  const orders = backendArray(patientBackendEntry, 'orders');
  const diagnoses = backendArray(patientBackendEntry, 'diagnoses');
  const currentDiagnosis = primaryDiagnosis(patientBackendEntry);
  const vitalsHistoryReadings = buildVitalsHistory(patient, observations);
  const orderGroups = groupedOrders(orders);
  const clinicalDataTabs = [
    { id: 'medications', label: 'Medication History', count: medications.length + allergies.length },
    { id: 'orders', label: 'Orders', count: orders.length },
    { id: 'labs', label: 'Results', count: labs.length },
    { id: 'visits', label: 'Visit History', count: visits.length },
    { id: 'imaging', label: 'Imaging', count: imaging.length },
    { id: 'observations', label: 'Vitals History', count: observations.length },
    { id: 'diagnosis', label: 'Diagnosis', count: diagnoses.length },
    { id: 'documents', label: 'Documentation', count: backendDocuments.length },
  ];
  const noteAuthorFallback =
    patient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system';
  const staffWorkloads = buildStaffWorkloads(staff, patients, activeShift);
  const assignedStaff = staff.find((member) => member.id === patient.assignedStaffId);

  const submitVitals = (event) => {
    event.preventDefault();
    addVitals(patient.id, {
      hr: parseOptionalNumber(vitalsForm.hr),
      bpSystolic: parseOptionalNumber(vitalsForm.bpSystolic),
      bpDiastolic: parseOptionalNumber(vitalsForm.bpDiastolic),
      spo2: parseOptionalNumber(vitalsForm.spo2),
      temp: parseOptionalNumber(vitalsForm.temp),
      rr: parseOptionalNumber(vitalsForm.rr),
      gcs: parseOptionalNumber(vitalsForm.gcs),
      pain: parseOptionalNumber(vitalsForm.pain),
      recordedAt: new Date().toISOString(),
    });
    setVitalsOpen(false);
  };

  const submitNote = (event) => {
    event.preventDefault();
    if (!noteText.trim()) return;
    addNote(patient.id, {
      id: `note-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      authorStaffId: noteAuthorFallback,
      type: 'Clinical',
      body: noteText.trim(),
      createdAt: new Date().toISOString(),
    });
    setNoteText('');
  };

  const handleMoveToNextState = () => {
    if (!nextState) return;
    try {
      movePatientWithJourneyRules(patient.id, nextState, {
        staffId: patient.assignedStaffId || activeShift.chargeStaffId,
        note: 'Moved from PatientDetailPanel.',
      });
      setTransitionError('');
    } catch (error) {
      setTransitionError(transitionErrorMessage(error));
    }
  };

  const handleProtocolLaunch = (suggestion) => {
    const timestamp = new Date().toISOString();
    const currentPatient =
      useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id) ||
      patient;
    updatePatient(patient.id, {
      timeline: [
        ...currentPatient.timeline,
        createProtocolLaunchEvent(patient.id, patient.complaintCategory, suggestion, timestamp),
      ],
    });
  };

  const handleScoreSave = (score) => {
    const timestamp = new Date().toISOString();
    const currentPatient =
      useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id) ||
      patient;
    const authorStaffId =
      currentPatient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system';
    updatePatient(patient.id, {
      timeline: [
        ...currentPatient.timeline,
        createClinicalScoreEvent(patient.id, score, timestamp, authorStaffId),
      ],
    });
    addNote(patient.id, createClinicalScoreNote(patient.id, score, authorStaffId, timestamp));
  };

  const handleNewReferral = () => {
    navigate(`/emergency/referrals?patientId=${encodeURIComponent(patient.id)}&new=1`);
  };

  const handleOpenClinicalTools = () => {
    const params = new URLSearchParams({
      patientId: patient.id,
      complaint: patient.complaintCategory || '',
    });
    navigate(`/emergency/tools?${params.toString()}`);
  };

  return (
    <aside className="patient-detail" aria-label="Patient detail panel">
      <header className="patient-detail__header">
        <div className="patient-detail__identity">
          <span>{patient.mrn}</span>
          <h2>{patientName(patient)}</h2>
          <p>
            DOB {patient.dob} · {patient.age}/{patient.sex}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectPatient(null)}
          aria-label="Close patient details"
        >
          <X size={18} aria-hidden />
        </button>
      </header>

      <section className="patient-detail__priority-state">
        <label>
          Priority
          <select
            value={patient.priority}
            onChange={(event) => updatePatient(patient.id, { priority: event.target.value })}
          >
            {Object.values(Priority).map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>Current state</span>
          <strong>{patient.state}</strong>
          {canMoveToNextState ? (
            <button type="button" onClick={handleMoveToNextState} disabled={!nextState}>
              Move to Next State
            </button>
          ) : null}
          {transitionError ? (
            <small className="patient-detail__error">{transitionError}</small>
          ) : null}
        </div>
      </section>

      <section className="patient-detail__section patient-detail__staff-assignment">
        <div className="patient-detail__section-heading">
          <span>Assigned to</span>
          {emergencyPermissions.canAssignStaff ? (
            <button type="button" onClick={() => setStaffSelectorOpen((open) => !open)}>
              Edit
            </button>
          ) : (
            <small>Role {currentEmergencyRole}: assignment locked</small>
          )}
        </div>
        <div className="patient-detail__assigned-staff">
          {assignedStaff?.avatarUrl ? (
            <img className="patient-card__staff-avatar" src={assignedStaff.avatarUrl} alt="" loading="lazy" />
          ) : (
            <span className="patient-card__staff-avatar">{staffInitials(assignedStaff)}</span>
          )}
          <strong>{staffDisplayName(assignedStaff)}</strong>
        </div>
        {staffSelectorOpen && emergencyPermissions.canAssignStaff ? (
          <StaffAssignmentSelector
            patient={patient}
            workloads={staffWorkloads}
            onAssign={assignStaff}
            onClose={() => setStaffSelectorOpen(false)}
          />
        ) : null}
      </section>

      {protocolSuggestions.length ? (
        <section className="patient-detail__section">
          <div className="patient-detail__section-heading">
            <span>Complaint Protocols</span>
          </div>
          <ProtocolSuggestion
            complaintCategory={patient.complaintCategory}
            onLaunch={handleProtocolLaunch}
            onSaveScore={handleScoreSave}
            patient={patient}
            compact
          />
        </section>
      ) : null}

      {scoreCalculatorId ? (
        <ClinicalScoreCalculator
          calculatorId={scoreCalculatorId}
          patient={patient}
          onClose={() => setScoreCalculatorId('')}
          onSaveScore={handleScoreSave}
        />
      ) : null}

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Journey Timeline</span>
        </div>
        <JourneyTimeline
          patient={patient}
          staffId={patient.assignedStaffId || activeShift.chargeStaffId}
          onTransitionError={setTransitionError}
          canTransitionState={canTransitionState}
        />
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Vitals Panel</span>
          {emergencyPermissions.canUpdateVitals ? (
            <button type="button" onClick={() => setVitalsOpen((open) => !open)}>
              Add Vitals
            </button>
          ) : null}
        </div>
        <div className="patient-detail__vitals">
          {vitalItems(patient.vitals, previousVitals).map((item) => (
            <div
              key={item.label}
              className={`patient-detail__vital patient-detail__vital--${vitalTone(item.label, item.value)}`}
            >
              <span>{item.label}</span>
              <strong>
                {item.display} {trendArrow(item.trendValue, item.previous)}
              </strong>
            </div>
          ))}
        </div>
        <FeatureGate feature="vitals_history_chart" showPlaceholder compact>
          <VitalsHistoryChart readings={vitalsHistoryReadings} />
        </FeatureGate>
        {vitalsOpen && emergencyPermissions.canUpdateVitals ? (
          <form className="patient-detail__vitals-form" onSubmit={submitVitals}>
            {Object.entries(vitalsForm).map(([field, value]) => (
              <label key={field}>
                {field}
                <input
                  value={value}
                  inputMode="decimal"
                  onChange={(event) =>
                    setVitalsForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </label>
            ))}
            <button type="submit">Save vitals</button>
          </form>
        ) : null}
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Backend Patient Record</span>
          <button type="button" onClick={() => loadPatientBackendDetails(patient.id, { force: true })}>
            Refresh
          </button>
        </div>
        <p className={`patient-detail__backend-status patient-detail__backend-status--${patientBackendEntry?.status || 'idle'}`}>
          {backendLoadLabel(patientBackendEntry)}
        </p>
        <div className="patient-detail__data-tabs" role="tablist" aria-label="Backend patient data">
          {clinicalDataTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={clinicalDataTab === tab.id}
              className={clinicalDataTab === tab.id ? 'patient-detail__data-tab--active' : ''}
              onClick={() => setClinicalDataTab(tab.id)}
            >
              {tab.label}
              <strong>{tab.count}</strong>
            </button>
          ))}
        </div>

        {clinicalDataTab === 'medications' ? (
          <FeatureGate feature={BACKEND_DATA_FEATURE_BY_TAB.medications} showPlaceholder compact>
          <div className="patient-detail__data-panel">
            <div className="patient-detail__data-subsection">
              <h3>Known Allergies</h3>
              {allergies.length ? (
                <div className="patient-detail__allergy-list">
                  {allergies.map((allergy) => (
                    <span
                      key={allergy.id}
                      className={`patient-detail__allergy-chip${allergy.isCritical ? ' patient-detail__allergy-chip--critical' : ''}`}
                      title={allergy.reaction || allergy.source}
                    >
                      {allergy.substance}
                      <small>{allergy.severity}</small>
                    </span>
                  ))}
                </div>
              ) : (
                <p>No backend allergy records returned.</p>
              )}
            </div>
            <div className="patient-detail__data-subsection">
              <h3>Medication History</h3>
              {medications.length ? (
                <div className="patient-detail__data-list">
                  {medications.map((medication) => (
                    <article key={medication.id}>
                      <strong>{medication.name}</strong>
                      <span>{medication.dose || 'Dose not recorded'}</span>
                      <small>
                        {medication.status} · {formatBackendDate(medication.lastUpdated)}
                      </small>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No backend medication records returned.</p>
              )}
            </div>
          </div>
          </FeatureGate>
        ) : null}

        {clinicalDataTab === 'orders' ? (
          <FeatureGate feature={BACKEND_DATA_FEATURE_BY_TAB.orders} showPlaceholder compact>
          <div className="patient-detail__data-panel">
            <div className="patient-detail__order-action-row">
              <button
                type="button"
                disabled
                title={
                  emergencyPermissions.canUseOrders
                    ? 'No backend order-placement endpoint was found.'
                    : `Role ${currentEmergencyRole} cannot place orders.`
                }
              >
                New Order
              </button>
              <small>Read-only: backend exposes order data/contracts but no signed order-placement endpoint.</small>
            </div>
            {orderGroups.map((group) => (
              <section key={group.status} className="patient-detail__data-subsection">
                <h3>
                  {group.status} <span>{group.orders.length}</span>
                </h3>
                {group.orders.length ? (
                  <div className="patient-detail__order-list">
                    {group.orders.map((order) => (
                      <article key={order.id}>
                        <div>
                          <strong>{order.name}</strong>
                          <span>{order.type}</span>
                        </div>
                        <dl>
                          <div>
                            <dt>Ordered by</dt>
                            <dd>{order.orderedBy}</dd>
                          </div>
                          <div>
                            <dt>Ordered at</dt>
                            <dd>{formatBackendDate(order.orderedAt)}</dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>{order.status}</dd>
                          </div>
                          <div>
                            <dt>Result</dt>
                            <dd>{order.result || 'No result returned'}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No {group.status.toLowerCase()} orders returned.</p>
                )}
              </section>
            ))}
          </div>
          </FeatureGate>
        ) : null}

        {clinicalDataTab === 'labs' ? (
          <FeatureGate feature={BACKEND_DATA_FEATURE_BY_TAB.labs} showPlaceholder compact>
          <div className="patient-detail__data-panel">
            {labs.length ? (
              <div className="patient-detail__lab-list">
                {labs.map((lab) => (
                  <article
                    key={lab.id}
                    className={[
                      lab.abnormal ? 'patient-detail__lab--abnormal' : '',
                      lab.isCritical ? 'patient-detail__lab--critical' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <strong>{lab.name}</strong>
                    <span>
                      {lab.value} {lab.unit}
                    </span>
                    <small>
                      {lab.flag} {lab.referenceRange ? `· ref ${lab.referenceRange}` : ''} ·{' '}
                      {formatBackendDate(lab.resultedAt)}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No backend lab result records returned.</p>
            )}
          </div>
          </FeatureGate>
        ) : null}

        {clinicalDataTab === 'visits' ? (
          <FeatureGate feature={BACKEND_DATA_FEATURE_BY_TAB.visits} showPlaceholder compact>
          <div className="patient-detail__data-panel">
            {visits.length ? (
              <div className="patient-detail__data-list">
                {visits.map((visit) => (
                  <article key={visit.id}>
                    <strong>{visit.complaint}</strong>
                    <span>{visit.disposition || visit.location || 'Disposition not recorded'}</span>
                    <small>{formatBackendDate(visit.date)}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No backend visit history returned.</p>
            )}
          </div>
          </FeatureGate>
        ) : null}

        {clinicalDataTab === 'imaging' ? (
          <FeatureGate feature={BACKEND_DATA_FEATURE_BY_TAB.imaging} showPlaceholder compact>
          <div className="patient-detail__data-panel">
            {imaging.length ? (
              <div className="patient-detail__data-list">
                {imaging.map((study) => (
                  <article key={study.id}>
                    <strong>{study.study}</strong>
                    <span>{study.impression || study.status}</span>
                    <small>
                      {study.status} · {formatBackendDate(study.resultedAt || study.orderedAt)}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No backend imaging records returned.</p>
            )}
          </div>
          </FeatureGate>
        ) : null}

        {clinicalDataTab === 'observations' ? (
          <FeatureGate feature={BACKEND_DATA_FEATURE_BY_TAB.observations} showPlaceholder compact>
          <div className="patient-detail__data-panel">
            {observations.length ? (
              <div className="patient-detail__data-list">
                {observations.map((observation) => (
                  <article key={observation.id}>
                    <strong>{observation.label}</strong>
                    <span>
                      {observation.value} {observation.unit}
                    </span>
                    <small>{formatBackendDate(observation.recordedAt)}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No backend observation or vitals-history records returned.</p>
            )}
          </div>
          </FeatureGate>
        ) : null}

        {clinicalDataTab === 'diagnosis' ? (
          <FeatureGate feature={BACKEND_DATA_FEATURE_BY_TAB.diagnosis} showPlaceholder compact>
          <div className="patient-detail__data-panel">
            <label className="patient-detail__diagnosis-field">
              Diagnosis
              <input
                value={formatDiagnosis(currentDiagnosis)}
                placeholder="No confirmed diagnosis returned"
                readOnly
              />
              <small>
                ICD-10 lookup endpoint not found in the backend inventory; displaying backend diagnosis records only.
              </small>
            </label>
            {diagnoses.length ? (
              <div className="patient-detail__data-list">
                {diagnoses.map((diagnosis) => (
                  <article key={diagnosis.id}>
                    <strong>{formatDiagnosis(diagnosis)}</strong>
                    <span>{diagnosis.status}</span>
                    <small>
                      {diagnosis.confirmed ? 'Confirmed' : 'Recorded'} ·{' '}
                      {formatBackendDate(diagnosis.recordedAt)}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No backend diagnosis or ICD-10 records returned.</p>
            )}
          </div>
          </FeatureGate>
        ) : null}

        {clinicalDataTab === 'documents' ? (
          <div className="patient-detail__data-panel">
            {backendDocuments.length ? (
              <div className="patient-detail__data-list">
                {backendDocuments.map((document) => (
                  <article key={document.id}>
                    <strong>{document.title}</strong>
                    <span>{document.body || document.status}</span>
                    <small>
                      {document.author || document.source} · {formatBackendDate(document.createdAt)}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No backend documentation records returned.</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Clinical Scores</span>
          <button type="button" onClick={handleOpenClinicalTools}>
            Run Score
          </button>
        </div>
        <div className="patient-detail__score-history" aria-label="Saved clinical scores">
          {savedScores.length ? (
            savedScores.map((score) => {
              const scoreStaff = staff.find((candidate) => candidate.id === score.staffId);
              return (
                <article key={score.id} className={`patient-detail__score-row patient-detail__score-row--${score.tone}`}>
                  <strong>{score.toolName}</strong>
                  <span>{score.result ?? '--'}</span>
                  <span>{score.band || 'Band not recorded'}</span>
                  <time dateTime={score.timestamp}>{formatClock(score.timestamp)}</time>
                  <span>{staffDisplayName(scoreStaff)}</span>
                </article>
              );
            })
          ) : (
            <p>No scores run for this patient yet.</p>
          )}
        </div>
        <div className="patient-detail__score-launcher">
          {SCORE_OPTIONS.map((score) => (
            <button key={score.id} type="button" onClick={() => setScoreCalculatorId(score.id)}>
              Quick {score.label}
            </button>
          ))}
        </div>
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Clinical Flags</span>
        </div>
        <div className="patient-detail__flags">
          {patient.flags.length ? (
            patient.flags.map((flag) => {
              const flagType = getPatientFlagType(flag);
              return (
                <button
                  key={`${flagType}-${flag.detectedAt}`}
                  type="button"
                  onClick={() => removeFlag(patient.id, flagType)}
                >
                  {flagType}
                  <small>
                    {flag.reason} · {flag.severity} · {formatClock(flagAddedAt(patient, flag))}
                  </small>
                </button>
              );
            })
          ) : (
            <p>No active flags</p>
          )}
        </div>
        {emergencyPermissions.canManageFlags ? (
          <div className="patient-detail__inline-actions">
            <select value={selectedFlag} onChange={(event) => setSelectedFlag(event.target.value)}>
              {ALL_FLAGS.map((flag) => (
                <option key={flag} value={flag}>
                  {flag}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => addFlag(patient.id, selectedFlag)}>
              Add flag
            </button>
          </div>
        ) : null}
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Clinical Notes</span>
        </div>
        <div className="patient-detail__notes">
          {chronologicalNotes.map((note) => {
            const author = staff.find((candidate) => candidate.id === note.authorStaffId);
            return (
              <article key={note.id}>
                <strong>{staffDisplayName(author)}</strong>
                <time>{formatClock(note.createdAt)}</time>
                <p>{note.body}</p>
              </article>
            );
          })}
          {!chronologicalNotes.length ? <p>No notes yet</p> : null}
        </div>
        {emergencyPermissions.canAddNotes ? (
          <form className="patient-detail__note-form" onSubmit={submitNote}>
            <textarea
              value={noteText}
              placeholder="Add clinical note..."
              onChange={(event) => setNoteText(event.target.value)}
            />
            <button type="submit">Add note</button>
          </form>
        ) : null}
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Active Referrals</span>
          <button type="button" onClick={handleNewReferral}>
            <FilePlus2 size={13} aria-hidden />
            New Referral
          </button>
        </div>
        <p className="patient-detail__referral-history">
          Previous referrals: <strong>{referralHistoryLast12Months}</strong> in last 12 months
        </p>
        <div className="patient-detail__referral-list">
          {activeReferrals.length ? (
            activeReferrals.map((referral) => (
              <article key={referral.id} className="patient-detail__referral-card">
                <div>
                  <strong>{referral.targetDepartment}</strong>
                  <span>{referral.reason}</span>
                </div>
                <span
                  className={`patient-detail__referral-chip patient-detail__referral-chip--${referral.status.toLowerCase()}`}
                >
                  {referral.status === 'Acknowledged' || referral.status === 'Draft'
                    ? 'Pending'
                    : referral.status}
                </span>
                <dl className="patient-detail__referral">
                  <div>
                    <dt>Urgency</dt>
                    <dd>{referral.urgency}</dd>
                  </div>
                  <div>
                    <dt>Sent</dt>
                    <dd>{formatClock(referral.requestedAt)}</dd>
                  </div>
                  {referral.responseNote ? (
                    <div>
                      <dt>Response</dt>
                      <dd>{referral.responseNote}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))
          ) : (
            <p>No active referrals</p>
          )}
        </div>
      </section>

      <div className="patient-detail__actions">
        {emergencyPermissions.canAssignStaff ? (
          <label>
            Assign Staff
            <select
              value={patient.assignedStaffId || ''}
              onChange={(event) => event.target.value && assignStaff(patient.id, event.target.value)}
            >
              <option value="">Unassigned</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {staffDisplayName(member)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {emergencyPermissions.canAssignRoom ? (
          <label>
            Assign Room
            <select
              value={patient.roomId || ''}
              onChange={(event) => event.target.value && assignRoom(patient.id, event.target.value)}
            >
              <option value="">No room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {emergencyPermissions.canManageFlags ? (
          <button type="button" onClick={() => addFlag(patient.id, selectedFlag)}>
            Add Flag
          </button>
        ) : null}
        {emergencyPermissions.canDischarge ? (
          <button
            type="button"
            onClick={() => {
              try {
                movePatientWithJourneyRules(patient.id, PatientState.Discharge, {
                  staffId: patient.assignedStaffId || activeShift.chargeStaffId,
                  note: 'Discharge requested from PatientDetailPanel.',
                });
                setTransitionError('');
              } catch (error) {
                setTransitionError(transitionErrorMessage(error));
              }
            }}
          >
            Discharge
          </button>
        ) : null}
        {emergencyPermissions.canTransfer ? (
          <button
            type="button"
            onClick={() => {
              try {
                movePatientWithJourneyRules(patient.id, PatientState.Admission, {
                  staffId: patient.assignedStaffId || activeShift.chargeStaffId,
                  note: 'Transfer to admission requested from PatientDetailPanel.',
                });
                setTransitionError('');
              } catch (error) {
                setTransitionError(transitionErrorMessage(error));
              }
            }}
          >
            Transfer
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function PatientCard({ patient, keyboardSelected = false, onKeyboardFocus }) {
  const { user } = useUser();
  const emergencyPermissions = emergencyPermissionsForUser(user);
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const allStaff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const patientBackendEntry = useEmergencyStore((state) => state.patientBackendDetails[patient.id]);
  const loadPatientBackendDetails = useEmergencyStore((state) => state.loadPatientBackendDetails);
  const staff = allStaff.find((candidate) => candidate.id === patient.assignedStaffId);
  const room = useEmergencyStore((state) =>
    state.rooms.find((candidate) => candidate.id === patient.roomId)
  );
  const staffWorkloads = buildStaffWorkloads(allStaff, patients, activeShift);
  const wait = waitMinutes(patient.arrivalTime);
  const isLongWait = wait > 60;
  const isWaitOverTarget = wait > 45;
  const priority = priorityTone(patient.priority);
  const hasReassessment =
    hasPatientFlag(patient, 'ReassessmentDue') ||
    hasPatientFlag(patient, 'ScoreReassessmentRecommended');
  const hasDeterioration = hasPatientFlag(patient, 'DeteriorationRisk');
  const hasEmsArrival = hasPatientFlag(patient, 'EMSArrival') || Boolean(patient.emsArrival);
  const activeReferralCount = referrals.filter(
    (referral) => referral.patientId === patient.id && isActiveReferral(referral)
  ).length;
  const scoreBadges = getRecentSavedScores(patient).slice(0, 3);
  const allergyCount = backendCount(patientBackendEntry, 'allergies');
  const medicationCount = backendCount(patientBackendEntry, 'medications');
  const visitCount = backendCount(patientBackendEntry, 'visits');
  const criticalAllergyCount = criticalAllergies(patientBackendEntry).length;
  const cardDiagnosis = primaryDiagnosis(patientBackendEntry);
  const hasBackendHoverData =
    patientBackendEntry?.status === 'loading' || allergyCount || medicationCount || visitCount;
  const handleBackendHover = () => {
    if (!patientBackendEntry || patientBackendEntry.status === 'error') {
      void loadPatientBackendDetails(patient.id);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      className={[
        'patient-card',
        `patient-card--${priority}`,
        keyboardSelected ? 'patient-card--keyboard-selected' : '',
        hasReassessment ? 'patient-card--reassessment' : '',
        hasDeterioration ? 'patient-card--deterioration' : '',
        hasEmsArrival ? 'patient-card--ems' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-patient-card-id={patient.id}
      onFocus={onKeyboardFocus}
      onMouseEnter={handleBackendHover}
      onClick={() => selectPatient(patient.id)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectPatient(patient.id);
      }}
      aria-label={`Open details for ${patientName(patient)}`}
    >
      <div className="patient-card__row patient-card__row--identity">
        <div className="patient-card__identity">
          <strong>{patientName(patient)}</strong>
          <span>{patient.mrn}</span>
        </div>
        <div className="patient-card__right-pills">
          <span className="patient-card__demographics">
            {patient.age}/{patient.sex[0] || 'U'}
          </span>
          {activeReferralCount ? (
            <span className="patient-card__referral-badge">
              {activeReferralCount} referral{activeReferralCount === 1 ? '' : 's'}
            </span>
          ) : null}
          {hasEmsArrival ? <span className="patient-card__ems-badge">EMS</span> : null}
        </div>
      </div>

      <div className="patient-card__row patient-card__row--badges">
        <span
          className={`patient-card__complaint patient-card__complaint--${categoryClass(patient.complaintCategory)}`}
          title={patient.chiefComplaint}
        >
          {patient.chiefComplaint}
        </span>
        <span className="patient-card__state">{patient.state}</span>
      </div>

      <div className="patient-card__row patient-card__vitals" aria-label="Vitals">
        {vitalItems(patient.vitals).map((item) => (
          <span
            key={item.label}
            className={`patient-card__vital patient-card__vital--${vitalTone(item.label, item.value)}`}
          >
            {item.label} {item.display}
          </span>
        ))}
      </div>

      <div className="patient-card__row patient-card__row--location">
        <span
          className={[
            'patient-card__wait',
            isWaitOverTarget ? 'patient-card__wait--elevated' : '',
            isLongWait ? 'patient-card__wait--long' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {formatWait(wait)} wait
        </span>
        <div className="patient-card__staff-control" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="patient-card__staff-avatar"
            title={staffDisplayName(staff)}
            aria-label={`Assign staff for ${patientName(patient)}`}
            aria-expanded={staffMenuOpen}
            onClick={() => {
              if (emergencyPermissions.canAssignStaff) {
                setStaffMenuOpen((open) => !open);
              }
            }}
          >
            {staff?.avatarUrl ? (
              <img src={staff.avatarUrl} alt="" loading="lazy" />
            ) : staff ? (
              staffInitials(staff)
            ) : (
              <UserRoundCheck size={12} aria-hidden />
            )}
          </button>
          {staffMenuOpen && emergencyPermissions.canAssignStaff ? (
            <StaffAssignmentSelector
              patient={patient}
              workloads={staffWorkloads}
              onAssign={assignStaff}
              compact
              onClose={() => setStaffMenuOpen(false)}
            />
          ) : null}
        </div>
        <span className="patient-card__room">
          <DoorOpen size={12} aria-hidden />
          {room?.name || patient.roomId || 'No room'}
        </span>
      </div>

      <div className="patient-card__flags" aria-label="Patient flags">
        {criticalAllergyCount ? (
          <span className="patient-card__allergy-badge" title="Critical allergy recorded in backend">
            Allergy
          </span>
        ) : null}
        {scoreBadges.map((score) => (
          <span
            key={score.id}
            className={`patient-card__score-badge patient-card__score-badge--${score.tone}`}
            title={`${score.toolName}: ${score.result ?? '--'} (${score.band || 'saved'}, ${formatScoreAge(score.timestamp)})`}
          >
            {score.shortLabel}: {score.result ?? '--'}
          </span>
        ))}
        {patient.flags.map((flag) => {
          const flagType = getPatientFlagType(flag);
          const Icon = FLAG_ICONS[flagType] || AlertTriangle;
          return (
            <span key={`${flagType}-${flag.detectedAt}`} title={flag.reason} aria-label={flagType}>
              <Icon size={12} aria-hidden />
            </span>
          );
        })}
      </div>
      {cardDiagnosis ? (
        <div className="patient-card__diagnosis" title={formatDiagnosis(cardDiagnosis)}>
          Dx: {formatDiagnosis(cardDiagnosis)}
        </div>
      ) : null}
      {hasBackendHoverData ? (
        <div className="patient-card__hover-summary" role="tooltip">
          <strong>Backend patient record</strong>
          <span className={criticalAllergyCount ? 'patient-card__hover-alert' : ''}>
            Allergies: {allergyCount || 'none returned'}
            {criticalAllergyCount ? ` (${criticalAllergyCount} critical)` : ''}
          </span>
          <span>Active medications: {medicationCount}</span>
          <span>Previous visits: {visitCount}</span>
          <small>{backendLoadLabel(patientBackendEntry)}</small>
        </div>
      ) : null}
    </article>
  );
}

export default memo(PatientCard);
