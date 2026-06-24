import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import {
  Ambulance,
  ArrowRightLeft,
  Clock3,
  DoorOpen,
  FileText,
  MonitorSmartphone,
  Shield,
  Timer,
} from 'lucide-react';
import {
  Patient,
  PatientFlag,
  PatientState,
  PriorityLabel,
  type ArrivalMode,
  type PatientArrivalRecord,
} from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_ACTIONS,
} from '../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { advancePatientJourneyState, advancePatientToBoarding, getDefaultNextPatientState } from '../services/queueAssignment';
import { arrivalModeLabel } from '../services/arrivalControlLayer';
import { normalizePatientArrival, triageAcuityToPriority } from '../services/patientArrivalModel';
import ReassessmentTimerBadge from './reassessment/ReassessmentTimerBadge';
import ReassessmentTimerStrip from './reassessment/ReassessmentTimerStrip';
import HighRiskComplaintFlagBadge from './reception/HighRiskComplaintFlagBadge';
import FitToWaitBadge from './waiting-room/FitToWaitBadge';
import PatientExperienceStatusBadge from './patient-experience/PatientExperienceStatusBadge';
import WhatHappensNextBadge from './guidance/WhatHappensNextBadge';
import QueueReasonBadge from './queues/QueueReasonBadge';
import { isInQueueFlow } from '../services/queueReasonVisibility';
import { resolvePatientQueueTiming } from '../services/patientQueueTimingModel';
import PatientQueueTimingBadge from './queues/PatientQueueTimingBadge';
import LwbsRiskBadge from './waiting-room/LwbsRiskBadge';
import DeteriorationWatchBadge from './waiting-room/DeteriorationWatchBadge';
import WaitingRoomCommunicationBadge from './waiting-room/WaitingRoomCommunicationBadge';
import TriageBreachBadge from './triage/TriageBreachBadge';
import { isAwaitingTriage } from '../services/triageBreachTimer';
import { selectReassessmentTimerForPatient } from '../engine/reassessmentTimerEngine';
import { findPatientReferralAwareness } from './whiteboard/referralAwarenessModel';
import { buildDataQualitySnapshot, getPatientDataQualityRisks } from '../services/dataQualityDiscovery';
import useEmergencyDisplayPrivacy from '../hooks/useEmergencyDisplayPrivacy';
import useScreenDensityMode from '../hooks/useScreenDensityMode';
import type { PatientCardDensityVariant } from '../config/screenDensityModeModel';
import {
  formatPrivacySafeComplaint,
  formatPrivacySafeDemographic,
  formatPrivacySafeMrn,
  formatPrivacySafePatientName,
  type EmergencyDisplayPrivacyPolicy,
} from '../config/emergencyDisplayPrivacyPolicy';
import PatientCardToolChips from './orchestration/PatientCardToolChips';
import { getRecentSavedScores } from '../utils/clinicalScoreEvents';
import { hasPatientFlag, latestPatientVitals, patientFlags } from '../utils/patientVitals';
import WhiteboardOperationalIconStrip from './whiteboard/WhiteboardOperationalIconStrip';
import { resolveWhiteboardStateLabel } from '../services/whiteboardViewModel';
import JourneyPredictionBadge from './predictive/JourneyPredictionBadge';
import AdmissionProbabilityBadge from './predictive/AdmissionProbabilityBadge';
import PatientDocumentArtifactsStrip from './patient-card/PatientDocumentArtifactsStrip';
import NativeAiRoutingBadge from './native-ai/NativeAiRoutingBadge';
import SpecialistInferenceBadge from './native-ai/SpecialistInferenceBadge';
import TriageExpertBadge from './native-ai/TriageExpertBadge';
import PostEdOrientationBadge from './predictive/PostEdOrientationBadge';
import useFeature from '../hooks/useFeature';
import { fetchBoardingSignalsForPatient, type BoardingSignals } from '../services/boardingSignals';
import './PatientCard.css';

type PatientCardWorkflowProfile = 'none' | 'charge' | 'physician';
export type PatientCardLayout = 'card' | 'row';

type PatientCardProps = {
  patient: Patient;
  layout?: PatientCardLayout;
  keyboardSelected?: boolean;
  highlighted?: boolean;
  workflowProfile?: PatientCardWorkflowProfile;
  readOnlyDisplay?: boolean;
  privacyPolicy?: EmergencyDisplayPrivacyPolicy;
  densityVariant?: PatientCardDensityVariant;
  onKeyboardFocus?: () => void;
};

type LegacyVitals = NonNullable<Patient['vitals'][number]> & {
  heartRate?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  oxygenSaturation?: number;
  temperature?: number;
};

const priorityColors = {
  P1: 'var(--priority-p1)',
  P2: 'var(--priority-p2)',
  P3: 'var(--priority-p3)',
  P4: 'var(--priority-p4)',
  P5: 'var(--priority-p5)',
};

const flagColors: Partial<Record<PatientFlag, string>> = {
  [PatientFlag.SepsisAlert]: 'var(--status-danger)',
  [PatientFlag.DeteriorationRisk]: 'var(--status-danger)',
  [PatientFlag.ReassessmentDue]: 'var(--status-warning)',
  [PatientFlag.ScoreReassessmentRecommended]: 'var(--status-warning)',
  [PatientFlag.LongWait]: 'var(--capacity-orange)',
  [PatientFlag.LWBSRisk]: 'var(--status-danger)',
  [PatientFlag.HighRisk]: 'var(--status-danger)',
  [PatientFlag.EMSArrival]: 'var(--color-secondary)',
  [PatientFlag.PendingAdmission]: 'var(--color-accent)',
};

const flagLabels: Partial<Record<PatientFlag, string>> = {
  [PatientFlag.SepsisAlert]: 'Sepsis alert',
  [PatientFlag.DeteriorationRisk]: 'Deterioration risk',
  [PatientFlag.ReassessmentDue]: 'Reassessment due',
  [PatientFlag.ScoreReassessmentRecommended]: 'Score review',
  [PatientFlag.LongWait]: 'Long wait',
  [PatientFlag.LWBSRisk]: 'LWBS risk',
  [PatientFlag.HighRisk]: 'High risk',
  [PatientFlag.EMSArrival]: 'EMS arrival',
  [PatientFlag.PendingAdmission]: 'Pending admission',
  [PatientFlag.PsychAlert]: 'Psych alert',
  [PatientFlag.Isolation]: 'Isolation',
  [PatientFlag.DeterioratingNeuro]: 'Neuro change',
  [PatientFlag.StrokeCode]: 'Stroke code',
  [PatientFlag.IdentityPending]: 'Identity pending',
};

type SignalTone = 'critical' | 'warning' | 'info' | 'flow';

type StatusSignal = {
  id: string;
  label: string;
  tone: SignalTone;
};

const CLOSED_REFERRAL_STATUSES = new Set(['Closed', 'Completed', 'Declined', 'PatientDeparted']);

function getSignalBadges({
  patient,
  arrival,
  hasReassessmentDue,
  hasDeteriorationRisk,
  hasEmsArrival,
  hasLongWait,
  hasLwbsRisk,
  isBoarding,
  hasReferralPending,
  hasTransferPending,
  referralAwarenessLabel,
  referralAwarenessTone,
  hasCapacityPressure,
  dataQualityRisks = [],
}: {
  patient: Patient;
  arrival: PatientArrivalRecord;
  hasReassessmentDue: boolean;
  hasDeteriorationRisk: boolean;
  hasEmsArrival: boolean;
  hasLongWait: boolean;
  hasLwbsRisk: boolean;
  isBoarding: boolean;
  hasReferralPending: boolean;
  hasTransferPending: boolean;
  referralAwarenessLabel?: string | null;
  referralAwarenessTone?: SignalTone | null;
  hasCapacityPressure: boolean;
  dataQualityRisks?: Array<{ id: string; label: string; severity?: string }>;
}): StatusSignal[] {
  return [
    hasPatientFlag(patient, PatientFlag.SepsisAlert)
      ? { id: 'sepsis', label: 'Sepsis alert', tone: 'critical' as const }
      : null,
    hasDeteriorationRisk
      ? { id: 'deterioration', label: 'Deterioration risk', tone: 'critical' as const }
      : null,
    hasLwbsRisk ? { id: 'lwbs', label: 'LWBS risk', tone: 'critical' as const } : null,
    hasPatientFlag(patient, PatientFlag.HighRisk)
      ? { id: 'high-risk', label: 'High risk', tone: 'critical' as const }
      : null,
    hasReassessmentDue
      ? { id: 'reassessment', label: 'Reassessment due', tone: 'warning' as const }
      : null,
    hasPatientFlag(patient, PatientFlag.ScoreReassessmentRecommended)
      ? { id: 'score-review', label: 'Score review', tone: 'warning' as const }
      : null,
    hasLongWait ? { id: 'long-wait', label: 'Long wait', tone: 'warning' as const } : null,
    hasEmsArrival ? { id: 'ems', label: 'EMS arrival', tone: 'info' as const } : null,
    patient.state === PatientState.Arrival ||
    patient.state === PatientState.Registration ||
    patient.state === PatientState.Triage
      ? {
          id: 'arrival-mode',
          label: arrivalModeLabel(arrival.arrivalMode),
          tone: 'flow' as const,
        }
      : null,
    patient.state === PatientState.Triage && arrival.triagePending
      ? { id: 'triage-pending', label: 'Triage pending', tone: 'warning' as const }
      : null,
    isBoarding ? { id: 'boarding', label: 'Boarding', tone: 'flow' as const } : null,
    hasTransferPending ? { id: 'transfer', label: 'Transfer pending', tone: 'flow' as const } : null,
    !hasTransferPending && hasReferralPending
      ? {
          id: 'referral',
          label: referralAwarenessLabel || 'Referral pending',
          tone: referralAwarenessTone || ('info' as const),
        }
      : null,
    hasCapacityPressure
      ? { id: 'capacity-pressure', label: 'Capacity pressure', tone: 'warning' as const }
      : null,
    ...dataQualityRisks.slice(0, 2).map((risk) => ({
      id: `dq-${risk.id}`,
      label: risk.label,
      tone: (risk.severity === 'warning' ? 'warning' : 'info') as SignalTone,
    })),
  ].filter(Boolean) as StatusSignal[];
}

function latestVitals(patient: Patient): LegacyVitals | undefined {
  return latestPatientVitals(patient) as LegacyVitals | undefined;
}

function truncateComplaint(complaint: string): string {
  return complaint.length > 42 ? `${complaint.slice(0, 42)}...` : complaint;
}

function waitMinutes(arrivalTime: string): number {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function waitColor(minutes: number): string {
  if (minutes > 60) return 'var(--status-danger)';
  if (minutes > 45) return 'var(--status-warning)';
  return 'var(--color-text-secondary)';
}

function navigateTo(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function staffInitials(name?: string): string {
  if (!name) return '--';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function scoreBadges(patient: Patient): Array<{ key: string; label: string; tone: string }> {
  return getRecentSavedScores(patient)
    .slice(0, 3)
    .map((score) => ({
      key: `${score.toolId || score.shortLabel}-${score.timestamp}`,
      label: `${score.shortLabel} ${score.result ?? '--'}`,
      tone: score.tone,
    }));
}

function abnormalVitalsSummary({
  hrAbnormal,
  bpAbnormal,
  spo2Abnormal,
  tempAbnormal,
}: {
  hrAbnormal: boolean;
  bpAbnormal: boolean;
  spo2Abnormal: boolean;
  tempAbnormal: boolean;
}): string {
  const abnormal = [
    hrAbnormal ? 'heart rate' : '',
    bpAbnormal ? 'blood pressure' : '',
    spo2Abnormal ? 'oxygen saturation' : '',
    tempAbnormal ? 'temperature' : '',
  ].filter(Boolean);
  return abnormal.length ? `Abnormal ${abnormal.join(', ')}.` : 'Vitals within displayed thresholds.';
}

function isOpenReferralStatus(status?: string): boolean {
  return !CLOSED_REFERRAL_STATUSES.has(String(status || '').trim());
}

function arrivalModeIcon(mode: ArrivalMode) {
  const props = { size: 14, strokeWidth: 2.25, 'aria-hidden': true as const };
  switch (mode) {
    case 'EMS':
      return <Ambulance {...props} />;
    case 'referral':
      return <FileText {...props} />;
    case 'self-check-in':
      return <MonitorSmartphone {...props} />;
    case 'police':
      return <Shield {...props} />;
    case 'transfer':
      return <ArrowRightLeft {...props} />;
    default:
      return <DoorOpen {...props} />;
  }
}

function PatientCard({
  patient: patientProp,
  layout = 'card',
  keyboardSelected = false,
  highlighted = false,
  workflowProfile = 'none',
  readOnlyDisplay = false,
  privacyPolicy: privacyPolicyProp,
  densityVariant: densityVariantProp,
  onKeyboardFocus,
}: PatientCardProps) {
  const emergencyRole = useEmergencyRolePermissions();
  const screenDensity = useScreenDensityMode();
  const densityVariant = densityVariantProp ?? screenDensity.patientCardVariant;
  const cardDensity = screenDensity.patientCard;
  const defaultPrivacyPolicy = useEmergencyDisplayPrivacy();
  const privacyPolicy = privacyPolicyProp ?? defaultPrivacyPolicy;
  const patient = useEmergencyStore((store) =>
    store.patients.find((candidate) => candidate.id === patientProp.id)
  ) || patientProp;
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const toggleCopilot = useEmergencyStore((store) => store.toggleCopilot);
  const addFlag = useEmergencyStore((store) => store.addFlag);
  const staff = useEmergencyStore((store) => store.staff);
  const referrals = useEmergencyStore((store) => store.referrals);
  const emsArrivals = useEmergencyStore((store) => store.emsArrivals);
  const emergencySettings = useEmergencyStore((store) => store.emergencySettings);
  const capacityBand = useEmergencyStore((store) => store.capacity.band);
  const allPatients = useEmergencyStore((store) => store.patients);
  const rooms = useEmergencyStore((store) => store.rooms);
  const workflowLogs = useEmergencyStore((store) => store.workflowLogs);
  const { enabled: admissionPredictionEnabled } = useFeature('admission_prediction');
  const { enabled: documentArtifactsEnabled } = useFeature('patient_document_artifacts');
  const { enabled: nativeAiRoutingEnabled } = useFeature('native_ai_routing');
  const { enabled: nlpTriageExpertEnabled } = useFeature('nlp_triage_expert_system');
  const { enabled: postEdOrientationEnabled } = useFeature('post_ed_orientation');
  const syncDocumentArtifactsFromPatient = useEmergencyStore((store) => store.syncDocumentArtifactsFromPatient);
  const patientRoom = useMemo(
    () => rooms.find((room) => room.id === patient.roomId) || null,
    [patient.roomId, rooms],
  );
  const [boardingSignals, setBoardingSignals] = useState<BoardingSignals | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchBoardingSignalsForPatient(patient).then((signals) => {
      if (!cancelled) setBoardingSignals(signals);
    });
    return () => {
      cancelled = true;
    };
  }, [patient.id, patient.state]);

  useEffect(() => {
    if (!documentArtifactsEnabled) return;
    if (patient.documentArtifacts?.length) return;
    syncDocumentArtifactsFromPatient(patient.id);
  }, [documentArtifactsEnabled, patient.documentArtifacts?.length, patient.id, syncDocumentArtifactsFromPatient]);

  const dataQualitySnapshot = useMemo(
    () => buildDataQualitySnapshot(allPatients),
    [allPatients],
  );
  const dataQualityRisks = useMemo(
    () => getPatientDataQualityRisks(patient, dataQualitySnapshot),
    [dataQualitySnapshot, patient],
  );
  const assignedStaff = staff.find((member) => member.id === patient.assignedStaffId);
  const patientName = formatPrivacySafePatientName(patient, privacyPolicy);
  const patientMrn = formatPrivacySafeMrn(patient, privacyPolicy);
  const patientAge = formatPrivacySafeDemographic(patient.age, privacyPolicy);
  const patientSex = formatPrivacySafeDemographic(patient.sex, privacyPolicy);
  const arrival = useMemo(() => normalizePatientArrival(patient), [patient]);
  const displayPriority = triageAcuityToPriority(arrival.triageAcuity);
  const patientComplaint = formatPrivacySafeComplaint(arrival.chiefComplaint, privacyPolicy);
  // Merged from src/components/EmergencyPatientCard.jsx: tolerate legacy vital field names.
  const vitals = latestVitals(patient);
  const minutesWaiting = waitMinutes(arrival.arrivalTimestamp);
  const whiteboardStateLabel = resolveWhiteboardStateLabel(patient);
  const hasReassessmentDue = hasPatientFlag(patient, PatientFlag.ReassessmentDue);
  const hasDeteriorationRisk = hasPatientFlag(patient, PatientFlag.DeteriorationRisk);
  const hasEmsArrival =
    arrival.arrivalMode === 'EMS' ||
    hasPatientFlag(patient, PatientFlag.EMSArrival) ||
    patient.source === 'EMS';
  const hasLongWait = hasPatientFlag(patient, PatientFlag.LongWait);
  const hasLwbsRisk = hasPatientFlag(patient, PatientFlag.LWBSRisk);
  const isBoarding =
    patient.state === PatientState.Admission || hasPatientFlag(patient, PatientFlag.PendingAdmission);
  const isDischarged = patient.state === PatientState.Discharge || patient.state === PatientState.Deceased;
  const openReferral = referrals.find(
    (referral) => referral.patientId === patient.id && isOpenReferralStatus(referral.status),
  );
  const referralAwareness = findPatientReferralAwareness(referrals, patient.id);
  const hasReferralPending = Boolean(referralAwareness);
  const referralAwarenessLabel = referralAwareness
    ? `Referral ${referralAwareness.label.toLowerCase()}`
    : null;
  const referralAwarenessTone =
    referralAwareness?.bucket === 'delayed'
      ? ('critical' as const)
      : referralAwareness?.bucket === 'accepted'
        ? ('flow' as const)
        : referralAwareness?.bucket === 'pending'
          ? ('warning' as const)
          : null;
  const hasTransferPending = openReferral?.workflow === 'Transfer';
  const hasCapacityPressure =
    (capacityBand === 'Orange' || capacityBand === 'Red') &&
    (isBoarding || hasLongWait || hasReassessmentDue || hasEmsArrival);
  const scores = scoreBadges(patient);
  const waitStatusColor = hasLwbsRisk ? '#EF4444' : hasLongWait ? '#F59E0B' : waitColor(minutesWaiting);
  const priorityLabel = PriorityLabel[displayPriority] || String(displayPriority);
  const signalBadges = getSignalBadges({
    patient,
    arrival,
    hasReassessmentDue,
    hasDeteriorationRisk,
    hasEmsArrival,
    hasLongWait,
    hasLwbsRisk,
    isBoarding,
    hasReferralPending,
    hasTransferPending,
    referralAwarenessLabel,
    referralAwarenessTone,
    hasCapacityPressure,
    dataQualityRisks,
  });
  const reassessmentTimer = useMemo(
    () =>
      patient.state === PatientState.Waiting ? selectReassessmentTimerForPatient(patient) : null,
    [patient],
  );
  const queueTiming = useMemo(
    () => resolvePatientQueueTiming(patient, { settings: emergencySettings }),
    [emergencySettings, patient],
  );
  const cardStyle = {
    '--patient-priority-color': priorityColors[displayPriority],
  } as CSSProperties;
  const canTransition = emergencyRole.actionEnabled(EMERGENCY_ROLE_ACTIONS.moveQueue);
  const flagsPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.manageFlags);
  const copilotPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.useCopilot);
  const canManageFlags = flagsPresentation.enabled;
  const canManageReferral = emergencyRole.actionEnabled(EMERGENCY_ROLE_ACTIONS.createReferral);
  const canDischarge = emergencyRole.actionEnabled(EMERGENCY_ROLE_ACTIONS.disposition);
  const canUseCopilot = copilotPresentation.enabled;
  const dispositionPresentation = emergencyRole.presentAction(EMERGENCY_ROLE_ACTIONS.disposition);
  const moveQueuePresentation = emergencyRole.presentAction(EMERGENCY_ROLE_ACTIONS.moveQueue);
  const referralPresentation = emergencyRole.presentAction(EMERGENCY_ROLE_ACTIONS.createReferral);
  const showWorkflowActions = workflowProfile !== 'none';
  const nextState = getDefaultNextPatientState(patient);
  const canMoveNext = canTransition && Boolean(nextState) && !isDischarged;
  const canBoardPatient = canTransition && !isBoarding && !isDischarged;

  const hr = vitals?.hr ?? vitals?.heartRate;
  const sbp = vitals?.sbp ?? vitals?.bpSystolic;
  const dbp = vitals?.dbp ?? vitals?.bpDiastolic;
  const spo2 = vitals?.spo2 ?? vitals?.oxygenSaturation;
  const temp = vitals?.temp ?? vitals?.temperature;
  const hrAbnormal = hr !== undefined && (hr > 120 || hr < 50);
  const bpAbnormal = sbp !== undefined && (sbp < 90 || sbp > 180);
  const spo2Abnormal = spo2 !== undefined && spo2 < 94;
  const tempAbnormal = temp !== undefined && (temp >= 38 || temp < 36);
  const patientCardAriaLabel = [
    patientName,
    displayPriority,
    patient.state,
    privacyPolicy.showChiefComplaint ? patientComplaint : '',
    `wait ${minutesWaiting} minutes`,
    hasReassessmentDue ? 'reassessment due' : '',
    hasDeteriorationRisk ? 'deterioration risk' : '',
    privacyPolicy.showVitals
      ? abnormalVitalsSummary({ hrAbnormal, bpAbnormal, spo2Abnormal, tempAbnormal })
      : '',
    hasTransferPending ? 'transfer pending' : hasReferralPending ? referralAwarenessLabel || 'referral pending' : '',
    hasCapacityPressure ? `${capacityBand} capacity pressure` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const handleSelect = useCallback(() => {
    if (readOnlyDisplay) return;
    selectPatient(patient.id);
  }, [patient.id, readOnlyDisplay, selectPatient]);
  const handleTimelineClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    selectPatient(patient.id);
  }, [patient.id, selectPatient]);
  const handleDetailClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    selectPatient(patient.id);
  }, [patient.id, selectPatient]);
  const handleMoveNext = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canMoveNext || !nextState) return;
    advancePatientJourneyState(patient.id, nextState, {
      actorId: patient.assignedStaffId || 'whiteboard-command',
      note:
        nextState === PatientState.Waiting
          ? 'Moved from Whiteboard mission control into waiting queue.'
          : 'Moved from Whiteboard mission control',
    });
  }, [canMoveNext, nextState, patient.assignedStaffId, patient.id]);
  const handleReassessment = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!hasReassessmentDue && !canManageFlags) return;
    if (!hasReassessmentDue) addFlag(patient.id, PatientFlag.ReassessmentDue);
    selectPatient(patient.id);
    document.dispatchEvent(new Event('open-reassessment-drawer'));
  }, [addFlag, canManageFlags, hasReassessmentDue, patient.id, selectPatient]);
  const handleReferral = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canManageReferral || !emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReferrals)) return;
    selectPatient(patient.id);
    const params = new URLSearchParams({ patientId: patient.id, new: '1' });
    navigateTo(`${CANONICAL_ROUTES.emergencyReferrals}?${params.toString()}`);
  }, [canManageReferral, emergencyRole, patient.id, selectPatient]);
  const handleBoarding = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canBoardPatient) return;
    advancePatientToBoarding(patient.id, {
      actorId: patient.assignedStaffId || 'whiteboard-command',
      note: 'Boarding launched from Whiteboard mission control',
    });
  }, [canBoardPatient, patient.assignedStaffId, patient.id]);
  const handleDischarge = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canDischarge || isDischarged) return;
    selectPatient(patient.id);
    window.setTimeout(() => document.dispatchEvent(new Event('open-patient-discharge')), 0);
  }, [canDischarge, isDischarged, patient.id, selectPatient]);
  const handleCopilot = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canUseCopilot) return;
    selectPatient(patient.id);
    window.dispatchEvent(
      new CustomEvent('ed:patient-copilot-focus', { detail: { patientId: patient.id } }),
    );
    toggleCopilot();
  }, [canUseCopilot, patient.id, selectPatient, toggleCopilot]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectPatient(patient.id);
    }
  }, [patient.id, selectPatient]);

  const reassessmentLabel = hasReassessmentDue
    ? 'Due now'
    : reassessmentTimer?.isOverdue
      ? reassessmentTimer.overdueLabel || 'Overdue'
      : reassessmentTimer?.stage === 'due'
        ? reassessmentTimer.dueInLabel || 'Due'
        : reassessmentTimer?.dueInLabel || '—';

  if (layout === 'row') {
    return (
      <div
        className={[
          'patient-card',
          'patient-card--row',
          `patient-card--priority-${displayPriority}`,
          hasReassessmentDue ? 'patient-card--reassessment-due' : '',
          hasDeteriorationRisk ? 'patient-card--deterioration-risk' : '',
          hasEmsArrival ? 'patient-card--ems-arrival' : '',
          hasLongWait ? 'patient-card--long-wait' : '',
          hasLwbsRisk ? 'patient-card--lwbs-risk' : '',
          keyboardSelected ? 'patient-card--keyboard-selected' : '',
          highlighted ? 'patient-card--highlighted' : '',
        ].filter(Boolean).join(' ')}
        data-patient-card-id={patient.id}
        onClick={readOnlyDisplay ? undefined : handleSelect}
        onFocus={onKeyboardFocus}
        role={readOnlyDisplay ? 'row' : 'button'}
        tabIndex={readOnlyDisplay ? -1 : 0}
        onKeyDown={readOnlyDisplay ? undefined : handleKeyDown}
        style={cardStyle}
        aria-label={patientCardAriaLabel}
      >
        <div className="patient-card__row-cell patient-card__row-cell--triage" aria-label={`Triage ${displayPriority}`}>
          <span className="patient-card__row-triage-code">{displayPriority}</span>
          <span className="patient-card__row-triage-label">{priorityLabel}</span>
        </div>

        <div className="patient-card__row-cell patient-card__row-cell--identity">
          <strong>{patientName}</strong>
          <span>{patientMrn}</span>
        </div>

        <div className="patient-card__row-cell patient-card__row-cell--demographics">
          {privacyPolicy.showDemographics ? (
            <>
              <span>{patientAge}</span>
              <span>{patientSex}</span>
            </>
          ) : (
            <span className="patient-card__complaint--redacted">Hidden</span>
          )}
        </div>

        <div className="patient-card__row-cell patient-card__row-cell--arrival">
          {arrivalModeIcon(arrival.arrivalMode)}
          <span>{arrivalModeLabel(arrival.arrivalMode)}</span>
        </div>

        <div
          className={[
            'patient-card__row-cell',
            'patient-card__row-cell--complaint',
            !privacyPolicy.showChiefComplaint ? 'patient-card__complaint--redacted' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title={patientComplaint}
        >
          {truncateComplaint(patientComplaint)}
        </div>

        <div className="patient-card__row-cell patient-card__row-cell--wait" style={{ color: waitStatusColor }}>
          <Clock3 size={14} strokeWidth={2.25} aria-hidden />
          <span>
            {queueTiming ? queueTiming.elapsedLabel : `${minutesWaiting}m`}
          </span>
        </div>

        <div
          className={[
            'patient-card__row-cell',
            'patient-card__row-cell--reassess',
            hasReassessmentDue || reassessmentTimer?.isOverdue
              ? 'patient-card__row-cell--reassess-due'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Timer size={14} strokeWidth={2.25} aria-hidden />
          <span>{reassessmentLabel}</span>
        </div>

        <div className="patient-card__row-cell patient-card__row-cell--state">
          <span className="patient-card__state-pill">{whiteboardStateLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'patient-card',
        `patient-card--density-${densityVariant}`,
        `patient-card--priority-${displayPriority}`,
        hasReassessmentDue ? 'patient-card--reassessment-due' : '',
        hasDeteriorationRisk ? 'patient-card--deterioration-risk' : '',
        hasEmsArrival ? 'patient-card--ems-arrival' : '',
        hasLongWait ? 'patient-card--long-wait' : '',
        hasLwbsRisk ? 'patient-card--lwbs-risk' : '',
        showWorkflowActions ? 'patient-card--mission-control' : '',
        keyboardSelected ? 'patient-card--keyboard-selected' : '',
        highlighted ? 'patient-card--highlighted' : '',
      ].filter(Boolean).join(' ')}
      data-patient-card-id={patient.id}
      onClick={readOnlyDisplay ? undefined : handleSelect}
      onFocus={onKeyboardFocus}
      role={readOnlyDisplay ? 'article' : 'button'}
      tabIndex={readOnlyDisplay ? -1 : 0}
      onKeyDown={readOnlyDisplay ? undefined : handleKeyDown}
      style={cardStyle}
      aria-label={patientCardAriaLabel}
    >
      <div className="patient-card__priority-strip" aria-label={`${displayPriority} ${priorityLabel}`}>
        <span className="patient-card__priority-code">{displayPriority}</span>
        <span className="patient-card__priority-label">{priorityLabel}</span>
        <span className="patient-card__state-pill">{patient.state}</span>
        <WhiteboardOperationalIconStrip
          patient={patient}
          room={patientRoom}
          consultPending={patient.state === PatientState.Orders || patient.state === PatientState.Results}
          resultsPending={patient.state === PatientState.Results}
          boardingSignals={boardingSignals}
          compact
        />
        {admissionPredictionEnabled ? (
          <AdmissionProbabilityBadge
            patient={patient}
            boardingSignals={boardingSignals}
            consultPending={patient.state === PatientState.Orders || patient.state === PatientState.Results}
            compact
          />
        ) : null}
        {admissionPredictionEnabled && (workflowProfile === 'charge' || workflowProfile === 'physician') ? (
          <JourneyPredictionBadge
            patient={patient}
            boardingSignals={boardingSignals}
            compact
          />
        ) : null}
        {cardDensity.showExperienceBadge ? (
          <PatientExperienceStatusBadge patient={patient} referrals={referrals} compact showStaffDetail />
        ) : null}
        {cardDensity.showWhatHappensNext ? (
          <WhatHappensNextBadge patient={patient} referrals={referrals} staff={staff} compact showGuidance />
        ) : null}
        {cardDensity.showLwbsAndDeterioration && patient.state === PatientState.Waiting ? (
          <LwbsRiskBadge
            patient={patient}
            waitingPatientCount={allPatients.filter((candidate) => candidate.state === PatientState.Waiting).length}
            compact
          />
        ) : null}
        {cardDensity.showLwbsAndDeterioration && patient.state === PatientState.Waiting ? (
          <DeteriorationWatchBadge patient={patient} emsArrivals={emsArrivals} compact />
        ) : null}
        {cardDensity.showCommunicationBadge && patient.state === PatientState.Waiting ? (
          <WaitingRoomCommunicationBadge
            patient={patient}
            workflowLogs={workflowLogs}
            staff={staff}
            compact
          />
        ) : null}
        {cardDensity.showSafetyFlags && isAwaitingTriage(patient) ? (
          <TriageBreachBadge patient={patient} settings={emergencySettings} compact showElapsed />
        ) : null}
      </div>

      <div className="patient-card__identity">
        <div className="patient-card__identity-main">
          <strong>{patientName}</strong>
          <span>{patientMrn}</span>
          <span className="patient-card__arrival-mode">{arrivalModeLabel(arrival.arrivalMode)}</span>
        </div>
        {privacyPolicy.showDemographics ? (
          <div className="patient-card__demographics">
            <span>{patientAge}</span>
            <span>{patientSex}</span>
          </div>
        ) : null}
      </div>

      {privacyPolicy.showChiefComplaint ? (
        <div className="patient-card__complaint" title={patientComplaint}>
          {truncateComplaint(patientComplaint)}
        </div>
      ) : (
        <div className="patient-card__complaint patient-card__complaint--redacted">
          {patientComplaint}
        </div>
      )}

      {cardDensity.showQueueReason && isInQueueFlow(patient) ? (
        <div className="patient-card__queue-reason" aria-label="Why patient is in queue">
          <QueueReasonBadge patient={patient} referrals={referrals} staff={staff} showAll />
        </div>
      ) : null}

      {cardDensity.showSignalsRow ? (
      <div className="patient-card__signals" aria-label="Patient priority signals">
        {privacyPolicy.showComplaintFlags ? (
          <HighRiskComplaintFlagBadge patient={patient} compact />
        ) : null}
        {patient.state === PatientState.Waiting ? <FitToWaitBadge patient={patient} compact /> : null}
        {signalBadges.length ? (
          signalBadges.map((signal) => (
            <span key={signal.id} className={`patient-card__signal patient-card__signal--${signal.tone}`}>
              {signal.label}
            </span>
          ))
        ) : (
          <span className="patient-card__signal patient-card__signal--stable">No active risk flags</span>
        )}
        {cardDensity.showReassessmentTimer && patient.state === PatientState.Waiting ? (
          <ReassessmentTimerBadge patient={patient} />
        ) : null}
      </div>
      ) : null}

      {cardDensity.showReassessmentTimer && reassessmentTimer ? (
        <ReassessmentTimerStrip timer={reassessmentTimer} className="patient-card__timer-grid" />
      ) : null}

      {cardDensity.showMetaGrid ? (
      <div className="patient-card__meta-grid">
        <div className="patient-card__meta-item">
          <span>{queueTiming?.isOnline ? 'Queue' : 'Wait'}</span>
          <strong style={{ color: waitStatusColor }}>
            {queueTiming ? (
              <>
                {queueTiming.elapsedLabel}
                <small style={{ display: 'block', fontSize: '0.72em', opacity: 0.9 }}>
                  {queueTiming.remainingLabel}
                </small>
              </>
            ) : (
              `${minutesWaiting}m`
            )}
          </strong>
        </div>
        {privacyPolicy.showRoomAssignment ? (
          <div className="patient-card__meta-item">
            <span>Room</span>
            <strong>{patient.roomId ? patient.roomId.toUpperCase() : 'Unassigned'}</strong>
          </div>
        ) : null}
        {privacyPolicy.showStaffAssignment ? (
          <div className="patient-card__meta-item">
            <span>Staff</span>
            <strong>{staffInitials(assignedStaff?.name)}</strong>
          </div>
        ) : null}
      </div>
      ) : null}

      {queueTiming?.isOnline ? (
        <div className="patient-card__queue-timing" aria-label="Queue timing">
          <PatientQueueTimingBadge patient={patient} settings={emergencySettings} showScenario />
        </div>
      ) : null}

      {cardDensity.showVitalsGrid && privacyPolicy.showVitals ? (
        <div
          className="patient-card__vitals"
          aria-label={abnormalVitalsSummary({ hrAbnormal, bpAbnormal, spo2Abnormal, tempAbnormal })}
        >
          <span className={hrAbnormal ? 'patient-card__vital patient-card__vital--critical' : 'patient-card__vital'}>
            <small>HR</small>
            <strong>{hr ?? '--'}</strong>
          </span>
          <span className={bpAbnormal ? 'patient-card__vital patient-card__vital--warning' : 'patient-card__vital'}>
            <small>BP</small>
            <strong>{sbp ?? '--'}/{dbp ?? '--'}</strong>
          </span>
          <span className={spo2Abnormal ? 'patient-card__vital patient-card__vital--critical' : 'patient-card__vital'}>
            <small>SpO2</small>
            <strong>{spo2 ?? '--'}%</strong>
          </span>
          <span className={tempAbnormal ? 'patient-card__vital patient-card__vital--warning patient-card__vital-temp' : 'patient-card__vital patient-card__vital-temp'}>
            <small>Temp</small>
            <strong>{temp ?? '--'}°</strong>
          </span>
        </div>
      ) : null}

      {cardDensity.showScores && scores.length ? (
        <div className="patient-card__scores" aria-label="Saved score badges">
          {scores.map((score) => (
            <span
              key={score.key}
              className={`patient-card__score patient-card__score--${score.tone}`}
              title={score.label}
            >
              {score.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="patient-card__flags" aria-label="Patient flags and statuses">
        {patientFlags(patient).map((flag) => {
          const color = flagColors[flag];
          const label = flagLabels[flag];
          if (!color || !label) return null;
          return (
            <span
              key={flag}
              title={flag}
              aria-label={label}
              style={{
                '--patient-flag-color': color,
              } as CSSProperties}
              className="patient-card__flag"
            >
              {label}
            </span>
          );
        })}
      </div>

      <PatientCardToolChips patient={patient} readOnlyDisplay={readOnlyDisplay} />

      {nativeAiRoutingEnabled ? <NativeAiRoutingBadge patient={patient} compact /> : null}
      {nativeAiRoutingEnabled ? <SpecialistInferenceBadge patient={patient} compact /> : null}
      {nlpTriageExpertEnabled ? <TriageExpertBadge patient={patient} compact /> : null}
      {postEdOrientationEnabled ? <PostEdOrientationBadge patient={patient} compact /> : null}

      {documentArtifactsEnabled ? (
        <PatientDocumentArtifactsStrip
          patient={patient}
          compact={cardDensity.variant !== 'expanded'}
          readOnly={readOnlyDisplay}
        />
      ) : null}

      <button
        type="button"
        className="patient-card__timeline-button"
        aria-label={`Open timeline for ${patientName}`}
        onClick={handleTimelineClick}
      >
        Timeline
      </button>

      {showWorkflowActions ? (
        <div className="patient-card__mission-actions" aria-label={`Whiteboard actions for ${patientName}`}>
          <button type="button" onClick={handleDetailClick}>
            {workflowProfile === 'physician' ? 'Review' : 'Open Detail'}
          </button>
          {moveQueuePresentation.visible ? (
            <button
              type="button"
              onClick={handleMoveNext}
              disabled={!canMoveNext}
              title={canMoveNext ? `Move to ${nextState}` : 'Queue move unavailable for this patient or role'}
            >
              Move: {nextState}
            </button>
          ) : null}
          {flagsPresentation.visible ? (
          <button
            type="button"
            onClick={handleReassessment}
            disabled={!hasReassessmentDue && !canManageFlags}
            className={hasReassessmentDue ? 'patient-card__action--reassess-due' : undefined}
            title={
              hasReassessmentDue
                ? 'Open reassessment task'
                : canManageFlags
                  ? 'Flag patient for reassessment'
                  : 'Reassessment launch unavailable for this role'
            }
          >
            {hasReassessmentDue ? 'Reassess' : '+Reassess'}
          </button>
          ) : null}
          {referralPresentation.visible ? (
            <button
              type="button"
              onClick={handleReferral}
              disabled={!canManageReferral}
              title={
                canManageReferral
                  ? 'Create referral from existing workflow'
                  : referralPresentation.readOnly
                    ? 'Referral workflow is read-only for this role'
                    : 'Referral workflow unavailable for this role'
              }
            >
              Refer
            </button>
          ) : null}
          {workflowProfile === 'charge' ? (
            <button
              type="button"
              onClick={handleBoarding}
              disabled={!canBoardPatient}
              title={canBoardPatient ? 'Move patient to boarding/admission state' : 'Boarding action unavailable for this patient or role'}
            >
              {isBoarding ? 'Boarded' : 'Board'}
            </button>
          ) : null}
          {dispositionPresentation.visible ? (
            <button
              type="button"
              onClick={handleDischarge}
              disabled={!canDischarge || isDischarged}
              title={
                canDischarge && !isDischarged
                  ? 'Open discharge confirmation'
                  : dispositionPresentation.readOnly
                    ? 'Disposition is read-only for this role'
                    : 'Discharge unavailable for this patient or role'
              }
            >
              Discharge
            </button>
          ) : null}
          {workflowProfile === 'physician' && copilotPresentation.visible ? (
            <button
              type="button"
              onClick={handleCopilot}
              disabled={!canUseCopilot}
              title={canUseCopilot ? 'Open ED Copilot for this patient' : 'Copilot unavailable for this role'}
            >
              AI
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(PatientCard);
