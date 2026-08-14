import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, TouchEvent } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Note,
  Patient,
  PatientFlag,
  PatientState,
  Priority,
  Room,
  Staff,
  Vitals,
  WorkflowActionLog,
} from '../types/emergency';
import { useEmergencyStore, workflowLogFromJourneyEvent } from '../store/emergencyStore';
import { dispatchAlert } from '../engine/alertEngine';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { EMPTY_STATE_COPY } from '../config/emptyStateCopy';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { usePhiViewAudit } from '../hooks/usePhiAccess';
import { useUpgradeHarnessPatientFlow } from '../hooks/useEmergencyOs';
import { usePatientTimelineContext } from '../hooks/usePatientTimelineContext';
import { advancePatientJourneyState, dischargePatientSafely, getDefaultNextPatientState } from '../services/queueAssignment';
import usePatientWorkflow from '../hooks/usePatientWorkflow';
import useProfileNavigate from '../hooks/useProfileNavigate';
import { notifyPatientStepAdvanced } from '../services/workflowNavigationFeedback';
import {
  confirmCareDroidAction,
  showActionSuccess,
} from '../services/careDroidInteractionFeedback';
import { STANDARD_ACTION_FEEDBACK } from '../config/careDroidInteractionModel';
import PatientExperienceStatusBadge from './patient-experience/PatientExperienceStatusBadge';
import QueueReasonBadge from './queues/QueueReasonBadge';
import { isInQueueFlow } from '../services/queueReasonVisibility';
import DeteriorationWatchBadge from './waiting-room/DeteriorationWatchBadge';
import WhatHappensNextPanel from './guidance/WhatHappensNextPanel';
import { buildPatientTimeline } from '../utils/patientTimeline';
import useUnifiedApplicationKnowledgeGraph from '../hooks/useUnifiedApplicationKnowledgeGraph';
import { hasRunScores, routeComplaint } from '../engine/complaintRouter';
import { findMatchingChecklists, type Checklist } from '../config/criticalChecklists';
import CriticalChecklist from './CriticalChecklist';
import SepsisBundleTracker from './SepsisBundleTracker';
import StrokeCodeProtocol from './StrokeCodeProtocol';
import WhoNextPanel from './WhoNextPanel';
import ErrorBoundary from './ErrorBoundary';
import AiTriageAssistPanel from './reception/AiTriageAssistPanel';
import OperationalHistoryPanel from './audit/OperationalHistoryPanel';
import WaitingRoomCommunicationPanel from './waiting-room/WaitingRoomCommunicationPanel';
import PatientDiscussionPanel from './collaboration/PatientDiscussionPanel';
import WaitingRoomCommunicationBadge from './waiting-room/WaitingRoomCommunicationBadge';
import {
  createWaitingRoomCommunicationLogInput,
  type WaitingRoomCommunicationKind,
} from '../services/waitingRoomCommunicationLog';
import DataQualityRiskPanel from './dataQuality/DataQualityRiskPanel';
import { buildDataQualitySnapshot, getPatientDataQualityRisks } from '../services/dataQualityDiscovery';
import ReassessmentTimerPanel from './reassessment/ReassessmentTimerPanel';
import { selectReassessmentTimerForPatient } from '../engine/reassessmentTimerEngine';
import RecommendedToolsStrip from './orchestration/RecommendedToolsStrip';
import SavedClinicalScoresStrip from './orchestration/SavedClinicalScoresStrip';
import PatientCardCopilot from './copilot/PatientCardCopilot';
import './PatientDetailPanel.css';

const HEARTScore = lazy(() => import('./calculators/HEARTScore'));
const QSOFA = lazy(() => import('./calculators/qSOFA'));
const PediatricDrugCalc = lazy(() => import('./calculators/PediatricDrugCalc'));

const priorityColors: Record<Priority, string> = {
  [Priority.P1]: '#EF4444',
  [Priority.P2]: '#F97316',
  [Priority.P3]: '#F59E0B',
  [Priority.P4]: '#10B981',
  [Priority.P5]: MEDICAL_THEME.inkMuted,
};

const patientStateOrder: PatientState[] = [
  PatientState.Arrival,
  PatientState.Registration,
  PatientState.Triage,
  PatientState.Waiting,
  PatientState.Assessment,
  PatientState.Orders,
  PatientState.Results,
  PatientState.Disposition,
  PatientState.Admission,
  PatientState.Discharge,
];

const emptyVitalsForm = {
  hr: '',
  sbp: '',
  dbp: '',
  spo2: '',
  temp: '',
  rr: '',
  gcs: '',
  pain: '',
};

type VitalsForm = typeof emptyVitalsForm;
type ActionMode = null | 'staff' | 'room';
type VitalsHistoryView = 'chart' | 'table';
type VitalsLineKey = 'hr' | 'spo2' | 'sbp' | 'temp';
type VitalTrend = {
  symbol: '↑' | '↓' | '→';
  color: string;
  label: string;
};
type VitalsChartPoint = {
  timestamp: string;
  time: string;
  hr?: number;
  spo2?: number;
  sbp?: number;
  dbp?: number;
  temp?: number;
  rr?: number;
  gcs?: number;
};
type UpgradeHarnessSignal = {
  capability: string;
  label?: string;
  confidence?: number;
  provenance?: { provider?: string; generatedBy?: string; evidenceWindow?: string };
  safety?: {
    status?: string;
    humanReviewMessage?: string;
    policyVersion?: string;
    autonomousActionsBlocked?: string[];
  };
  audit?: { immutableLedgerHash?: string; reviewRequired?: boolean };
  data?: Record<string, unknown>;
};
type UpgradePatientFlowEnvelope = {
  data?: {
    signals?: UpgradeHarnessSignal[];
  };
} | null;
type UpgradePatientFlowState = {
  data: UpgradePatientFlowEnvelope;
};

const vitalsLineConfig: Array<{ key: VitalsLineKey; label: string; color: string }> = [
  { key: 'hr', label: 'HR', color: '#EF4444' },
  { key: 'spo2', label: 'SpO2', color: MEDICAL_THEME.accent },
  { key: 'sbp', label: 'SBP', color: '#F59E0B' },
  { key: 'temp', label: 'Temp', color: '#10B981' },
];

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(value?: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatChartTime(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function initials(nameOrId: string): string {
  return nameOrId
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function staffName(staff: Staff[], staffId?: string | null): string {
  if (!staffId) return '';
  return staff.find((member) => member.id === staffId)?.name || staffId;
}

function workflowLogKeys(log: WorkflowActionLog, patientId: string): string[] {
  const keys: string[] = [];
  if (log.id) keys.push(`id:${log.id}`);
  if (log.timestamp && log.type) {
    keys.push(`stable:${log.patientId || patientId}:${log.timestamp}:${log.type}`);
  }
  return keys;
}

function mergePatientWorkflowLogs(patientId: string, ...groups: WorkflowActionLog[][]): WorkflowActionLog[] {
  const merged: WorkflowActionLog[] = [];
  const seenKeys = new Set<string>();

  groups.flat().forEach((log) => {
    const keys = workflowLogKeys(log, patientId);
    if (keys.some((key) => seenKeys.has(key))) return;
    merged.push(log);
    keys.forEach((key) => seenKeys.add(key));
  });

  return merged.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function journeyTimestamp(patient: Patient, state: PatientState): string | undefined {
  if (state === PatientState.Arrival) return patient.arrivalTime;
  if (state === PatientState.Triage) return patient.triageTime || undefined;
  return patient.timeline.find((event) => event.to === state)?.timestamp;
}

function hasPatientFlagValue(patient: Patient, flag: PatientFlag | string): boolean {
  return patient.flags.some((patientFlag) => String(patientFlag) === String(flag));
}

function hasStrokeCodeFlag(patient: Patient): boolean {
  return patient.flags.some((flag) => /stroke\s*code|strokecode|stroke_code/i.test(String(flag)));
}

function formatPatientFlag(flag: unknown): string {
  if (typeof flag === 'string') return flag;
  if (flag && typeof flag === 'object' && 'type' in flag) {
    const record = flag as { type?: string; reason?: string };
    return record.reason ? `${record.type}: ${record.reason}` : String(record.type ?? 'Flag');
  }
  return String(flag ?? 'Flag');
}

function patientFlagKey(flag: unknown): string {
  if (typeof flag === 'string') return flag;
  if (flag && typeof flag === 'object') {
    const record = flag as { type?: string; detectedAt?: string };
    return `${record.type ?? 'flag'}-${record.detectedAt ?? JSON.stringify(flag)}`;
  }
  return String(flag);
}

function findUpgradeSignal(signals: UpgradeHarnessSignal[], capability: string): UpgradeHarnessSignal | null {
  return signals.find((signal) => signal.capability === capability) || null;
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function formatConfidence(value?: number): string {
  return typeof value === 'number' ? `${Math.round(value * 100)}% confidence` : 'confidence pending';
}

function formatSignalMeta(signal?: UpgradeHarnessSignal | null): string {
  if (!signal) return 'review_required';
  const review = signal.audit?.reviewRequired ? 'review required' : signal.safety?.status || 'pilot';
  const provider = signal.provenance?.provider || signal.provenance?.generatedBy || 'deterministic provider';
  return `${review} | ${formatConfidence(signal.confidence)} | ${provider}`;
}

function vitalTone(label: string, value?: number): string {
  if (value === undefined) return MEDICAL_THEME.inkSubtle;
  if (label === 'SpO2' && value < 94) return '#EF4444';
  if (label === 'HR' && (value > 120 || value < 50)) return '#EF4444';
  if (label === 'SBP' && (value > 180 || value < 90)) return '#F59E0B';
  if (label === 'Temp' && (value >= 38 || value < 36)) return '#F59E0B';
  if (label === 'RR' && (value > 24 || value < 10)) return '#F59E0B';
  if (label === 'GCS' && value < 15) return '#F59E0B';
  return MEDICAL_THEME.ink;
}

function trendArrow(label: string, current?: number, previous?: number): VitalTrend | null {
  if (current === undefined || previous === undefined) return null;
  const diff = current - previous;
  const stable: VitalTrend = { symbol: '→', color: MEDICAL_THEME.inkSubtle, label: `${label} stable` };

  if (label === 'HR') {
    if (diff > 10) return { symbol: '↑', color: '#EF4444', label: 'HR trending up' };
    if (diff < -10) return { symbol: '↓', color: '#10B981', label: 'HR trending down' };
    return stable;
  }

  if (label === 'SpO2') {
    if (diff > 2) return { symbol: '↑', color: '#10B981', label: 'SpO2 trending up' };
    if (diff < -2) return { symbol: '↓', color: '#EF4444', label: 'SpO2 trending down' };
    return stable;
  }

  if (label === 'SBP') {
    const contextualColor = current < 90 ? '#EF4444' : current > 180 ? '#F59E0B' : '#10B981';
    if (diff > 15) return { symbol: '↑', color: contextualColor, label: 'SBP trending up' };
    if (diff < -15) return { symbol: '↓', color: contextualColor, label: 'SBP trending down' };
    return stable;
  }

  if (label === 'Temp') {
    if (diff > 0.5) return { symbol: '↑', color: '#F59E0B', label: 'Temperature trending up' };
    if (diff < -0.5) return { symbol: '↓', color: MEDICAL_THEME.accent, label: 'Temperature trending down' };
    return stable;
  }

  return null;
}

function TooltipRow({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="patient-detail-vitals-tooltip__row" style={{ color }}>
      <span>{label}</span>
      <span className="patient-detail-vitals-tooltip__mono">{value}</span>
    </div>
  );
}

function VitalsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: VitalsChartPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="patient-detail-vitals-tooltip">
      <div className="patient-detail-vitals-tooltip__time">{point.time}</div>
      <TooltipRow label="HR" value={point.hr ?? '--'} color={vitalTone('HR', point.hr)} />
      <TooltipRow label="BP" value={`${point.sbp ?? '--'}/${point.dbp ?? '--'}`} color={vitalTone('SBP', point.sbp)} />
      <TooltipRow label="SpO2" value={point.spo2 ?? '--'} color={vitalTone('SpO2', point.spo2)} />
      <TooltipRow label="Temp" value={point.temp ?? '--'} color={vitalTone('Temp', point.temp)} />
      <TooltipRow label="RR" value={point.rr ?? '--'} color={vitalTone('RR', point.rr)} />
      <TooltipRow label="GCS" value={point.gcs ?? '--'} color={vitalTone('GCS', point.gcs)} />
    </div>
  );
}

function VitalsHistoryChart({ vitals }: { vitals: Vitals[] }) {
  const [view, setView] = useState<VitalsHistoryView>('chart');
  const [hiddenLines, setHiddenLines] = useState<Record<VitalsLineKey, boolean>>({
    hr: false,
    spo2: false,
    sbp: false,
    temp: true,
  });

  if (vitals.length === 0) {
    return (
      <p className="patient-detail-vitals-empty">
        {EMPTY_STATE_COPY.vitals.none.title} — {EMPTY_STATE_COPY.vitals.none.guidance}
      </p>
    );
  }

  if (vitals.length === 1) {
    return (
      <p className="patient-detail-vitals-empty" role="status">
        <strong>{EMPTY_STATE_COPY.vitals.single.title}.</strong>{' '}
        {EMPTY_STATE_COPY.vitals.single.guidance} {EMPTY_STATE_COPY.vitals.single.nextSteps[0]}
      </p>
    );
  }

  const chartData: VitalsChartPoint[] = [...vitals].reverse().map((vital) => ({
    timestamp: vital.recordedAt,
    time: formatChartTime(vital.recordedAt),
    hr: vital.hr,
    spo2: vital.spo2,
    sbp: vital.sbp,
    dbp: vital.dbp,
    temp: vital.temp,
    rr: vital.rr,
    gcs: vital.gcs,
  }));

  const toggleLine = (key: VitalsLineKey) => {
    setHiddenLines((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="patient-detail-vitals-trend" aria-labelledby="vitals-trend-heading">
      <div className="patient-detail-vitals-trend__header">
        <h4 id="vitals-trend-heading" className="patient-detail-vitals-trend__title">
          Vitals Trend
        </h4>
        <div className="patient-detail-vitals-trend__toggle">
          {(['chart', 'table'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`patient-detail-vitals-trend__toggle-btn${view === mode ? ' patient-detail-vitals-trend__toggle-btn--active' : ''}`}
            >
              {mode === 'chart' ? 'Chart' : 'Table'}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? (
        <>
          <div className="patient-detail-vitals-trend__chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 2, left: -18 }}>
                <CartesianGrid stroke="#e0f2fe" strokeOpacity={0.45} vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: MEDICAL_THEME.inkSubtle, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0f2fe' }}
                />
                <YAxis
                  tick={{ fill: MEDICAL_THEME.inkSubtle, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0f2fe' }}
                  width={36}
                />
                <Tooltip content={<VitalsTooltip />} cursor={{ stroke: '#e0f2fe', strokeDasharray: '3 3' }} />
                <ReferenceLine y={94} stroke={MEDICAL_THEME.accent} strokeDasharray="4 4" strokeOpacity={0.45} />
                <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.4} />
                <ReferenceLine y={90} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.45} />
                {vitalsLineConfig.map((line) => (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    name={line.label}
                    stroke={line.color}
                    strokeWidth={2}
                    dot={false}
                    hide={hiddenLines[line.key]}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="patient-detail-vitals-trend__legend" aria-label="Toggle vitals trend lines">
            {vitalsLineConfig.map((line) => (
              <button
                key={line.key}
                type="button"
                onClick={() => toggleLine(line.key)}
                className={`patient-detail-vitals-trend__legend-btn${hiddenLines[line.key] ? ' patient-detail-vitals-trend__legend-btn--hidden' : ''}`}
              >
                <span
                  aria-hidden
                  className="patient-detail-vitals-trend__legend-swatch"
                  style={{
                    background: line.color,
                    opacity: hiddenLines[line.key] ? 0.35 : 1,
                  }}
                />
                {line.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="patient-detail-vitals-trend__table-wrap">
          <table className="patient-detail-vitals-trend__table">
            <thead>
              <tr>
                {['Time', 'HR', 'BP', 'SpO2', 'Temp', 'RR', 'GCS'].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((point) => (
                <tr key={point.timestamp}>
                  <td>{point.time}</td>
                  <td style={{ color: vitalTone('HR', point.hr) }}>{point.hr ?? '--'}</td>
                  <td style={{ color: vitalTone('SBP', point.sbp) }}>
                    {point.sbp ?? '--'}/{point.dbp ?? '--'}
                  </td>
                  <td style={{ color: vitalTone('SpO2', point.spo2) }}>{point.spo2 ?? '--'}</td>
                  <td style={{ color: vitalTone('Temp', point.temp) }}>{point.temp ?? '--'}</td>
                  <td style={{ color: vitalTone('RR', point.rr) }}>{point.rr ?? '--'}</td>
                  <td style={{ color: vitalTone('GCS', point.gcs) }}>{point.gcs ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function parseVitals(form: VitalsForm, recordedBy: string): Vitals {
  const numeric = (value: string): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    hr: numeric(form.hr),
    sbp: numeric(form.sbp),
    dbp: numeric(form.dbp),
    spo2: numeric(form.spo2),
    temp: numeric(form.temp),
    rr: numeric(form.rr),
    gcs: numeric(form.gcs),
    pain: numeric(form.pain),
    recordedAt: new Date().toISOString(),
    recordedBy,
  };
}

function Badge({ children, color }: { children: string; color: string }) {
  return (
    <span className="patient-detail-panel__badge" style={{ '--badge-accent': color } as CSSProperties}>
      {children}
    </span>
  );
}

function FieldButton({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  className = '',
  title,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`patient-detail-panel__field-btn${variant === 'primary' ? ' patient-detail-panel__field-btn--primary' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  );
}

export default function PatientDetailPanel() {
  const emergencyRole = useEmergencyRolePermissions();
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const alerts = useEmergencyStore((state) => state.alerts);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const movePatientToState = useEmergencyStore((state) => state.movePatientToState);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const assignRoom = useEmergencyStore((state) => state.assignRoom);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const removeFlag = useEmergencyStore((state) => state.removeFlag);
  const addVitals = useEmergencyStore((state) => state.addVitals);
  const addNote = useEmergencyStore((state) => state.addNote);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const recordWorkflowAction = useEmergencyStore((state) => state.recordWorkflowAction);
  const recordWaitingRoomCommunication = useEmergencyStore(
    (state) => state.recordWaitingRoomCommunication,
  );
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalsForm, setVitalsForm] = useState<VitalsForm>(emptyVitalsForm);
  const [flagToAdd, setFlagToAdd] = useState<PatientFlag>(PatientFlag.ReassessmentDue);
  const [noteText, setNoteText] = useState('');
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [heartScoreOpen, setHeartScoreOpen] = useState(false);
  const [qsofaOpen, setQsofaOpen] = useState(false);
  const [pediatricDrugCalcOpen, setPediatricDrugCalcOpen] = useState(false);
  const [criticalChecklistOpen, setCriticalChecklistOpen] = useState(false);
  const [activeCriticalChecklist, setActiveCriticalChecklist] = useState<Checklist | null>(null);
  const [criticalChecklistTitleHint, setCriticalChecklistTitleHint] = useState<string | undefined>();
  const [autoOpenedChecklistKey, setAutoOpenedChecklistKey] = useState('');
  const [suggestedScores, setSuggestedScores] = useState<string[]>([]);
  const swipeStartYRef = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const { profileNavigate } = useProfileNavigate();
  const patientWorkflow = usePatientWorkflow(selectedPatientId);
  const upgradePatientFlow = useUpgradeHarnessPatientFlow(
    selectedPatientId,
  ) as UpgradePatientFlowState;
  const upgradePatientFlowEnvelope = upgradePatientFlow.data;
  const transitionPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.transitionPatient);
  const vitalsPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.writeVitals);
  const notePresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.writeNote);
  const flagsPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.manageFlags);
  const assignStaffPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.assignStaff);
  const assignRoomPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.assignRoom);
  const escalatePresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.escalatePatient);
  const dischargePresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.dischargePatient);
  const canTransition = transitionPresentation.enabled;
  const canWriteVitals = vitalsPresentation.enabled;
  const canWriteNote = notePresentation.enabled;
  const canManageFlags = flagsPresentation.enabled;
  const canAssignStaff = assignStaffPresentation.enabled;
  const canAssignRoom = assignRoomPresentation.enabled;
  const canEscalate = escalatePresentation.enabled;
  const canDischarge = dischargePresentation.enabled;

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );
  usePhiViewAudit(selectedPatient?.id, {
    source: 'PatientDetailPanel',
    staffId: emergencyRole.canonicalProfile?.id,
  });
  const openCalculatorHub = useCallback((calculatorId: string) => {
    if (!selectedPatientId) return;
    const params = new URLSearchParams({
      source: 'calculators',
      filter: 'calculator',
      q: calculatorId,
      patientId: selectedPatientId,
    });
    const nextUrl = `${CANONICAL_ROUTES.emergencyTools}?${params.toString()}`;
    window.history.pushState(null, '', nextUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [selectedPatientId]);
  const timelineContextState = usePatientTimelineContext(selectedPatientId);
  const knowledgeGraph = useUnifiedApplicationKnowledgeGraph({ selectedPatientId });
  const patientWorkflowLogs = useMemo(() => {
    if (!selectedPatient) return [];
    const generatedLogs = selectedPatient.timeline.map((event) =>
      workflowLogFromJourneyEvent(event, selectedPatient, staff),
    );
    const localLogs = workflowLogs.filter((log) => log.patientId === selectedPatient.id);
    const backendLogs = (timelineContextState.context.workflowLogs || []).filter(
      (log) => !log.patientId || log.patientId === selectedPatient.id,
    );
    return mergePatientWorkflowLogs(selectedPatient.id, localLogs, generatedLogs, backendLogs);
  }, [selectedPatient, staff, timelineContextState.context.workflowLogs, workflowLogs]);

  const dataQualitySnapshot = useMemo(() => buildDataQualitySnapshot(patients), [patients]);
  const patientQualitySnapshot = useMemo(() => {
    if (!selectedPatient) return null;
    const risks = getPatientDataQualityRisks(selectedPatient, dataQualitySnapshot).map((risk) => ({
      ...risk,
      patientId: selectedPatient.id,
      patientLabel:
        [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ').trim() ||
        selectedPatient.name ||
        selectedPatient.mrn,
    }));
    const byCategory = risks.reduce(
      (counts, risk) => {
        counts[risk.category] = (counts[risk.category] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );
    return {
      duplicatePairs: dataQualitySnapshot.duplicatePairs.filter(
        (pair) => pair.patientIdA === selectedPatient.id || pair.patientIdB === selectedPatient.id,
      ),
      duplicatePatientIds: dataQualitySnapshot.duplicatePatientIds,
      summary: {
        byCategory,
        patientsWithRisks: risks.length ? 1 : 0,
        totalRisks: risks.length,
      },
      topRisks: risks,
    };
  }, [dataQualitySnapshot, selectedPatient]);

  const patientTimeline = useMemo(
    () =>
      selectedPatient
        ? buildPatientTimeline(
            selectedPatient,
            knowledgeGraph.enrichTimelineContext(selectedPatient.id, {
              ...timelineContextState.context,
              staff,
              alerts,
              workflowLogs: patientWorkflowLogs,
            }),
          )
        : [],
    [
      alerts,
      knowledgeGraph,
      patientWorkflowLogs,
      selectedPatient,
      staff,
      timelineContextState.context,
    ],
  );
  const upgradeFlowSignals = useMemo(
    () => upgradePatientFlowEnvelope?.data?.signals || [],
    [upgradePatientFlowEnvelope],
  );
  const upgradeFlowCards = useMemo(() => {
    const modularSignal = findUpgradeSignal(
      upgradeFlowSignals,
      'modular_mixed_pathology_units',
    );
    const vvtSignal = findUpgradeSignal(upgradeFlowSignals, 'virtual_visit_track');
    const splitFlowSignal = findUpgradeSignal(upgradeFlowSignals, 'nurse_led_split_flow');
    const wearableSignal = findUpgradeSignal(upgradeFlowSignals, 'wearable_iomt_processing');
    const vvtCandidates = recordArray(vvtSignal?.data?.candidates);
    const splitLanes = recordArray(splitFlowSignal?.data?.lanes);
    const wearableAlerts = recordArray(wearableSignal?.data?.alerts);
    const selectedId = selectedPatientId ? String(selectedPatientId) : '';
    const selectedUnits = recordArray(modularSignal?.data?.units).filter((unit) =>
      stringArray(unit.patientIds).includes(selectedId),
    );

    return [
      modularSignal
        ? {
            title: 'Modular unit',
            body: selectedUnits.length
              ? `Patient appears in ${selectedUnits.length} mixed-pathology review module.`
              : 'Patient reviewed against mixed-pathology module rules.',
            meta: formatSignalMeta(modularSignal),
          }
        : null,
      vvtSignal
        ? {
            title: 'Virtual visit track',
            body: vvtCandidates.length
              ? 'Virtual-visit candidate held for RN/MD suitability review.'
              : 'No virtual-visit candidate generated for this patient.',
            meta: formatSignalMeta(vvtSignal),
          }
        : null,
      splitFlowSignal
        ? {
            title: 'Nurse-led split flow',
            body: `${splitLanes.length} operational lanes evaluated without changing orders or disposition.`,
            meta: formatSignalMeta(splitFlowSignal),
          }
        : null,
      wearableSignal
        ? {
            title: 'Wearable IoMT',
            body: wearableAlerts.length
              ? `${wearableAlerts.length} vitals-derived alert(s) require review.`
              : 'No wearable-style vitals alerts for this patient.',
            meta: `${formatSignalMeta(wearableSignal)} | audit ${
              wearableSignal.audit?.immutableLedgerHash?.slice(0, 10) || 'pilot-audit'
            }`,
          }
        : null,
    ].filter((card): card is { title: string; body: string; meta: string } => Boolean(card));
  }, [selectedPatientId, upgradeFlowSignals]);

  useEffect(() => {
    if (!selectedPatient) {
      setSuggestedScores([]);
      return;
    }

    const route = routeComplaint(selectedPatient.chiefComplaint);
    setSuggestedScores(route && !hasRunScores(selectedPatient, route.scoreIds) ? route.scoreIds : []);
  }, [selectedPatient]);

  useEffect(() => {
    if (!selectedPatient) {
      setCriticalChecklistOpen(false);
      setActiveCriticalChecklist(null);
      setCriticalChecklistTitleHint(undefined);
      return;
    }

    if (hasPatientFlagValue(selectedPatient, PatientFlag.SepsisAlert)) return;

    if (hasStrokeCodeFlag(selectedPatient)) {
      const autoKey = `${selectedPatient.id}:stroke-code`;
      if (autoOpenedChecklistKey === autoKey) return;
      setActiveCriticalChecklist(null);
      setCriticalChecklistTitleHint('StrokeCode checklist pending configuration');
      setCriticalChecklistOpen(true);
      setAutoOpenedChecklistKey(autoKey);
      return;
    }

    const isEmsPatient =
      selectedPatient.source === 'EMS' ||
      hasPatientFlagValue(selectedPatient, PatientFlag.EMSArrival) ||
      Boolean(selectedPatient.emsArrival || selectedPatient.emsUnitId);
    const isCriticalArrival = selectedPatient.emsArrival?.severity === 'Critical' || selectedPatient.priority === Priority.P1;
    if (!isEmsPatient || !isCriticalArrival) return;

    const matches = findMatchingChecklists(selectedPatient);
    if (matches.length === 0) return;

    const autoKey = `${selectedPatient.id}:${matches.map((match) => match.id).join(',')}`;
    if (autoOpenedChecklistKey === autoKey) return;

    setActiveCriticalChecklist(matches.length === 1 ? matches[0] : null);
    setCriticalChecklistTitleHint(undefined);
    setCriticalChecklistOpen(true);
    setAutoOpenedChecklistKey(autoKey);
  }, [autoOpenedChecklistKey, selectedPatient]);

  const actorStaffId = selectedPatient?.assignedStaffId || staff[0]?.id || 'system';

  const confirmEscalatePatient = useCallback(async () => {
    if (!canEscalate || !selectedPatient) return;
    const patientLabel = `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim();
    const confirmed = await confirmCareDroidAction({
      title: 'Escalate patient?',
      message: `${patientLabel} will be escalated and a critical alert will be created.`,
      confirmLabel: 'Confirm escalation',
      tone: 'danger',
    });
    if (!confirmed) return;

    dispatchAlert({
      id: createId('alert'),
      severity: 'Critical',
      title: 'Patient escalated',
      message: `${patientLabel} was escalated for urgent review.`,
      patientId: selectedPatient.id,
      source: 'patient-detail-panel',
    });
    recordWorkflowAction(
      createWaitingRoomCommunicationLogInput({
        kind: 'concern-escalated',
        patientId: selectedPatient.id,
        summary: `${patientLabel} escalated for urgent review.`,
        severity: 'Critical',
      }),
    );
    addFlag(selectedPatient.id, PatientFlag.HighRisk);
    showActionSuccess('Patient escalated', 'Critical alert created for urgent review.');
  }, [addFlag, canEscalate, recordWorkflowAction, selectedPatient]);

  const confirmDischargePatient = useCallback(async () => {
    if (!canDischarge || !selectedPatient) return;
    const patientLabel = `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim();
    const confirmed = await confirmCareDroidAction({
      title: 'Discharge patient?',
      message: `${patientLabel} will be marked discharged.`,
      confirmLabel: 'Confirm discharge',
      tone: 'danger',
    });
    if (!confirmed) return;

    dischargePatientSafely(selectedPatient.id, {
      actorId: actorStaffId,
      note: 'Discharged from detail panel',
    });
    showActionSuccess(STANDARD_ACTION_FEEDBACK.patientAdvanced, 'Patient discharged.');
  }, [actorStaffId, canDischarge, selectedPatient]);

  useEffect(() => {
    const openDischargeConfirmation = () => {
      if (selectedPatientId && canDischarge) void confirmDischargePatient();
    };

    document.addEventListener('open-patient-discharge', openDischargeConfirmation);
    return () => document.removeEventListener('open-patient-discharge', openDischargeConfirmation);
  }, [canDischarge, confirmDischargePatient, selectedPatientId]);

  // HEAL-206: this panel is mounted unconditionally in AppShell.tsx for
  // every non-kiosk, non-registration route (including /settings, /admin,
  // /audit) and renders as soon as selectedPatientId is set in the shared
  // store -- usePhiViewAudit above only logs a phi-access-denied event, it
  // never blocks rendering. A role that can reach selectedPatientId through
  // any surface (the command palette / header search fixes above close the
  // ones found so far) would otherwise see a full patient chart -- vitals,
  // notes, flags -- with zero gate. Mirrors Header.tsx's canOpenPatients.
  if (!selectedPatient || !emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyPatients)) {
    return null;
  }

  const currentStateIndex = patientStateOrder.indexOf(selectedPatient.state);
  const patientVitals: Vitals[] = Array.isArray(selectedPatient.vitals) ? selectedPatient.vitals : [];
  const vitalsHistory = [...patientVitals].reverse();
  const latestVitals = vitalsHistory[0];
  const previousVitals = vitalsHistory[1];
  const latestVitalEntries: Array<{ label: string; value?: number; trend?: VitalTrend | null }> = [
    { label: 'HR', value: latestVitals?.hr, trend: trendArrow('HR', latestVitals?.hr, previousVitals?.hr) },
    { label: 'SBP', value: latestVitals?.sbp, trend: trendArrow('SBP', latestVitals?.sbp, previousVitals?.sbp) },
    { label: 'DBP', value: latestVitals?.dbp },
    { label: 'SpO2', value: latestVitals?.spo2, trend: trendArrow('SpO2', latestVitals?.spo2, previousVitals?.spo2) },
    { label: 'Temp', value: latestVitals?.temp, trend: trendArrow('Temp', latestVitals?.temp, previousVitals?.temp) },
    { label: 'RR', value: latestVitals?.rr },
    { label: 'GCS', value: latestVitals?.gcs },
    { label: 'Pain', value: latestVitals?.pain },
  ];
  const checklistStaffId = selectedPatient.assignedStaffId || staff[0]?.id || 'current-staff';
  const isSepsisChecklistBlocked = hasPatientFlagValue(selectedPatient, PatientFlag.SepsisAlert);
  const sortedNotes = [...selectedPatient.notes].sort(
    (a, b) =>
      new Date(b.timestamp || b.createdAt || 0).getTime() -
      new Date(a.timestamp || a.createdAt || 0).getTime(),
  );

  const submitVitals = (event: FormEvent) => {
    event.preventDefault();
    if (!canWriteVitals) return;
    const vitals = parseVitals(vitalsForm, actorStaffId);
    addVitals(selectedPatient.id, vitals);
    const { spo2, hr, sbp } = vitals;
    const hasCriticalVitals =
      (spo2 !== undefined && spo2 < 88) ||
      (hr !== undefined && (hr < 40 || hr > 150)) ||
      (sbp !== undefined && sbp < 80);

    if (hasCriticalVitals) {
      dispatchAlert({
        severity: 'Critical',
        title: `Critical Vitals — ${selectedPatient.firstName}`,
        message: `SpO2 ${spo2 ?? '--'}%, HR ${hr ?? '--'}, BP ${sbp ?? '--'}`,
        patientId: selectedPatient.id,
        source: 'patient-detail-panel',
      });
      addFlag(selectedPatient.id, PatientFlag.DeteriorationRisk);
    }

    setVitalsForm(emptyVitalsForm);
    setShowVitalsForm(false);
  };

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!canWriteNote) return;
    const text = noteText.trim();
    if (!text) return;

    const note: Note = {
      id: createId('note'),
      text,
      authorId: actorStaffId,
      timestamp: new Date().toISOString(),
    };

    addNote(selectedPatient.id, note);
    setNoteText('');
  };

  const openManualChecklist = () => {
    const matches = findMatchingChecklists(selectedPatient);
    setActiveCriticalChecklist(matches.length === 1 ? matches[0] : null);
    setCriticalChecklistTitleHint(undefined);
    setCriticalChecklistOpen(true);
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) return;
    swipeStartYRef.current = event.touches[0].clientY;
    setSwipeOffset(0);
  };

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (swipeStartYRef.current === null || event.touches.length !== 1) return;
    const deltaY = event.touches[0].clientY - swipeStartYRef.current;
    setSwipeOffset(Math.max(0, Math.min(deltaY, 180)));
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 90) {
      selectPatient(null);
    }
    swipeStartYRef.current = null;
    setSwipeOffset(0);
  };

  const panelSwipeStyle: CSSProperties | undefined =
    swipeOffset > 0
      ? { transform: `translateY(${swipeOffset}px)`, transition: 'none' }
      : undefined;

  return (
    <aside
      className="patient-detail-panel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={panelSwipeStyle}
    >
      <div className="patient-detail-panel__drag-handle" aria-hidden="true" />
      <header className="patient-detail-panel__header">
        <div className="patient-detail-panel__header-top">
          <div>
            <h2 className="patient-detail-panel__title">
              {selectedPatient.firstName} {selectedPatient.lastName}
            </h2>
            <div className="patient-detail-panel__mrn">{selectedPatient.mrn}</div>
            {selectedPatient.state === PatientState.Waiting || selectedPatient.state === PatientState.Triage ? (
              <div className="patient-detail-panel__header-slot">
                <WaitingRoomCommunicationBadge
                  patient={selectedPatient}
                  workflowLogs={patientWorkflowLogs}
                  staff={staff}
                />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => selectPatient(null)}
            aria-label="Close patient detail"
            className="patient-detail-panel__close-btn"
          >
            X
          </button>
        </div>

        <div className="patient-detail-panel__badge-row">
          <Badge color={priorityColors[selectedPatient.priority]}>{selectedPatient.priority}</Badge>
          <Badge color={MEDICAL_THEME.inkSubtle}>{selectedPatient.state}</Badge>
          <PatientExperienceStatusBadge
            patient={selectedPatient}
            referrals={referrals}
            showStaffDetail
          />
          {isInQueueFlow(selectedPatient) ? (
            <QueueReasonBadge
              patient={selectedPatient}
              referrals={referrals}
              staff={staff}
              showAll
            />
          ) : null}
          <DeteriorationWatchBadge
            patient={selectedPatient}
            emsArrivals={emsArrivals}
          />
        </div>

        {/* HEAL-188: allergies/medications previously existed only as free text inside the
            reception/self-arrival intake note, invisible to any other role opening this same
            chart -- now reads the structured fields those intake paths populate. Placed right
            under the header badges (before any other section) since a missed allergy is a
            direct patient-safety risk, not just a documentation gap. */}
        {selectedPatient.allergies?.length ? (
          <div className="patient-detail-panel__allergy-banner" role="alert">
            <strong>Allergies:</strong> {selectedPatient.allergies.join(', ')}
          </div>
        ) : null}
        {selectedPatient.medications?.length ? (
          <div className="patient-detail-panel__medications-banner">
            <strong>Current medications:</strong> {selectedPatient.medications.join(', ')}
          </div>
        ) : null}

        {/* HEAL-189: EMS crew handoff notes and the receiving clinician's closing notes were
            captured (AmbulanceHandoffChecklist.handoffNotes / HandoffCloseRecord.notes) but never
            surfaced anywhere on the patient's own chart -- only visible by navigating back to the
            EMS pipeline/handoff screens the receiving team had already left. */}
        {selectedPatient.emsArrival?.ambulanceHandoffChecklist?.handoffNotes ||
        selectedPatient.emsArrival?.handoffClose?.notes ? (
          <div className="patient-detail-panel__ems-handoff-notes">
            <strong>EMS handoff notes:</strong>
            {selectedPatient.emsArrival.ambulanceHandoffChecklist?.handoffNotes ? (
              <p>{selectedPatient.emsArrival.ambulanceHandoffChecklist.handoffNotes}</p>
            ) : null}
            {selectedPatient.emsArrival.handoffClose?.notes ? (
              <p>
                Receiving clinician
                {selectedPatient.emsArrival.handoffClose.closedByStaffName
                  ? ` (${selectedPatient.emsArrival.handoffClose.closedByStaffName})`
                  : ''}
                : {selectedPatient.emsArrival.handoffClose.notes}
              </p>
            ) : null}
          </div>
        ) : null}

        <WhatHappensNextPanel
          patient={selectedPatient}
          referrals={referrals}
          staff={staff}
        />

        <div className="patient-detail-panel__orchestration-cluster">
          <SavedClinicalScoresStrip patient={selectedPatient} />
          <RecommendedToolsStrip patient={selectedPatient} />
        </div>

        <PatientCardCopilot patient={selectedPatient} />

        {/* HEAL-191: previously rendered far below (after Journey Timeline, Patient Timeline,
            Data Quality, Waiting Room Communication, Operational History, and Discussion Panel) --
            a clinician using the AI triage-assist tool immediately below had to scroll past 6
            unrelated sections to see the vitals that decision should be grounded in. Moved up next
            to the triage-acuity decision UI itself; same section, same data, same controls --
            position only, nothing duplicated or removed. */}
        <section className="patient-detail-panel__section">
          <div className="patient-detail-panel__section-header">
            <h3 className="patient-detail-panel__section-title patient-detail-panel__section-title--flush">Latest Vitals</h3>
            {vitalsPresentation.visible ? (
            <FieldButton disabled={!canWriteVitals} onClick={() => setShowVitalsForm((open) => !open)}>Add Vitals</FieldButton>
            ) : null}
          </div>

          <div className="patient-detail-vitals-grid">
            {latestVitalEntries.map(({ label, value, trend }) => (
              <div key={label} className="patient-detail-vital-tile">
                <div className="patient-detail-vital-tile__label">{label}</div>
                <div
                  className="patient-detail-vital-tile__value"
                  style={{
                    color: vitalTone(String(label), typeof value === 'number' ? value : undefined),
                  }}
                >
                  <span>{value ?? '--'}</span>
                  {trend ? (
                    <span
                      aria-label={trend.label}
                      title={trend.label}
                      className="patient-detail-vital-tile__trend"
                      style={{ color: trend.color }}
                    >
                      {trend.symbol}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <VitalsHistoryChart vitals={vitalsHistory} />

          {showVitalsForm && canWriteVitals ? (
            <form onSubmit={submitVitals} className="patient-detail-vitals-form">
              {Object.keys(emptyVitalsForm).map((key) => (
                <input
                  key={key}
                  aria-label={key.toUpperCase()}
                  placeholder={key.toUpperCase()}
                  value={vitalsForm[key as keyof VitalsForm]}
                  onChange={(event) => setVitalsForm((form) => ({ ...form, [key]: event.target.value }))}
                  className="patient-detail-vitals-form__input"
                />
              ))}
              <button type="submit" className="patient-detail-panel__field-btn patient-detail-panel__field-btn--primary patient-detail-vitals-form__submit">
                Save Vitals
              </button>
            </form>
          ) : null}
        </section>

        {selectedPatient.state === PatientState.Triage ? (
          <div className="patient-detail-panel__header-slot">
            <AiTriageAssistPanel patient={selectedPatient} />
          </div>
        ) : null}

        <div className="patient-detail-panel__action-row">
          {!isSepsisChecklistBlocked ? (
            <FieldButton onClick={openManualChecklist}>Open Checklist</FieldButton>
          ) : null}
          {transitionPresentation.visible ? (
          <FieldButton
            className="patient-detail-panel__field-btn--push-end"
            title={canTransition ? 'Move to the next patient state' : `${emergencyRole.roleLabel} cannot move patient state`}
            onClick={() => {
              const nextState = getDefaultNextPatientState(selectedPatient);
              if (!nextState || !canTransition) return;
              advancePatientJourneyState(selectedPatient.id, nextState, {
                actorId: actorStaffId,
                note:
                  nextState === PatientState.Waiting
                    ? 'Advanced from patient detail panel into waiting queue.'
                    : 'Advanced from patient detail panel',
              });
              const patientName =
                [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ').trim() ||
                selectedPatient.mrn;
              notifyPatientStepAdvanced(patientName, nextState, {
                nextRoute: patientWorkflow.nextRoute ?? undefined,
                onNavigate: profileNavigate,
              });
            }}
            disabled={!canTransition || !getDefaultNextPatientState(selectedPatient)}
          >
            {patientWorkflow.primaryAction || 'Move to next step'}
          </FieldButton>
          ) : null}
        </div>
      </header>

      <section className="patient-detail-panel__section">
        <h3 className="patient-detail-panel__section-title">Journey Timeline</h3>
        <div className="patient-detail-journey">
          <div className="patient-detail-journey__track">
            {patientStateOrder.map((state, index) => {
              const completed = index < currentStateIndex;
              const current = state === selectedPatient.state;
              const timestamp = completed ? journeyTimestamp(selectedPatient, state) : undefined;

              return (
                <div key={state} className="patient-detail-journey__step">
                  {index < patientStateOrder.length - 1 ? (
                    <div
                      className={`patient-detail-journey__connector${completed ? ' patient-detail-journey__connector--complete' : ''}`}
                    />
                  ) : null}
                  <div
                    className={[
                      'patient-detail-journey__dot',
                      current ? 'patient-detail-timeline-dot--current patient-detail-journey__dot--active' : '',
                      completed ? 'patient-detail-journey__dot--complete' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                  <div className={`patient-detail-journey__label${current ? ' patient-detail-journey__label--current' : ''}`}>
                    {state}
                  </div>
                  {timestamp ? (
                    <div className="patient-detail-journey__time">{formatTime(timestamp)}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {selectedPatient.state === PatientState.Waiting ? (
        <section className="patient-detail-panel__section">
          <ReassessmentTimerPanel
            timer={selectReassessmentTimerForPatient(selectedPatient)}
            onOpenReassessment={(patientId: string) => {
              selectPatient(patientId);
              document.dispatchEvent(new Event('open-reassessment-drawer'));
            }}
          />
        </section>
      ) : null}

      <section className="patient-detail-panel__section" aria-labelledby="patient-timeline-heading">
        <div className="patient-detail-panel__section-header">
          <div>
            <h3 id="patient-timeline-heading" className="patient-detail-panel__section-title patient-detail-panel__section-title--flush">
              Patient Timeline
            </h3>
            <p className="patient-detail-panel__section-lead">
              Intake, journey, triage, queue, reassessment, EMS, referral, boarding, discharge, AI, and provincial events.
            </p>
          </div>
          <span className="patient-detail-panel__section-meta">{patientTimeline.length} events</span>
        </div>

        {timelineContextState.loading ? (
          <div role="status" className="patient-timeline-status patient-timeline-status--loading">
            Loading timeline enrichment from CareDroid modules...
          </div>
        ) : null}

        {timelineContextState.error ? (
          <div role="alert" className="patient-timeline-status patient-timeline-status--error">
            {timelineContextState.error}. Showing local patient timeline fallback.
          </div>
        ) : null}

        {patientTimeline.length ? (
          <ol className="patient-timeline-list" aria-label="Patient timeline events">
            {patientTimeline.map((item) => (
              <li key={`${item.id}-${item.category}`} className={`patient-timeline-item patient-timeline-item--${item.category}`}>
                <div className="patient-timeline-item__marker" aria-hidden />
                <div className="patient-timeline-item__body">
                  <div className="patient-timeline-item__header">
                    <span className="patient-timeline-item__category">{item.label}</span>
                    <time dateTime={item.timestamp}>{formatTime(item.timestamp)}</time>
                  </div>
                  <div className="patient-timeline-item__summary">{item.summary}</div>
                  <div className="patient-timeline-item__meta">
                    <span>{item.source}</span>
                    {item.actor ? <span>{item.actor}</span> : null}
                    {item.severity ? <span>{item.severity}</span> : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="patient-timeline-empty">No patient timeline events are available yet.</div>
        )}
      </section>

      {patientQualitySnapshot?.summary.patientsWithRisks ? (
        <section className="patient-detail-panel__section">
          <DataQualityRiskPanel
            snapshot={patientQualitySnapshot}
            title="Data quality"
            description="Registration gaps for this patient — demographics, arrival reason, verification, or duplicate match."
            limit={6}
            onVerifyPatient={() => {
              const params = new URLSearchParams({
                step: 'verify',
                patient: selectedPatient.id,
              });
              window.history.pushState(null, '', `${CANONICAL_ROUTES.emergencyReception}?${params}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            onCaptureComplaint={() => selectPatient(selectedPatient.id)}
            onReviewDuplicate={() => selectPatient(selectedPatient.id)}
          />
        </section>
      ) : null}

      <section className="patient-detail-panel__section">
        <WaitingRoomCommunicationPanel
          patient={selectedPatient}
          workflowLogs={patientWorkflowLogs}
          staff={staff}
          limit={10}
          readOnly={!canWriteNote}
          onRecordCommunication={async ({ kind, summary }: { kind: WaitingRoomCommunicationKind; summary: string }) => {
            recordWaitingRoomCommunication({
              kind,
              patientId: selectedPatient.id,
              summary,
              actorStaffId,
            });
          }}
        />
      </section>

      <section className="patient-detail-panel__section">
        <OperationalHistoryPanel
          logs={patientWorkflowLogs}
          patientId={selectedPatient.id}
          title="Operational history"
          description="Patient actions, queue moves, reassessments, and referrals from workflow audit data."
          limit={10}
        />
      </section>

      <section className="patient-detail-panel__section">
        <PatientDiscussionPanel patientId={selectedPatient.id} />
      </section>

      {upgradeFlowCards.length ? (
        <section className="patient-detail-panel__section">
          <h3 className="patient-detail-panel__section-title">Pilot signals</h3>
          <ul className="patient-detail-upgrade-list">
            {upgradeFlowCards.map((card) => (
              <li key={card.title} className="patient-detail-upgrade-row">
                <div className="patient-detail-upgrade-row__main">
                  <strong>{card.title}</strong>
                  <span>{card.body}</span>
                </div>
                <small>{card.meta}</small>
              </li>
            ))}
          </ul>
          <p className="patient-detail-upgrade-footnote">
            Pilot-only outputs require human review and cannot diagnose, prescribe, disposition, or
            match patients autonomously.
          </p>
        </section>
      ) : null}

      <section className="patient-detail-panel__section">
        <h3 className="patient-detail-panel__section-title">Active Flags</h3>
        <div className="patient-detail-flags">
          {selectedPatient.flags.map((flag) => (
            <span key={patientFlagKey(flag)} className="patient-detail-flag-chip">
              {formatPatientFlag(flag)}
              <button
                type="button"
                onClick={() => {
                  if (canManageFlags) removeFlag(selectedPatient.id, flag);
                }}
                disabled={!canManageFlags}
                aria-label={`Remove ${formatPatientFlag(flag)}`}
                className="patient-detail-flag-chip__remove"
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="patient-detail-flags-form">
          <select
            value={flagToAdd}
            onChange={(event) => setFlagToAdd(event.target.value as PatientFlag)}
            disabled={!canManageFlags}
            className="patient-detail-panel__select"
          >
            {Object.values(PatientFlag).map((flag) => (
              <option key={flag} value={flag}>{flag}</option>
            ))}
          </select>
          <FieldButton disabled={!canManageFlags} onClick={() => addFlag(selectedPatient.id, flagToAdd)}>Add Flag</FieldButton>
        </div>
      </section>

      <SepsisBundleTracker patient={selectedPatient} />

      <StrokeCodeProtocol
        patient={selectedPatient}
        canManageFlags={canManageFlags}
        canWriteNote={canWriteNote}
        onOpenCalculator={openCalculatorHub}
      />

      <section className="patient-detail-panel__section">
        <h3 className="patient-detail-panel__section-title">Notes</h3>
        <div className="patient-detail-notes">
          {sortedNotes.map((note) => (
            <div key={note.id} className="patient-detail-note-row">
              <div className="patient-detail-note-row__header">
                <span>{initials(staffName(staff, note.authorId || note.authorStaffId || 'system'))}</span>
                <span>{formatTime(note.timestamp)}</span>
              </div>
              <div className="patient-detail-note-row__body">{note.text || note.body}</div>
            </div>
          ))}
        </div>
        <form onSubmit={submitNote} className="patient-detail-note-form">
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            disabled={!canWriteNote}
            placeholder="Add Note"
            className="patient-detail-panel__textarea"
          />
          <button
            type="submit"
            disabled={!canWriteNote}
            className="patient-detail-panel__field-btn patient-detail-panel__field-btn--primary patient-detail-note-form__submit"
          >
            Submit Note
          </button>
        </form>
      </section>

      {actionMode ? (
        <section className="patient-detail-panel__section patient-detail-action-panel">
          {actionMode === 'staff' ? (
            <select
              defaultValue={selectedPatient.assignedStaffId || ''}
              onChange={(event) => {
                if (!canAssignStaff) return;
                if (event.target.value) assignStaff(selectedPatient.id, event.target.value);
                setActionMode(null);
              }}
              disabled={!canAssignStaff}
              className="patient-detail-panel__select patient-detail-panel__select--full"
            >
              <option value="">Choose staff</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          ) : null}
          {actionMode === 'room' ? (
            <select
              defaultValue={selectedPatient.roomId || ''}
              onChange={(event) => {
                if (!canAssignRoom) return;
                if (event.target.value) assignRoom(selectedPatient.id, event.target.value);
                setActionMode(null);
              }}
              disabled={!canAssignRoom}
              className="patient-detail-panel__select patient-detail-panel__select--full"
            >
              <option value="">Choose room</option>
              {rooms.map((room: Room) => (
                <option key={room.id} value={room.id}>{room.name} ({room.status})</option>
              ))}
            </select>
          ) : null}

        </section>
      ) : null}

      <section className="patient-detail-panel__section">
        <h3 className="patient-detail-panel__section-title">Clinical Calculators</h3>
        {suggestedScores.length ? (
          <div className="patient-detail-calculators__suggested" aria-label="Suggested scores">
            {suggestedScores.map((scoreId) => (
              <span key={scoreId} className="patient-detail-calculators__chip">
                {scoreId}
              </span>
            ))}
          </div>
        ) : null}
        <div className="patient-detail-calculators__actions">
          <FieldButton onClick={() => setHeartScoreOpen(true)}>HEART Score</FieldButton>
          <FieldButton onClick={() => setQsofaOpen(true)}>qSOFA</FieldButton>
          <FieldButton onClick={() => setPediatricDrugCalcOpen(true)}>Peds Drugs</FieldButton>
        </div>
      </section>

      <div className="patient-detail-panel__footer">
        <WhoNextPanel />
        <div className="patient-detail-panel__footer-actions">
          {assignStaffPresentation.visible ? (
          <FieldButton disabled={!canAssignStaff} onClick={() => setActionMode(actionMode === 'staff' ? null : 'staff')}>Assign Staff</FieldButton>
          ) : null}
          {assignRoomPresentation.visible ? (
          <FieldButton disabled={!canAssignRoom} onClick={() => setActionMode(actionMode === 'room' ? null : 'room')}>Assign Room</FieldButton>
          ) : null}
          {escalatePresentation.visible ? (
          <FieldButton disabled={!canEscalate} onClick={() => void confirmEscalatePatient()}>Escalate</FieldButton>
          ) : null}
          {dischargePresentation.visible ? (
          <FieldButton disabled={!canDischarge} onClick={() => void confirmDischargePatient()}>Discharge</FieldButton>
          ) : null}
        </div>
      </div>
      {heartScoreOpen ? (
        <ErrorBoundary fallbackText="Calculator modal encountered an error. Refresh to reload.">
          <Suspense fallback={<div className="patient-detail-panel__loading">Loading calculator...</div>}>
            <HEARTScore patientId={selectedPatient.id} onClose={() => setHeartScoreOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {qsofaOpen ? (
        <ErrorBoundary fallbackText="Calculator modal encountered an error. Refresh to reload.">
          <Suspense fallback={<div className="patient-detail-panel__loading">Loading calculator...</div>}>
            <QSOFA patientId={selectedPatient.id} onClose={() => setQsofaOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {pediatricDrugCalcOpen ? (
        <ErrorBoundary fallbackText="Calculator modal encountered an error. Refresh to reload.">
          <Suspense fallback={<div className="patient-detail-panel__loading">Loading calculator...</div>}>
            <PediatricDrugCalc patientId={selectedPatient.id} onClose={() => setPediatricDrugCalcOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      <ErrorBoundary fallbackText="Calculator surface encountered an error. Refresh to reload.">
        <CriticalChecklist
          patient={selectedPatient}
          checklist={activeCriticalChecklist}
          open={criticalChecklistOpen}
          onClose={() => setCriticalChecklistOpen(false)}
          currentStaffId={checklistStaffId}
          currentStaffName={staffName(staff, checklistStaffId)}
          titleHint={criticalChecklistTitleHint}
        />
      </ErrorBoundary>
    </aside>
  );
}
