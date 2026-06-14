import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, TouchEvent } from 'react';
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
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { useUpgradeHarnessPatientFlow } from '../hooks/useEmergencyOs';
import { usePatientTimelineContext } from '../hooks/usePatientTimelineContext';
import { buildPatientTimeline } from '../utils/patientTimeline';
import { hasRunScores, routeComplaint } from '../engine/complaintRouter';
import { findMatchingChecklists, type Checklist } from '../config/criticalChecklists';
import CriticalChecklist from './CriticalChecklist';
import SepsisBundleTracker from './SepsisBundleTracker';
import StrokeCodeProtocol from './StrokeCodeProtocol';
import WhoNextPanel from './WhoNextPanel';
import ErrorBoundary from './ErrorBoundary';
import './PatientDetailPanel.css';

const HEARTScore = lazy(() => import('./calculators/HEARTScore'));
const QSOFA = lazy(() => import('./calculators/qSOFA'));
const PediatricDrugCalc = lazy(() => import('./calculators/PediatricDrugCalc'));

const priorityColors: Record<Priority, string> = {
  [Priority.P1]: '#EF4444',
  [Priority.P2]: '#F97316',
  [Priority.P3]: '#F59E0B',
  [Priority.P4]: '#10B981',
  [Priority.P5]: '#6B7280',
};

const patientStateOrder = Object.values(PatientState);

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
type ActionMode = null | 'staff' | 'room' | 'escalate' | 'discharge';
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
  { key: 'spo2', label: 'SpO2', color: '#3B82F6' },
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

function workflowActor(log: WorkflowActionLog, staff: Staff[]): string {
  if (log.actorName) return log.actorName;
  if (log.actorStaffId) return staffName(staff, log.actorStaffId);
  return log.source;
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

function nextPatientState(current: PatientState): PatientState {
  const index = patientStateOrder.indexOf(current);
  return patientStateOrder[Math.min(index + 1, patientStateOrder.length - 1)];
}

function hasPatientFlagValue(patient: Patient, flag: PatientFlag | string): boolean {
  return patient.flags.some((patientFlag) => String(patientFlag) === String(flag));
}

function hasStrokeCodeFlag(patient: Patient): boolean {
  return patient.flags.some((flag) => /stroke\s*code|strokecode|stroke_code/i.test(String(flag)));
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
  if (value === undefined) return '#F9FAFB';
  if (label === 'SpO2' && value < 94) return '#EF4444';
  if (label === 'HR' && (value > 120 || value < 50)) return '#EF4444';
  if (label === 'SBP' && (value > 180 || value < 90)) return '#F59E0B';
  if (label === 'Temp' && (value >= 38 || value < 36)) return '#F59E0B';
  if (label === 'RR' && (value > 24 || value < 10)) return '#F59E0B';
  if (label === 'GCS' && value < 15) return '#F59E0B';
  return '#F9FAFB';
}

function trendArrow(label: string, current?: number, previous?: number): VitalTrend | null {
  if (current === undefined || previous === undefined) return null;
  const diff = current - previous;
  const stable: VitalTrend = { symbol: '→', color: '#9CA3AF', label: `${label} stable` };

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
    if (diff < -0.5) return { symbol: '↓', color: '#3B82F6', label: 'Temperature trending down' };
    return stable;
  }

  return null;
}

function TooltipRow({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, color }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{value}</span>
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
    <div
      style={{
        background: '#1C2333',
        border: '1px solid #374151',
        borderRadius: 10,
        color: '#F9FAFB',
        fontSize: 12,
        padding: 10,
        minWidth: 132,
        boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ color: '#9CA3AF', marginBottom: 6 }}>{point.time}</div>
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
    return <p style={{ margin: '12px 0 0', color: '#9CA3AF', fontSize: 13 }}>No vitals recorded</p>;
  }

  if (vitals.length === 1) return null;

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
    <section style={{ marginTop: 16 }} aria-labelledby="vitals-trend-heading">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h4 id="vitals-trend-heading" style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
          Vitals Trend
        </h4>
        <div style={{ display: 'inline-flex', border: '1px solid #374151', borderRadius: 999, overflow: 'hidden' }}>
          {(['chart', 'table'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              style={{
                border: 0,
                background: view === mode ? '#2563EB' : 'transparent',
                color: '#F9FAFB',
                cursor: 'pointer',
                fontSize: 11,
                padding: '5px 9px',
              }}
            >
              {mode === 'chart' ? 'Chart' : 'Table'}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? (
        <>
          <div style={{ height: 160, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 2, left: -18 }}>
                <CartesianGrid stroke="#1F2937" strokeOpacity={0.45} vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#1F2937' }}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#1F2937' }}
                  width={36}
                />
                <Tooltip content={<VitalsTooltip />} cursor={{ stroke: '#374151', strokeDasharray: '3 3' }} />
                <ReferenceLine y={94} stroke="#3B82F6" strokeDasharray="4 4" strokeOpacity={0.45} />
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
          <div
            aria-label="Toggle vitals trend lines"
            style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}
          >
            {vitalsLineConfig.map((line) => (
              <button
                key={line.key}
                type="button"
                onClick={() => toggleLine(line.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  border: 0,
                  background: 'transparent',
                  color: hiddenLines[line.key] ? '#6B7280' : '#D1D5DB',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: 0,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
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
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ color: '#9CA3AF', textAlign: 'left' }}>
                {['Time', 'HR', 'BP', 'SpO2', 'Temp', 'RR', 'GCS'].map((heading) => (
                  <th key={heading} style={{ borderBottom: '1px solid #1F2937', fontWeight: 600, padding: '6px 5px' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((point) => (
                <tr key={point.timestamp} style={{ color: '#D1D5DB' }}>
                  <td style={{ borderBottom: '1px solid #1F2937', padding: '6px 5px' }}>{point.time}</td>
                  <td style={{ borderBottom: '1px solid #1F2937', padding: '6px 5px', color: vitalTone('HR', point.hr) }}>
                    {point.hr ?? '--'}
                  </td>
                  <td style={{ borderBottom: '1px solid #1F2937', padding: '6px 5px', color: vitalTone('SBP', point.sbp) }}>
                    {point.sbp ?? '--'}/{point.dbp ?? '--'}
                  </td>
                  <td style={{ borderBottom: '1px solid #1F2937', padding: '6px 5px', color: vitalTone('SpO2', point.spo2) }}>
                    {point.spo2 ?? '--'}
                  </td>
                  <td style={{ borderBottom: '1px solid #1F2937', padding: '6px 5px', color: vitalTone('Temp', point.temp) }}>
                    {point.temp ?? '--'}
                  </td>
                  <td style={{ borderBottom: '1px solid #1F2937', padding: '6px 5px', color: vitalTone('RR', point.rr) }}>
                    {point.rr ?? '--'}
                  </td>
                  <td style={{ borderBottom: '1px solid #1F2937', padding: '6px 5px', color: vitalTone('GCS', point.gcs) }}>
                    {point.gcs ?? '--'}
                  </td>
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
    <span
      style={{
        background: '#1C2333',
        color,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 999,
        padding: '4px 9px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function FieldButton({
  children,
  onClick,
  disabled = false,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: '1px solid #374151',
        color: '#F9FAFB',
        borderRadius: 10,
        padding: '8px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
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
  const upgradePatientFlow = useUpgradeHarnessPatientFlow(
    selectedPatientId,
  ) as UpgradePatientFlowState;
  const upgradePatientFlowEnvelope = upgradePatientFlow.data;
  const canTransition = emergencyRole.can(EMERGENCY_ACTIONS.transitionPatient);
  const canWriteVitals = emergencyRole.can(EMERGENCY_ACTIONS.writeVitals);
  const canWriteNote = emergencyRole.can(EMERGENCY_ACTIONS.writeNote);
  const canManageFlags = emergencyRole.can(EMERGENCY_ACTIONS.manageFlags);
  const canAssignStaff = emergencyRole.can(EMERGENCY_ACTIONS.assignStaff);
  const canAssignRoom = emergencyRole.can(EMERGENCY_ACTIONS.assignRoom);
  const canEscalate = emergencyRole.can(EMERGENCY_ACTIONS.escalatePatient);
  const canDischarge = emergencyRole.can(EMERGENCY_ACTIONS.dischargePatient);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );
  const openCalculatorHub = useCallback((calculatorId: string) => {
    if (!selectedPatientId) return;
    const params = new URLSearchParams({ open: calculatorId, patientId: selectedPatientId });
    const nextUrl = `${CANONICAL_ROUTES.emergencyWhiteboard}?${params.toString()}`;
    window.history.pushState(null, '', nextUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [selectedPatientId]);
  const timelineContextState = usePatientTimelineContext(selectedPatientId);
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
  const patientTimeline = useMemo(
    () =>
      selectedPatient
        ? buildPatientTimeline(selectedPatient, {
            ...timelineContextState.context,
            staff,
            alerts,
            workflowLogs: patientWorkflowLogs,
          })
        : [],
    [alerts, patientWorkflowLogs, selectedPatient, staff, timelineContextState.context],
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
    const openDischargeConfirmation = () => {
      if (selectedPatientId && canDischarge) setActionMode('discharge');
    };

    document.addEventListener('open-patient-discharge', openDischargeConfirmation);
    return () => document.removeEventListener('open-patient-discharge', openDischargeConfirmation);
  }, [canDischarge, selectedPatientId]);

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

  if (!selectedPatient) return null;

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
  const actorStaffId = selectedPatient.assignedStaffId || staff[0]?.id || 'system';
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

  const escalate = () => {
    if (!canEscalate) return;
    dispatchAlert({
      id: createId('alert'),
      severity: 'Critical',
      title: 'Patient escalated',
      message: `${selectedPatient.firstName} ${selectedPatient.lastName} was escalated for urgent review.`,
      patientId: selectedPatient.id,
      source: 'patient-detail-panel',
    });
    addFlag(selectedPatient.id, PatientFlag.HighRisk);
    setActionMode(null);
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

  return (
    <aside
      className="patient-detail-panel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: 480,
        height: '100vh',
        background: '#111827',
        borderLeft: 0,
        zIndex: 100,
        overflowY: 'auto',
        color: '#F9FAFB',
        boxShadow: '-24px 0 60px rgba(0,0,0,0.36)',
        transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
        transition: swipeOffset > 0 ? 'none' : 'transform 180ms ease',
        touchAction: 'pan-y',
      }}
    >
      <div className="patient-detail-panel__drag-handle" aria-hidden="true" />
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: '#111827',
          padding: 16,
          borderBottom: '1px solid #1F2937',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
              {selectedPatient.firstName} {selectedPatient.lastName}
            </h2>
            <div style={{ marginTop: 4, color: '#9CA3AF', fontSize: 12 }}>{selectedPatient.mrn}</div>
          </div>
          <button
            type="button"
            onClick={() => selectPatient(null)}
            aria-label="Close patient detail"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #374151',
              background: 'transparent',
              color: '#F9FAFB',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            X
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Badge color={priorityColors[selectedPatient.priority]}>{selectedPatient.priority}</Badge>
          <Badge color="#9CA3AF">{selectedPatient.state}</Badge>
          {!isSepsisChecklistBlocked ? (
            <button
              type="button"
              onClick={openManualChecklist}
              style={{
                background: 'transparent',
                border: '1px solid #374151',
                color: '#F9FAFB',
                borderRadius: 10,
                padding: '8px 10px',
                cursor: 'pointer',
              }}
            >
              Open Checklist
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => movePatientToState(selectedPatient.id, nextPatientState(selectedPatient.state), actorStaffId)}
            disabled={!canTransition}
            title={canTransition ? 'Move to the next patient state' : `${emergencyRole.roleLabel} cannot move patient state`}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid #374151',
              color: '#F9FAFB',
              borderRadius: 10,
              padding: '8px 10px',
              cursor: canTransition ? 'pointer' : 'not-allowed',
              opacity: canTransition ? 1 : 0.55,
            }}
          >
            Move to Next State
          </button>
        </div>
      </header>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Journey Timeline</h3>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', minWidth: 760, alignItems: 'flex-start' }}>
            {patientStateOrder.map((state, index) => {
              const completed = index < currentStateIndex;
              const current = state === selectedPatient.state;
              const timestamp = completed ? journeyTimestamp(selectedPatient, state) : undefined;

              return (
                <div key={state} style={{ flex: 1, position: 'relative', textAlign: 'center' }}>
                  {index < patientStateOrder.length - 1 ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: '50%',
                        right: '-50%',
                        height: 2,
                        background: completed ? '#3B82F6' : '#374151',
                      }}
                    />
                  ) : null}
                  <div
                    className={current ? 'patient-detail-timeline-dot--current' : undefined}
                    style={{
                      width: 16,
                      height: 16,
                      margin: '0 auto',
                      borderRadius: 999,
                      border: `2px solid ${completed || current ? '#3B82F6' : '#6B7280'}`,
                      background: completed || current ? '#3B82F6' : 'transparent',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 10, color: current ? '#F9FAFB' : '#9CA3AF' }}>{state}</div>
                  {timestamp ? (
                    <div style={{ marginTop: 3, fontSize: 10, color: '#6B7280' }}>{formatTime(timestamp)}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }} aria-labelledby="patient-timeline-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 id="patient-timeline-heading" style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
              Patient Timeline
            </h3>
            <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 11 }}>
              Intake, journey, triage, queue, reassessment, EMS, referral, boarding, discharge, AI, and provincial events.
            </p>
          </div>
          <span style={{ color: '#9CA3AF', fontSize: 11, whiteSpace: 'nowrap' }}>{patientTimeline.length} events</span>
        </div>

        {timelineContextState.loading ? (
          <div role="status" className="patient-timeline-status patient-timeline-status--loading">
            Loading timeline enrichment from Emergency OS modules...
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

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Workflow Actions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {patientWorkflowLogs.length ? (
            patientWorkflowLogs.slice(0, 8).map((log) => (
              <article key={log.id} className="patient-detail-workflow-log">
                <div>
                  <strong>{log.title}</strong>
                  <p>{log.summary}</p>
                </div>
                <div>
                  <span>{workflowActor(log, staff)}</span>
                  <time dateTime={log.timestamp}>{formatTime(log.timestamp)}</time>
                </div>
              </article>
            ))
          ) : (
            <p style={{ margin: 0, color: '#9CA3AF', fontSize: 13 }}>
              No workflow action logs for this patient yet.
            </p>
          )}
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>Latest Vitals</h3>
          <FieldButton disabled={!canWriteVitals} onClick={() => setShowVitalsForm((open) => !open)}>Add Vitals</FieldButton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
          {latestVitalEntries.map(({ label, value, trend }) => (
            <div
              key={label}
              className="patient-detail-vital-tile"
              style={{ background: '#0B1120', border: '1px solid #1F2937', borderRadius: 10, padding: 10 }}
            >
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>{label}</div>
              <div
                style={{
                  color: vitalTone(String(label), typeof value === 'number' ? value : undefined),
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 22,
                  marginTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>{value ?? '--'}</span>
                {trend ? (
                  <span
                    aria-label={trend.label}
                    title={trend.label}
                    style={{ color: trend.color, fontSize: 13, lineHeight: 1, marginTop: 2 }}
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
          <form onSubmit={submitVitals} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
            {Object.keys(emptyVitalsForm).map((key) => (
              <input
                key={key}
                aria-label={key.toUpperCase()}
                placeholder={key.toUpperCase()}
                value={vitalsForm[key as keyof VitalsForm]}
                onChange={(event) => setVitalsForm((form) => ({ ...form, [key]: event.target.value }))}
                style={{
                  background: '#0B1120',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  color: '#F9FAFB',
                  padding: 9,
                  minWidth: 0,
                }}
              />
            ))}
            <button
              type="submit"
              style={{
                gridColumn: 'span 4',
                background: '#2563EB',
                border: 'none',
                borderRadius: 10,
                color: '#F9FAFB',
                padding: 10,
                cursor: 'pointer',
              }}
            >
              Save Vitals
            </button>
          </form>
        ) : null}
      </section>

      {upgradeFlowCards.length ? (
        <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>
            Advanced Upgrade Harness
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {upgradeFlowCards.map((card) => (
              <article
                key={card.title}
                style={{
                  background: '#0B1120',
                  border: '1px solid #1F2937',
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <strong style={{ color: '#BFDBFE', fontSize: 13 }}>{card.title}</strong>
                <p style={{ margin: '5px 0', color: '#D1D5DB', fontSize: 12 }}>{card.body}</p>
                <small style={{ color: '#FDE68A' }}>{card.meta}</small>
              </article>
            ))}
          </div>
          <p style={{ margin: '10px 0 0', color: '#6B7280', fontSize: 11 }}>
            Pilot-only outputs require human review and cannot diagnose, prescribe, disposition, or
            match patients autonomously.
          </p>
        </section>
      ) : null}

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Active Flags</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {selectedPatient.flags.map((flag) => (
            <span
              key={flag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#1C2333',
                color: '#F9FAFB',
                borderRadius: 999,
                padding: '5px 8px',
                fontSize: 12,
              }}
            >
              {flag}
              <button
                type="button"
                onClick={() => {
                  if (canManageFlags) removeFlag(selectedPatient.id, flag);
                }}
                disabled={!canManageFlags}
                aria-label={`Remove ${flag}`}
                style={{ border: 0, background: 'transparent', color: '#9CA3AF', cursor: canManageFlags ? 'pointer' : 'not-allowed', opacity: canManageFlags ? 1 : 0.45 }}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <select
            value={flagToAdd}
            onChange={(event) => setFlagToAdd(event.target.value as PatientFlag)}
            disabled={!canManageFlags}
            style={{ flex: 1, background: '#0B1120', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8, padding: 9 }}
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

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Notes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className="patient-detail-note-row"
              style={{ background: '#0B1120', borderRadius: 10, padding: 10 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF', fontSize: 11 }}>
                <span>{initials(staffName(staff, note.authorId || note.authorStaffId || 'system'))}</span>
                <span>{formatTime(note.timestamp)}</span>
              </div>
              <div style={{ color: '#F9FAFB', fontSize: 13, marginTop: 6 }}>{note.text || note.body}</div>
            </div>
          ))}
        </div>
        <form onSubmit={submitNote} style={{ marginTop: 12 }}>
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            disabled={!canWriteNote}
            placeholder="Add Note"
            style={{
              width: '100%',
              minHeight: 76,
              boxSizing: 'border-box',
              resize: 'vertical',
              background: '#0B1120',
              border: '1px solid #374151',
              borderRadius: 10,
              color: '#F9FAFB',
              padding: 10,
            }}
          />
          <button type="submit" disabled={!canWriteNote} style={{ marginTop: 8, background: '#2563EB', border: 0, borderRadius: 10, color: '#F9FAFB', padding: '9px 12px', cursor: canWriteNote ? 'pointer' : 'not-allowed', opacity: canWriteNote ? 1 : 0.55 }}>
            Submit Note
          </button>
        </form>
      </section>

      {actionMode ? (
        <section className="patient-detail-action-panel" style={{ padding: 16, borderBottom: '1px solid #1F2937', background: '#0B1120' }}>
          {actionMode === 'staff' ? (
            <select
              defaultValue={selectedPatient.assignedStaffId || ''}
              onChange={(event) => {
                if (!canAssignStaff) return;
                if (event.target.value) assignStaff(selectedPatient.id, event.target.value);
                setActionMode(null);
              }}
              disabled={!canAssignStaff}
              style={{ width: '100%', background: '#111827', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8, padding: 10 }}
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
              style={{ width: '100%', background: '#111827', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8, padding: 10 }}
            >
              <option value="">Choose room</option>
              {rooms.map((room: Room) => (
                <option key={room.id} value={room.id}>{room.name} ({room.status})</option>
              ))}
            </select>
          ) : null}
          {actionMode === 'escalate' ? (
            <div>
              <p style={{ margin: '0 0 10px', color: '#F9FAFB' }}>Escalate this patient and create a critical alert?</p>
              <FieldButton disabled={!canEscalate} onClick={escalate}>Confirm Escalation</FieldButton>
            </div>
          ) : null}
          {actionMode === 'discharge' ? (
            <div>
              <p style={{ margin: '0 0 10px', color: '#F9FAFB' }}>Discharge this patient?</p>
              <FieldButton
                onClick={() => {
                  if (!canDischarge) return;
                  movePatientToState(selectedPatient.id, PatientState.Discharge, actorStaffId, 'Discharged from detail panel');
                  setActionMode(null);
                }}
                disabled={!canDischarge}
              >
                Confirm Discharge
              </FieldButton>
            </div>
          ) : null}
        </section>
      ) : null}

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Clinical Calculators</h3>
        {suggestedScores.length ? (
          <div
            aria-label="Suggested scores"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {suggestedScores.map((scoreId) => (
              <span
                key={scoreId}
                style={{
                  border: '1px solid #2563EB',
                  borderRadius: 999,
                  background: '#1D4ED81F',
                  color: '#BFDBFE',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '5px 8px',
                }}
              >
                {scoreId}
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FieldButton onClick={() => setHeartScoreOpen(true)}>HEART Score</FieldButton>
          <FieldButton onClick={() => setQsofaOpen(true)}>qSOFA</FieldButton>
          <FieldButton onClick={() => setPediatricDrugCalcOpen(true)}>Peds Drugs</FieldButton>
        </div>
      </section>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 16,
          background: '#111827',
          borderTop: '1px solid #1F2937',
        }}
      >
        <WhoNextPanel />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <FieldButton disabled={!canAssignStaff} onClick={() => setActionMode(actionMode === 'staff' ? null : 'staff')}>Assign Staff</FieldButton>
          <FieldButton disabled={!canAssignRoom} onClick={() => setActionMode(actionMode === 'room' ? null : 'room')}>Assign Room</FieldButton>
          <FieldButton disabled={!canEscalate} onClick={() => setActionMode(actionMode === 'escalate' ? null : 'escalate')}>Escalate</FieldButton>
          <FieldButton disabled={!canDischarge} onClick={() => setActionMode(actionMode === 'discharge' ? null : 'discharge')}>Discharge</FieldButton>
        </div>
      </div>
      {heartScoreOpen ? (
        <ErrorBoundary fallbackText="Calculator modal encountered an error. Refresh to reload.">
          <Suspense fallback={<div style={{ padding: 16, color: '#9CA3AF' }}>Loading calculator...</div>}>
            <HEARTScore patientId={selectedPatient.id} onClose={() => setHeartScoreOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {qsofaOpen ? (
        <ErrorBoundary fallbackText="Calculator modal encountered an error. Refresh to reload.">
          <Suspense fallback={<div style={{ padding: 16, color: '#9CA3AF' }}>Loading calculator...</div>}>
            <QSOFA patientId={selectedPatient.id} onClose={() => setQsofaOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {pediatricDrugCalcOpen ? (
        <ErrorBoundary fallbackText="Calculator modal encountered an error. Refresh to reload.">
          <Suspense fallback={<div style={{ padding: 16, color: '#9CA3AF' }}>Loading calculator...</div>}>
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
