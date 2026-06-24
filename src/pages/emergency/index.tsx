import { useCallback, useEffect, useMemo, useState } from 'react';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import { PatientFlag, PatientState, Priority, type EMSArrival, type FitToWaitClassificationId, type Patient } from '../../types/emergency';
import { hasPatientFlag, useEmergencyStore, type EmergencyOperationalMetricKey } from '../../store/emergencyStore';
import { useEmergencyWhiteboard, useUpgradeHarnessPatientFlow } from '../../hooks/useEmergencyOs';
import useOperationalIntelligence from '../../hooks/useOperationalIntelligence';
import useWhiteboardDisplayMode from '../../hooks/useWhiteboardDisplayMode';
import useDisplayAutoRefresh, { useStableDisplaySnapshot } from '../../hooks/useDisplayAutoRefresh';
import { isDisplayAutoRefreshScreenMode } from '../../config/displayAutoRefreshModel';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  canOpenOperationalMetricOnWhiteboard,
  filterOperationalMetrics,
  getOperationalMetricRoute,
  getWhiteboardMetricHandler,
} from '../../config/operationalMetricsModel';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  getReceptionEmbeddedIntakePath,
  getReceptionQuickCreatePath,
  prefersReceptionForPatientCreate,
} from '../../config/emergencyRolePermissions';
import { isReceptionFirstUxEnabled } from '../../config/receptionFirstUx.config';
import { getCentralControlPolicy } from '../../config/centralControl.config';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import useTriageScreen from '../../hooks/useTriageScreen';
import useChargeNurseScreen from '../../hooks/useChargeNurseScreen';
import useReceptionScreen from '../../hooks/useReceptionScreen';
import usePhysicianScreen from '../../hooks/usePhysicianScreen';
import usePublicWaitingScreen from '../../hooks/usePublicWaitingScreen';
import useReadOnlyWhiteboardScreen from '../../hooks/useReadOnlyWhiteboardScreen';
import useCommandCenterScreen from '../../hooks/useCommandCenterScreen';
import PatientCard from '../../components/PatientCard';
import QuickIntake from '../../components/QuickIntake';
import WhoNextPanel from '../../components/WhoNextPanel.tsx';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import OperationalEmptyState, {
  OperationalEmptyAction,
} from '../../components/ui/OperationalEmptyState';
import ToolApiErrorBanner from '../../components/ToolApiErrorBanner';
import { ERROR_RECOVERY_COPY } from '../../config/errorRecoveryModel';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import CapacityCrisisMode from '../../components/CapacityCrisisMode';
import QueueIntelligencePanel from '../../components/QueueIntelligencePanel';
import ChargeNurseOperationalStrip from '../../components/whiteboard/ChargeNurseOperationalStrip';
import PhysicianOperationalStrip from '../../components/whiteboard/PhysicianOperationalStrip';
import OperationalHandoffDomainBar from '../../components/whiteboard/OperationalHandoffDomainBar';
import WhiteboardOpsDetailStrip from '../../components/whiteboard/WhiteboardOpsDetailStrip';
import { evaluateWhiteboardDensity } from '../../config/whiteboardDensityModel';
import { resolveScreenDensityProfile } from '../../config/screenDensityModeModel';
import useScreenDensityMode from '../../hooks/useScreenDensityMode';
import ReassessmentAttentionStrip from '../../components/whiteboard/ReassessmentAttentionStrip';
import WaitingRoomSafetyBoard from '../../components/whiteboard/WaitingRoomSafetyBoard';
import PatientExperienceStatusStrip from '../../components/patient-experience/PatientExperienceStatusStrip';
import WhatHappensNextStrip from '../../components/guidance/WhatHappensNextStrip';
import LwbsRiskStrip from '../../components/waiting-room/LwbsRiskStrip';
import DeteriorationWatchStrip from '../../components/waiting-room/DeteriorationWatchStrip';
import WaitingRoomSafetyEscalationStrip from '../../components/waiting-room/WaitingRoomSafetyEscalationStrip';
import HighRiskComplaintAttentionStrip from '../../components/waiting-room/HighRiskComplaintAttentionStrip';
import FitToWaitAttentionStrip from '../../components/waiting-room/FitToWaitAttentionStrip';
import QueueReasonAttentionStrip from '../../components/queues/QueueReasonAttentionStrip';
import TriageBreachStrip from '../../components/triage/TriageBreachStrip';
import ProviderWaitBreachStrip from '../../components/provider-wait/ProviderWaitBreachStrip';
import ReceptionEscalationAttentionStrip from '../../components/reception/ReceptionEscalationAttentionStrip';
import PatientCommunicationStatusPanel from '../../components/waiting-room/PatientCommunicationStatusPanel';
import DepartmentStatusScreen from '../../components/whiteboard/DepartmentStatusScreen';
import PublicWaitingDisplay from '../../components/whiteboard/PublicWaitingDisplay';
import CommandCenterThroughputScreen from '../../components/whiteboard/CommandCenterThroughputScreen';
import { buildDepartmentStatusSnapshot, filterDepartmentStatusSnapshot } from '../../components/whiteboard/departmentStatusScreenModel';
import { buildPublicWaitingDisplaySnapshot } from '../../components/whiteboard/publicWaitingDisplayModel';
import { buildCommandCenterThroughputSnapshot, filterCommandCenterThroughputSnapshot } from '../../components/whiteboard/commandCenterThroughputModel';
import {
  resolveChargeNurseStripMetricIds,
  resolveCommandCenterMetricIds,
  resolveCommandCenterWidgetVisibility,
  resolvePublicWaitingKpiWidgets,
} from '../../config/emergencyScreenKpiPolicy';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import useOperationalPresentation from '../../hooks/useOperationalPresentation';
import { applyWallDisplayMonitorPrivacy, resolveReadOnlyWhiteboardPrivacyLabel } from '../../config/wallDisplayMonitorPrivacyModel';
import { READ_ONLY_WHITEBOARD_METRIC_IDS } from '../../config/readOnlyWhiteboardScreenModel';
import ReferralAttentionStrip from '../../components/whiteboard/ReferralAttentionStrip';
import EmsAttentionStrip from '../../components/whiteboard/EmsAttentionStrip';
import EmsOffloadTrackerPanel from '../../components/ems/EmsOffloadTrackerPanel';
import EmsOffloadAttentionStrip from '../../components/ems/EmsOffloadAttentionStrip';
import EmsOffloadAggregateStrip from '../../components/ems/EmsOffloadAggregateStrip';
import { shouldShowChargeNurseOperationalStrip } from '../../components/whiteboard/chargeNurseWorkflowModel';
import { shouldShowShiftHandoffStrip } from '../../components/whiteboard/shiftHandoffSnapshotModel';
import { buildOperationalHandoffDomains } from '../../components/whiteboard/operationalHandoffSummaryModel';
import {
  patientMatchesReassessmentAttention,
  shouldShowReassessmentAttentionStrip,
} from '../../components/whiteboard/reassessmentVisibilityModel';
import {
  summarizeReferralAwareness,
  shouldShowReferralAttentionStrip,
} from '../../components/whiteboard/referralAwarenessModel';
import {
  getArrivalOffloadMinutes,
  shouldShowEmsAttentionStrip,
  summarizeEmsAwareness,
} from '../../components/whiteboard/emsAwarenessModel';
import { formatEta as formatEmsEta } from '../../utils/emsArrivalDisplay';
import { resolvePatientCardWorkflowProfile, shouldShowPhysicianOperationalStrip } from '../../components/whiteboard/physicianWorkflowModel';
import { resolvePhysicianStaffId } from '../../utils/whoNext';
import { sortWhiteboardPatients } from '../../utils/emergencyWhiteboardSorting';
import { completeIntakeHandoff, refreshIntakeHandoffSurfaces } from '../../services/receptionHandoff';
import { convertEmsArrivalForReception } from '../../services/receptionIntakeBridge';
import { matchesWhiteboardQueueFilter } from '../../services/queueAssignment';
import { evaluateWhiteboardOperationalLoad } from '../../components/whiteboard/whiteboardOperationalLoadModel';
import { AiTriageAssistPanelForPatientId } from '../../components/reception/AiTriageAssistPanel';
import '../../components/EmergencyWhiteboard.css';

type FilterId = 'All' | 'Waiting' | 'Assessment' | 'High Risk' | 'EMS' | 'Boarding' | 'Reassess';
type UpgradeHarnessSignal = {
  capability: string;
  data?: {
    alerts?: unknown[];
    candidates?: unknown[];
  };
};

const FILTERS: FilterId[] = ['All', 'Waiting', 'Assessment', 'High Risk', 'Reassess', 'EMS', 'Boarding'];
const CLOSED_REFERRAL_STATUSES = new Set(['Closed', 'Completed', 'Declined', 'PatientDeparted']);
const WHITEBOARD_CHARGE_ROUTES = {
  queues: CANONICAL_ROUTES.emergencyQueues,
  reassessment: CANONICAL_ROUTES.emergencyReassessment,
  ems: CANONICAL_ROUTES.emergencyEms,
  capacity: CANONICAL_ROUTES.emergencyCapacity,
  boarding: CANONICAL_ROUTES.emergencyBoarding,
} as const;

function isHighRisk(patient: Patient): boolean {
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    hasPatientFlag(patient, PatientFlag.HighRisk) ||
    hasPatientFlag(patient, PatientFlag.DeteriorationRisk) ||
    hasPatientFlag(patient, PatientFlag.SepsisAlert)
  );
}

function isBoarding(patient: Patient): boolean {
  return (
    patient.state === PatientState.Admission || hasPatientFlag(patient, PatientFlag.PendingAdmission)
  );
}

function filterPatient(patient: Patient, activeFilter: FilterId): boolean {
  if (patient.state === PatientState.Discharge) return false;
  if (activeFilter === 'Waiting') return patient.state === PatientState.Waiting;
  if (activeFilter === 'Assessment') return patient.state === PatientState.Assessment;
  if (activeFilter === 'High Risk') return isHighRisk(patient);
  if (activeFilter === 'EMS') return hasPatientFlag(patient, PatientFlag.EMSArrival);
  if (activeFilter === 'Boarding') return isBoarding(patient);
  if (activeFilter === 'Reassess') return patientMatchesReassessmentAttention(patient);
  return true;
}

function isOpenReferralStatus(status?: string): boolean {
  return !CLOSED_REFERRAL_STATUSES.has(String(status || '').trim());
}

function findUpgradeSignal(
  signals: UpgradeHarnessSignal[],
  capability: string,
): UpgradeHarnessSignal | null {
  return signals.find((signal) => signal.capability === capability) || null;
}

function StatCard({
  value,
  label,
  tone = 'default',
  title,
  onClick,
  emphasized = false,
}: {
  value: string | number;
  label: string;
  tone?: 'default' | 'info' | 'success' | 'warning' | 'critical';
  title?: string;
  onClick?: () => void;
  emphasized?: boolean;
}) {
  const toneColor =
    tone === 'critical'
      ? 'var(--status-critical, #EF4444)'
      : tone === 'warning'
        ? 'var(--status-warning, #F59E0B)'
        : tone === 'success'
          ? 'var(--status-stable, #10B981)'
          : tone === 'info'
            ? 'var(--status-info, #60A5FA)'
            : 'var(--color-text-primary, #F9FAFB)';

  const sharedStyle = {
    flex: '1 1 0',
    minWidth: 120,
    padding: '14px 16px',
    borderRight: '1px solid var(--color-border-subtle, #1F2937)',
    background: emphasized
      ? 'color-mix(in srgb, var(--status-warning, #F59E0B) 10%, var(--color-surface, #111827))'
      : undefined,
    boxShadow: emphasized
      ? 'inset 0 3px 0 color-mix(in srgb, var(--status-warning, #F59E0B) 72%, transparent)'
      : undefined,
  } as const;

  if (onClick) {
    return (
      <button
        type="button"
        className="emergency-whiteboard-page__stat emergency-whiteboard-page__stat--interactive"
        title={title}
        onClick={onClick}
        style={{
          ...sharedStyle,
          border: emphasized ? '1px solid color-mix(in srgb, var(--status-warning, #F59E0B) 34%, var(--color-border-subtle, #1F2937))' : '0',
          borderRight: emphasized
            ? '1px solid color-mix(in srgb, var(--status-warning, #F59E0B) 34%, var(--color-border-subtle, #1F2937))'
            : '1px solid var(--color-border-subtle, #1F2937)',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            color: 'var(--color-text-primary, #F9FAFB)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 24,
            lineHeight: 1.1,
            fontWeight: 700,
          }}
        >
          {value}
        </div>
        <div style={{ color: toneColor, fontSize: 12, fontWeight: tone === 'default' ? 500 : 800, marginTop: 4 }}>{label}</div>
      </button>
    );
  }

  return (
    <div
      className="emergency-whiteboard-page__stat"
      title={title}
      style={sharedStyle}
    >
      <div
        style={{
          color: 'var(--color-text-primary, #F9FAFB)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 24,
          lineHeight: 1.1,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
      <div style={{ color: toneColor, fontSize: 12, fontWeight: tone === 'default' ? 500 : 800, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function minutesRemaining(arrival: EMSArrival): number {
  const target = new Date(arrival.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) return arrival.eta ?? 0;
  return Math.ceil((target - Date.now()) / 60000);
}

function formatEta(arrival: EMSArrival): string {
  const remaining = minutesRemaining(arrival);
  if (arrival.status === 'Arrived' || arrival.status === 'Handoff' || remaining <= 0) return 'Arrived';
  return `${remaining} min`;
}

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn;
}

function routePermissionPath(path: string): string {
  return path.split(/[?#]/)[0] || path;
}

function capacityTone(band?: string): 'success' | 'warning' | 'critical' | 'info' {
  if (band === 'Red') return 'critical';
  if (band === 'Orange' || band === 'Yellow') return 'warning';
  if (band === 'Green') return 'success';
  return 'info';
}

function formatFreshness(value?: string | null): string {
  if (!value) return 'local';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'local';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 1) return 'now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  return `${Math.round(elapsedMinutes / 60)}h ago`;
}

function MissionButton({
  label,
  onClick,
  disabled = false,
  title,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: 'default' | 'primary' | 'warning';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        border: '1px solid var(--color-border-subtle, #1F2937)',
        borderRadius: 12,
        background:
          tone === 'primary'
            ? 'var(--component-button-primary-bg, #2563EB)'
            : tone === 'warning'
              ? 'color-mix(in srgb, var(--status-warning, #F59E0B) 14%, var(--color-card, #172033))'
              : 'var(--color-floating-surface, #1E293B)',
        color: disabled ? 'var(--color-text-muted, #6B7280)' : 'var(--color-text-primary, #F9FAFB)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 850,
        minHeight: 36,
        opacity: disabled ? 0.58 : 1,
        padding: '8px 10px',
        textAlign: 'left',
      }}
    >
      {label}
    </button>
  );
}

export default function EmergencyWhiteboard() {
  const { profileNavigate } = useProfileNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const triage = useTriageScreen();
  const charge = useChargeNurseScreen();
  const reception = useReceptionScreen();
  const physician = usePhysicianScreen();
  const publicWaiting = usePublicWaitingScreen();
  const readOnlyWhiteboard = useReadOnlyWhiteboardScreen();
  const commandCenter = useCommandCenterScreen();
  const storePatients = useEmergencyStore((state) => state.patients);
  const storeCapacity = useEmergencyStore((state) => state.capacity);
  const storeLoading = useEmergencyStore((state) => state.loading);
  const rooms = useEmergencyStore((state) => state.rooms);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const alerts = useEmergencyStore((state) => state.alerts);
  const emsIncomingPatients = useEmergencyStore((state) => state.emsIncomingPatients);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const prepareEMSBay = useEmergencyStore((state) => state.prepareEMSBay);
  const setFitToWaitClassification = useEmergencyStore((state) => state.setFitToWaitClassification);
  const centralControlSettings = useEmergencyStore(
    (state) => state.emergencySettings.centralControl,
  );
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const boardingMetrics = useEmergencyStore((state) => state.boardingMetrics);
  const emergencyAnalytics = useEmergencyStore((state) => state.emergencyAnalytics);
  const loadEmergencyAnalytics = useEmergencyStore((state) => state.loadEmergencyAnalytics);
  const initializeFromBackend = useEmergencyStore((state) => state.initializeFromBackend);
  const display = useWhiteboardDisplayMode();
  const presentationScreenMode = display.isWaitingRoomDisplay
    ? CARE_DROID_SCREEN_MODES.publicWaiting
    : display.isDisplayMode
      ? CARE_DROID_SCREEN_MODES.readOnlyWhiteboard
      : commandCenter.isCommandCenterScreen
        ? CARE_DROID_SCREEN_MODES.commandCenter
        : physician.isPhysicianScreen
          ? CARE_DROID_SCREEN_MODES.physician
          : charge.isChargeNurseScreen
            ? CARE_DROID_SCREEN_MODES.chargeNurse
            : undefined;
  const presentation = useOperationalPresentation(presentationScreenMode);
  const routeScreenMode = display.screenMode;
  const screenDensity = useScreenDensityMode();
  const whiteboard = useEmergencyWhiteboard();
  const upgradePatientFlow = useUpgradeHarnessPatientFlow();
  const whiteboardPayload = (
    whiteboard.data as { data?: { patients?: Patient[]; capacity?: typeof storeCapacity } } | null
  )?.data;
  const whiteboardGeneratedAt = (
    whiteboard.data as { generatedAt?: string } | null
  )?.generatedAt;
  const patients = useMemo(() => {
    const payloadPatients = whiteboardPayload?.patients;
    if (!payloadPatients?.length) return storePatients;
    const payloadIds = new Set(payloadPatients.map((patient) => patient.id));
    return [...payloadPatients, ...storePatients.filter((patient) => !payloadIds.has(patient.id))];
  }, [storePatients, whiteboardPayload?.patients]);
  const upgradeFlowSignals = (
    upgradePatientFlow.data as { data?: { signals?: UpgradeHarnessSignal[] } } | null
  )?.data?.signals || [];
  const wearableSignal = findUpgradeSignal(upgradeFlowSignals, 'wearable_iomt_processing');
  const vvtSignal = findUpgradeSignal(upgradeFlowSignals, 'virtual_visit_track');
  const wearableAlertCount = wearableSignal?.data?.alerts?.length || 0;
  const virtualVisitCandidateCount = vvtSignal?.data?.candidates?.length || 0;
  const bragSignal = findUpgradeSignal(upgradeFlowSignals, 'brag_forecast_10h');
  const capacity = whiteboardPayload?.capacity || storeCapacity;
  const [activeFilter, setActiveFilter] = useState<FilterId>('All');
  const [showIntake, setShowIntake] = useState(false);
  const [emsOffloadPanelOpen, setEmsOffloadPanelOpen] = useState(false);
  const [queuePanelCollapsed, setQueuePanelCollapsed] = useState(false);
  const [toast, setToast] = useState('');
  const [clockTick, setClockTick] = useState(() => Date.now());
  const createPatientPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.createPatient);
  const prepareBayPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.prepareEmsBay);
  const convertEmsPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.convertEmsArrival);
  const manageReferralPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.manageReferral);
  const whiteboardMutationPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.transitionPatient);
  const canCreatePatient = createPatientPresentation.enabled;
  const canPrepareBay = prepareBayPresentation.enabled;
  const canConvertEmsArrival = convertEmsPresentation.enabled;
  const canManageReferral = manageReferralPresentation.enabled;
  const canReviewTriage = triage.canAssignAcuity;
  const canClassifyFitToWait = triage.canClassifyFitToWait;
  const centralControl = useMemo(
    () =>
      getCentralControlPolicy({
        role: emergencyRole.role,
        can: emergencyRole.can,
        settings: centralControlSettings,
      }),
    [centralControlSettings, emergencyRole],
  );
  const operationalIntelligence = useOperationalIntelligence({ screenMode: routeScreenMode });
  const centralSnapshot = operationalIntelligence.centralSnapshot;
  const intelligenceSnapshot = operationalIntelligence.snapshot;
  const isRegistrationClerk = emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk;
  const canMutateWhiteboard =
    whiteboardMutationPresentation.visible &&
    emergencyRole.canMutateSurface({
    readOnlyDisplayMode: display.isDisplayMode,
    displayParam: emergencyRole.permissionContext.displayParam,
  });
  const commandLayerMetrics = useMemo(
    () => filterOperationalMetrics(centralSnapshot.operationalSummary.metrics, 'whiteboard'),
    [centralSnapshot.operationalSummary.metrics],
  );
  const breachedQueueCount = centralSnapshot.queueHealth.filter((queue) => queue.breached).length;
  const canUseCentralIntake =
    canMutateWhiteboard &&
    !isRegistrationClerk &&
    !(physician.isPhysicianScreen && physician.hideCentralIntake) &&
    ((createPatientPresentation.visible && canCreatePatient) ||
      (centralControl.enabled && !emergencyRole.readOnly));
  const physicianStaffId = useMemo(
    () => resolvePhysicianStaffId({ staff, activeShift }),
    [activeShift, staff],
  );
  const isInitialLoading = (storeLoading || whiteboard.loading) && patients.length === 0;
  const activeEmsArrivals = useMemo(
    () => emsArrivals.filter((arrival) => !['Complete', 'Cancelled'].includes(arrival.status)),
    [emsArrivals],
  );
  const emsAwareness = useMemo(() => {
    const offloadTargetMinutes =
      Number(
        useEmergencyStore.getState().emergencySettings?.thresholds?.emsOffloadTargetMinutes ??
          useEmergencyStore.getState().emergencySettings?.emsThresholds?.offloadTargetMinutes ??
          15,
      ) || 15;
    return summarizeEmsAwareness(emsArrivals, clockTick, {
      patients,
      staff,
      rooms,
      offloadTargetMinutes,
    });
  }, [clockTick, emsArrivals, patients, rooms, staff]);
  const showEmsAttentionStrip = shouldShowEmsAttentionStrip({
    displayMode: display.isDisplayMode,
    summary: emsAwareness,
  });
  const reassessmentPatients = useMemo(
    () => patients.filter(patientMatchesReassessmentAttention).sort(sortWhiteboardPatients),
    [patients],
  );
  const reassessmentAttentionCount = reassessmentPatients.length;
  const referralAwareness = useMemo(() => summarizeReferralAwareness(referrals), [referrals]);
  const showReassessmentAttentionStrip = shouldShowReassessmentAttentionStrip({
    displayMode: display.isDisplayMode,
    attentionCount: reassessmentAttentionCount,
  });
  const showReferralAttentionStrip = shouldShowReferralAttentionStrip({
    displayMode: display.isDisplayMode,
    total: referralAwareness.total,
  });

  const stats = useMemo(() => {
    const waiting = patients.filter((patient) => patient.state === PatientState.Waiting).length;
    const highRisk = patients.filter(isHighRisk).length;
    const boarding = patients.filter(isBoarding).length;
    const reassessmentDue =
      capacity.reassessmentDueCount ??
      capacity.reassessmentDue ??
      reassessmentAttentionCount;

    return {
      total: patients.length,
      waiting,
      highRisk,
      boarding,
      reassessmentDue,
    };
  }, [capacity.reassessmentDue, capacity.reassessmentDueCount, patients, reassessmentAttentionCount]);

  const departmentStatusSnapshot = useMemo(
    () =>
      buildDepartmentStatusSnapshot({
        patients,
        capacity,
        emsArrivals,
        referrals,
        staff,
        rooms,
        emergencySettings,
        now: new Date(clockTick),
        updatedAt: capacity.updatedAt || whiteboardGeneratedAt,
        offloadTargetMinutes:
          Number(
            emergencySettings?.thresholds?.emsOffloadTargetMinutes ??
              emergencySettings?.emsThresholds?.offloadTargetMinutes ??
              15,
          ) || 15,
      }),
    [
      capacity,
      clockTick,
      emsArrivals,
      emergencySettings,
      patients,
      referrals,
      rooms,
      staff,
      whiteboardGeneratedAt,
    ],
  );

  const readOnlyDepartmentMetricIds = useMemo(
    () =>
      readOnlyWhiteboard.visibleMetricIds.length > 0
        ? readOnlyWhiteboard.visibleMetricIds
        : READ_ONLY_WHITEBOARD_METRIC_IDS,
    [readOnlyWhiteboard.visibleMetricIds],
  );

  const publicWaitingSnapshot = useMemo(
    () =>
      buildPublicWaitingDisplaySnapshot({
        patients,
        capacity,
        referrals,
        emsArrivals,
        showEmsCrowdingImpact: publicWaiting.showEmsCrowdingImpact,
        offloadTargetMinutes:
          Number(emergencySettings?.thresholds?.emsOffloadTargetMinutes ?? 15) || 15,
        updatedAt: capacity.updatedAt || whiteboardGeneratedAt,
      }),
    [
      capacity,
      emsArrivals,
      emergencySettings?.thresholds?.emsOffloadTargetMinutes,
      patients,
      publicWaiting.showEmsCrowdingImpact,
      referrals,
      whiteboardGeneratedAt,
    ],
  );

  const readOnlyDepartmentSnapshot = useMemo(() => {
    const filtered = filterDepartmentStatusSnapshot(
      departmentStatusSnapshot,
      readOnlyDepartmentMetricIds,
    );
    return applyWallDisplayMonitorPrivacy(
      filtered,
      emergencySettings.wallDisplayMonitorPrivacy,
    );
  }, [
    departmentStatusSnapshot,
    emergencySettings.wallDisplayMonitorPrivacy,
    readOnlyDepartmentMetricIds,
  ]);

  const commandCenterSnapshot = useMemo(
    () =>
      buildCommandCenterThroughputSnapshot({
        patients,
        capacity,
        referrals,
        emsArrivals,
        staff,
        rooms,
        boardingMetrics,
        emergencySettings,
        centralSnapshot,
        intelligenceSnapshot,
        hourlyArrivals:
          (emergencyAnalytics.data?.operationalCommand?.hourlyArrivals as
            | Array<{ hour: string; count: number }>
            | undefined) || [],
        waitTrend:
          (emergencyAnalytics.data?.operationalCommand?.waitTrend as
            | Array<{ date: string; avgWaitMinutes: number }>
            | undefined) || [],
        dailyVolume:
          (emergencyAnalytics.data?.operationalCommand?.dailyVolume as
            | Array<{ date: string; count: number }>
            | undefined) || [],
        analyticsSource: emergencyAnalytics.source,
        bragPeakBand: bragSignal?.data?.peakBand || null,
        bragDetail: bragSignal?.data?.forecast?.slice(-1)?.[0]?.humanReviewTrigger || null,
        updatedAt: capacity.updatedAt || whiteboardGeneratedAt,
        offloadTargetMinutes:
          Number(
            emergencySettings?.thresholds?.emsOffloadTargetMinutes ??
              emergencySettings?.emsThresholds?.offloadTargetMinutes ??
              15,
          ) || 15,
      }),
    [
      boardingMetrics,
      bragSignal?.data,
      capacity,
      centralSnapshot,
      emsArrivals,
      emergencyAnalytics.data?.operationalCommand?.hourlyArrivals,
      emergencyAnalytics.data?.operationalCommand?.waitTrend,
      emergencyAnalytics.data?.operationalCommand?.dailyVolume,
      emergencyAnalytics.source,
      emergencySettings,
      intelligenceSnapshot,
      patients,
      referrals,
      rooms,
      staff,
      whiteboardGeneratedAt,
    ],
  );

  const screenModeKpiSettings = useMemo(
    () => ({
      screenModeKpiVisibility: emergencySettings.screenModeKpiVisibility,
      publicDisplayPrivacy: emergencySettings.publicDisplayPrivacy,
    }),
    [emergencySettings.publicDisplayPrivacy, emergencySettings.screenModeKpiVisibility],
  );

  const commandCenterKpiMetricIds = useMemo(
    () =>
      commandCenter.isCommandCenterScreen
        ? resolveCommandCenterMetricIds(
            CARE_DROID_SCREEN_MODES.commandCenter,
            screenModeKpiSettings,
          )
        : null,
    [commandCenter.isCommandCenterScreen, screenModeKpiSettings],
  );

  const filteredCommandCenterSnapshot = useMemo(() => {
    if (!commandCenterKpiMetricIds?.length) return commandCenterSnapshot;
    return filterCommandCenterThroughputSnapshot(commandCenterSnapshot, commandCenterKpiMetricIds);
  }, [commandCenterKpiMetricIds, commandCenterSnapshot]);

  const stablePublicWaitingSnapshot = useStableDisplaySnapshot(publicWaitingSnapshot);
  const stableReadOnlyDepartmentSnapshot = useStableDisplaySnapshot(readOnlyDepartmentSnapshot);
  const stableCommandCenterSnapshot = useStableDisplaySnapshot(filteredCommandCenterSnapshot);

  const isNormalizedDisplayRefresh = isDisplayAutoRefreshScreenMode(display.screenMode);

  const onDisplayRefresh = useCallback(async () => {
    const [backendResult] = await Promise.all([
      initializeFromBackend(),
      whiteboard.refresh(),
      commandCenter.isCommandCenterScreen
        ? loadEmergencyAnalytics({ force: true })
        : Promise.resolve(undefined),
    ]);
    return backendResult;
  }, [
    commandCenter.isCommandCenterScreen,
    initializeFromBackend,
    loadEmergencyAnalytics,
    whiteboard.refresh,
  ]);

  const displayRefreshStatus = useDisplayAutoRefresh({
    enabled: isNormalizedDisplayRefresh,
    screenMode: display.screenMode,
    settings: {
      wallDisplayRefreshInterval: emergencySettings.wallDisplayRefreshInterval,
    },
    contentUpdatedAt: capacity.updatedAt || whiteboardGeneratedAt || null,
    hasContent: Boolean(
      stablePublicWaitingSnapshot ||
        stableReadOnlyDepartmentSnapshot?.metrics?.length ||
        stableCommandCenterSnapshot?.metrics?.length ||
        patients.length,
    ),
    onRefresh: onDisplayRefresh,
  });

  const commandCenterKpiWidgets = useMemo(
    () =>
      commandCenter.isCommandCenterScreen
        ? resolveCommandCenterWidgetVisibility(
            CARE_DROID_SCREEN_MODES.commandCenter,
            screenModeKpiSettings,
          )
        : null,
    [commandCenter.isCommandCenterScreen, screenModeKpiSettings],
  );

  const publicWaitingKpiWidgets = useMemo(
    () =>
      publicWaiting.isPublicWaitingScreen
        ? resolvePublicWaitingKpiWidgets(
            CARE_DROID_SCREEN_MODES.publicWaiting,
            screenModeKpiSettings,
          )
        : null,
    [publicWaiting.isPublicWaitingScreen, screenModeKpiSettings],
  );

  const chargeNurseKpiMetricIds = useMemo(
    () =>
      charge.isChargeNurseScreen
        ? resolveChargeNurseStripMetricIds(
            CARE_DROID_SCREEN_MODES.chargeNurse,
            screenModeKpiSettings,
          )
        : null,
    [charge.isChargeNurseScreen, screenModeKpiSettings],
  );

  const operationalLoad = useMemo(
    () =>
      evaluateWhiteboardOperationalLoad({
        waitingPatients: stats.waiting,
        emsArrivals: emsAwareness.inboundCount || activeEmsArrivals.length,
        reassessmentsDue: reassessmentAttentionCount,
        referralsPending: referralAwareness.buckets.pending,
        totalPatients: stats.total,
      }),
    [
      activeEmsArrivals.length,
      emsAwareness.inboundCount,
      reassessmentAttentionCount,
      referralAwareness.buckets.pending,
      stats.total,
      stats.waiting,
    ],
  );
  const prioritizeAwareness = display.operationalAwarenessOnly || operationalLoad.prioritizeAwareness;

  const pendingReferralPatientIds = useMemo(
    () =>
      new Set(
        referrals
          .filter((referral) => isOpenReferralStatus(referral.status))
          .map((referral) => referral.patientId),
      ),
    [referrals],
  );

  const visiblePatients = useMemo(
    () =>
      patients
        .filter((patient) =>
          activeQueueFilter
            ? matchesWhiteboardQueueFilter(patient, activeQueueFilter, pendingReferralPatientIds)
            : filterPatient(patient, activeFilter),
        )
        .sort(sortWhiteboardPatients),
    [activeFilter, activeQueueFilter, patients, pendingReferralPatientIds],
  );

  const boardPatients = useMemo(() => {
    if (
      !operationalLoad.maxVisibleCards ||
      activeQueueFilter ||
      activeFilter !== 'All'
    ) {
      return visiblePatients;
    }
    return visiblePatients.slice(0, operationalLoad.maxVisibleCards);
  }, [activeFilter, activeQueueFilter, operationalLoad.maxVisibleCards, visiblePatients]);

  const hiddenBoardCount = Math.max(0, visiblePatients.length - boardPatients.length);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (operationalLoad.collapseQueueIntelligence) {
      setQueuePanelCollapsed(true);
    }
  }, [operationalLoad.collapseQueueIntelligence]);

  useEffect(() => {
    if (!canUseCentralIntake) return undefined;
    const openIntake = () => {
      if (prefersReceptionForPatientCreate(emergencyRole.role)) {
        profileNavigate(getReceptionQuickCreatePath());
        return;
      }
      if (canUseCentralIntake) setShowIntake(true);
    };
    const closePanels = () => setShowIntake(false);
    document.addEventListener('open-intake', openIntake);
    document.addEventListener('close-all-panels', closePanels);
    return () => {
      document.removeEventListener('open-intake', openIntake);
      document.removeEventListener('close-all-panels', closePanels);
    };
  }, [canUseCentralIntake, emergencyRole.role, profileNavigate]);

  useEffect(() => {
    const clearFilters = () => {
      setActiveFilter('All');
      setQueueFilter(null);
    };
    document.addEventListener('clear-whiteboard-filters', clearFilters);
    return () => document.removeEventListener('clear-whiteboard-filters', clearFilters);
  }, [setQueueFilter]);

  const showShiftHandoffStrip = useMemo(
    () =>
      shouldShowShiftHandoffStrip({
        roleId: emergencyRole.role,
        displayMode: display.isDisplayMode,
        isRegistrationClerk,
      }),
    [display.isDisplayMode, emergencyRole.role, isRegistrationClerk],
  );

  const operationalHandoffDomains = useMemo(
    () =>
      buildOperationalHandoffDomains({
        patients,
        emsArrivals,
        referrals,
        reassessmentDue: reassessmentAttentionCount,
      }),
    [emsArrivals, patients, referrals, reassessmentAttentionCount],
  );

  const showChargeNurseStrip = useMemo(
    () =>
      !(physician.isPhysicianScreen && physician.hideChargeNurseStrip) &&
      (!charge.isChargeNurseScreen || charge.showOperationalStrip) &&
      shouldShowChargeNurseOperationalStrip({
        screenMode: routeScreenMode,
        roleId: emergencyRole.role,
        displayMode: display.isDisplayMode,
      }) &&
      !showShiftHandoffStrip,
    [
      charge.isChargeNurseScreen,
      charge.showOperationalStrip,
      display.isDisplayMode,
      emergencyRole.role,
      physician.hideChargeNurseStrip,
      physician.isPhysicianScreen,
      routeScreenMode,
      showShiftHandoffStrip,
    ],
  );

  const showPhysicianStrip = useMemo(
    () =>
      (!physician.isPhysicianScreen || physician.showOperationalStrip) &&
      shouldShowPhysicianOperationalStrip({
        screenMode: routeScreenMode,
        roleId: emergencyRole.role,
        displayMode: display.isDisplayMode,
      }) &&
      !showShiftHandoffStrip,
    [
      display.isDisplayMode,
      emergencyRole.role,
      physician.isPhysicianScreen,
      physician.showOperationalStrip,
      routeScreenMode,
      showShiftHandoffStrip,
    ],
  );

  const chargeNurseSurfaceSignals = useMemo(
    () => ({
      emsAttention: charge.isChargeNurseScreen
        ? charge.showEmsInbound && showEmsAttentionStrip
        : physician.isPhysicianScreen
          ? false
          : showEmsAttentionStrip,
      reassessAttention: charge.isChargeNurseScreen
        ? charge.showReassessmentsDue && showReassessmentAttentionStrip
        : physician.isPhysicianScreen
          ? physician.showReassessment && showReassessmentAttentionStrip
          : showReassessmentAttentionStrip,
      referralAttention: charge.isChargeNurseScreen
        ? charge.showReferralsPending && showReferralAttentionStrip
        : physician.isPhysicianScreen
          ? physician.showReferralsPending && showReferralAttentionStrip
          : showReferralAttentionStrip,
      waitingRoomSafety: charge.isChargeNurseScreen
        ? charge.showWaitingRoomBoard && stats.waiting > 0
        : triage.isTriageScreen
          ? triage.showWaitingRoomSafetyBoard && stats.waiting > 0
          : physician.isPhysicianScreen
            ? physician.showProviderWaitingQueue && stats.waiting > 0
            : stats.waiting > 0,
      inboundEmsBanner: charge.isChargeNurseScreen
        ? charge.showEmsInbound && Boolean(emsAwareness.inboundArrivals.length)
        : physician.isPhysicianScreen
          ? false
          : Boolean(emsAwareness.inboundArrivals.length),
    }),
    [
      charge.isChargeNurseScreen,
      charge.showEmsInbound,
      charge.showReassessmentsDue,
      charge.showReferralsPending,
      charge.showWaitingRoomBoard,
      triage.isTriageScreen,
      triage.showWaitingRoomSafetyBoard,
      emsAwareness.inboundArrivals.length,
      physician.isPhysicianScreen,
      physician.showProviderWaitingQueue,
      physician.showReassessment,
      physician.showReferralsPending,
      showEmsAttentionStrip,
      showReassessmentAttentionStrip,
      showReferralAttentionStrip,
      stats.waiting,
    ],
  );

  const whiteboardDensity = useMemo(
    () =>
      evaluateWhiteboardDensity({
        operationalLoad,
        displayMode: display.isDisplayMode,
        publicWaitingDisplay: display.isWaitingRoomDisplay,
        commandCenterScreen: commandCenter.isCommandCenterScreen,
        screenMode: routeScreenMode,
        densityProfile: screenDensity,
        showShiftHandoffStrip,
        prioritizeAwareness,
        signals: {
          emsAttention: chargeNurseSurfaceSignals.emsAttention,
          reassessAttention: chargeNurseSurfaceSignals.reassessAttention,
          referralAttention: chargeNurseSurfaceSignals.referralAttention,
          chargeNurseStrip: showChargeNurseStrip,
          waitingRoomSafety: chargeNurseSurfaceSignals.waitingRoomSafety,
          inboundEmsBanner: chargeNurseSurfaceSignals.inboundEmsBanner,
          opsDetailCount: 3,
        },
      }),
    [
      display.isDisplayMode,
      display.isWaitingRoomDisplay,
      commandCenter.isCommandCenterScreen,
      operationalLoad,
      prioritizeAwareness,
      routeScreenMode,
      screenDensity,
      showChargeNurseStrip,
      showShiftHandoffStrip,
      chargeNurseSurfaceSignals.emsAttention,
      chargeNurseSurfaceSignals.inboundEmsBanner,
      chargeNurseSurfaceSignals.reassessAttention,
      chargeNurseSurfaceSignals.referralAttention,
      chargeNurseSurfaceSignals.waitingRoomSafety,
    ],
  );

  const patientCardWorkflowProfile = useMemo(
    () =>
      resolvePatientCardWorkflowProfile({
        roleId: emergencyRole.role,
        screenMode: routeScreenMode,
        displayMode: display.isDisplayMode,
        canMutateWhiteboard,
        isRegistrationClerk,
      }),
    [canMutateWhiteboard, display.isDisplayMode, emergencyRole.role, isRegistrationClerk, routeScreenMode],
  );

  const openIntake = useCallback(() => {
    if (prefersReceptionForPatientCreate(emergencyRole.role)) {
      profileNavigate(getReceptionQuickCreatePath());
      return;
    }
    if (canUseCentralIntake) setShowIntake(true);
  }, [canUseCentralIntake, emergencyRole.role, profileNavigate]);

  const openRoute = useCallback((path: string) => {
    const permissionPath = routePermissionPath(path);
    profileNavigate(
      emergencyRole.canAccessRoute(permissionPath)
        ? path
        : emergencyRole.nearestRoute(permissionPath),
    );
  }, [emergencyRole, profileNavigate]);

  const openReferralWorkflow = useCallback((patientId?: string, status?: string) => {
    if (!patientId && !status && !canManageReferral) return;
    const params = new URLSearchParams();
    if (patientId) {
      params.set('patientId', patientId);
      params.set('new', '1');
    }
    if (status) params.set('status', status.toLowerCase());
    const query = params.toString();
    profileNavigate(query ? `${CANONICAL_ROUTES.emergencyReferrals}?${query}` : CANONICAL_ROUTES.emergencyReferrals);
  }, [canManageReferral, profileNavigate]);

  const handleReferralAttentionSelect = useCallback(
    (metric: { whiteboardAction?: string }) => {
      if (display.isDisplayMode) return;
      if (metric.whiteboardAction === 'filter-referral-pending') {
        setActiveFilter('All');
        setQueueFilter('referral');
        return;
      }
      if (metric.whiteboardAction === 'open-referrals-accepted') {
        openReferralWorkflow(undefined, 'accepted');
        return;
      }
      if (metric.whiteboardAction === 'open-referrals-delayed') {
        openReferralWorkflow(undefined, 'delayed');
      }
    },
    [display.isDisplayMode, openReferralWorkflow, setQueueFilter],
  );

  const handleEmsAttentionSelect = useCallback(
    (metric: { whiteboardAction?: string }) => {
      if (display.isDisplayMode) return;
      if (metric.whiteboardAction === 'filter-ems' || metric.whiteboardAction === 'filter-ems-risk') {
        setActiveFilter('EMS');
        setQueueFilter(null);
        return;
      }
      if (metric.whiteboardAction === 'focus-ems-offload') {
        setActiveFilter('EMS');
        setQueueFilter(null);
        setEmsOffloadPanelOpen(true);
        return;
      }
    },
    [display.isDisplayMode, emergencyRole, openRoute, setQueueFilter],
  );

  const openQueueReview = useCallback((queue: FilterId | null = null) => {
    if (queue) {
      setActiveFilter(queue);
      setQueueFilter(queue);
    }
  }, [setQueueFilter]);

  const openReassessmentTasks = useCallback((patientId?: string) => {
    if (patientId) selectPatient(patientId);
    document.dispatchEvent(new Event('open-reassessment-drawer'));
  }, [selectPatient]);

  const focusReassessmentOnBoard = useCallback((patientId?: string) => {
    setActiveFilter('Reassess');
    setQueueFilter(null);
    openReassessmentTasks(patientId);
  }, [openReassessmentTasks, setQueueFilter]);

  const handleWaitingRoomSafetySelect = useCallback(
    (patientId: string) => {
      if (display.isDisplayMode) return;
      selectPatient(patientId);
      setActiveFilter('Waiting');
      setQueueFilter(null);
    },
    [display.isDisplayMode, selectPatient, setQueueFilter],
  );

  const handleClassifyFitToWait = useCallback(
    (patientId: string, classificationId: string) => {
      if (display.isDisplayMode || !canMutateWhiteboard) return;
      setFitToWaitClassification(patientId, classificationId as FitToWaitClassificationId, {
        staffName: emergencyRole.roleLabel,
      });
    },
    [
      canMutateWhiteboard,
      display.isDisplayMode,
      emergencyRole.roleLabel,
      setFitToWaitClassification,
    ],
  );

  const handleOperationalMetricClick = useCallback(
    (metricKey: EmergencyOperationalMetricKey) => {
      if (display.isDisplayMode) return;
      const handler = getWhiteboardMetricHandler(metricKey);
      if (handler === 'reassessment-board') {
        focusReassessmentOnBoard();
        return;
      }
      if (handler === 'referral-awareness') {
        if (referralAwareness.buckets.delayed > 0) {
          openReferralWorkflow(undefined, 'delayed');
        } else if (referralAwareness.buckets.pending > 0) {
          setActiveFilter('All');
          setQueueFilter('referral');
        } else {
          openReferralWorkflow();
        }
        return;
      }
      if (handler === 'ems-awareness') {
        setActiveFilter('EMS');
        setQueueFilter(null);
        return;
      }
      const route = getOperationalMetricRoute(metricKey);
      if (route) openRoute(route);
    },
    [
      display.isDisplayMode,
      focusReassessmentOnBoard,
      openReferralWorkflow,
      openRoute,
      referralAwareness.buckets.delayed,
      referralAwareness.buckets.pending,
      setActiveFilter,
      setQueueFilter,
    ],
  );

  const handleReassessmentAttentionSelect = useCallback(
    (metric: { whiteboardAction?: string }) => {
      if (display.isDisplayMode) return;
      if (metric.whiteboardAction === 'filter-reassess') {
        setActiveFilter('Reassess');
        setQueueFilter(null);
        return;
      }
      if (metric.whiteboardAction === 'open-reassessment') {
        focusReassessmentOnBoard();
      }
    },
    [display.isDisplayMode, focusReassessmentOnBoard, setQueueFilter],
  );

  const handleOperationalStripMetricSelect = useCallback(
    (metric: { whiteboardAction?: string; routeKey?: string }) => {
      if (!canMutateWhiteboard) return;

      if (metric.whiteboardAction === 'focus-queues') {
        setQueuePanelCollapsed(false);
        setActiveFilter('All');
        setQueueFilter('Triage');
        return;
      }

      if (metric.whiteboardAction === 'open-reassessment') {
        focusReassessmentOnBoard();
        return;
      }

      if (metric.whiteboardAction === 'filter-waiting') {
        setActiveFilter('Waiting');
        setQueueFilter(null);
        return;
      }

      if (metric.whiteboardAction === 'filter-high-risk') {
        setActiveFilter('High Risk');
        setQueueFilter(null);
        return;
      }

      if (metric.whiteboardAction === 'filter-ems') {
        setActiveFilter('EMS');
        setQueueFilter(null);
        return;
      }

      if (metric.whiteboardAction === 'filter-ems-risk') {
        setActiveFilter('EMS');
        setQueueFilter(null);
        return;
      }

      if (metric.whiteboardAction === 'focus-ems-offload') {
        setActiveFilter('EMS');
        setQueueFilter(null);
        setEmsOffloadPanelOpen(true);
        return;
      }

      if (metric.whiteboardAction === 'filter-referral-pending') {
        setActiveFilter('All');
        setQueueFilter('referral');
        return;
      }

      if (metric.whiteboardAction === 'open-referrals-accepted') {
        openReferralWorkflow(undefined, 'accepted');
        return;
      }

      if (metric.whiteboardAction === 'open-referrals-delayed') {
        openReferralWorkflow(undefined, 'delayed');
        return;
      }

      if (metric.whiteboardAction === 'focus-boarding') {
        setActiveFilter('Boarding');
        setQueueFilter(null);
        if (emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyBoarding)) {
          openRoute(CANONICAL_ROUTES.emergencyBoarding);
        }
        return;
      }

      if (metric.whiteboardAction === 'focus-capacity') {
        const route = WHITEBOARD_CHARGE_ROUTES.capacity;
        if (emergencyRole.canAccessRoute(routePermissionPath(route))) {
          openRoute(route);
        }
        return;
      }

      if (metric.whiteboardAction === 'filter-boarding') {
        setActiveFilter('Boarding');
        setQueueFilter(null);
        return;
      }

      if (metric.whiteboardAction === 'filter-assigned') {
        setActiveFilter('Assessment');
        setQueueFilter(null);
        return;
      }

      if (metric.whiteboardAction === 'filter-results') {
        setActiveFilter('Assessment');
        setQueueFilter(null);
      }
    },
    [canMutateWhiteboard, emergencyRole, focusReassessmentOnBoard, openReferralWorkflow, openRoute, setQueueFilter],
  );

  const convertArrival = useCallback((arrival: EMSArrival) => {
    if (!canConvertEmsArrival || arrival.patientId) return;
    const result = convertEmsArrivalForReception(arrival.id, {
      actorName: emergencyRole.roleLabel,
    });
    if (!result.ok) return;
    if (prefersReceptionForPatientCreate(emergencyRole.role)) {
      profileNavigate(
        result.receptionVerifyPath ||
          getReceptionEmbeddedIntakePath({
            step: 'verify',
            patientId: result.patientId,
            emsArrivalId: arrival.id,
          }),
      );
      return;
    }
    setToast(`${arrival.unitId} added — complete EMS registration at reception`);
    window.setTimeout(() => setToast(''), 3200);
    setActiveFilter('EMS');
    whiteboard.refresh();
  }, [
    canConvertEmsArrival,
    emergencyRole.role,
    emergencyRole.roleLabel,
    profileNavigate,
    whiteboard.refresh,
  ]);

  const closeIntake = useCallback(() => setShowIntake(false), []);

  const awarenessChipStyle = {
    border: '1px solid color-mix(in srgb, var(--status-warning, #F59E0B) 40%, var(--color-border-subtle, #1F2937))',
    borderRadius: 999,
    background: 'var(--color-floating-surface, #1E293B)',
    color: '#FDE68A',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 800,
    padding: '6px 12px',
  } as const;

  const handlePatientAdded = useCallback(
    (patient: Patient) => {
      const handoff = completeIntakeHandoff(useEmergencyStore.getState(), {
        patientId: patient.id,
        source: 'whiteboard-central-intake',
      });
      refreshIntakeHandoffSurfaces(useEmergencyStore.getState());
      setToast(`${patient.firstName} ${patient.lastName} added to triage queue`);
      window.setTimeout(() => setToast(''), 2400);
      setQueueFilter(handoff.queue || 'Triage');
      whiteboard.refresh();
    },
    [whiteboard.refresh, setQueueFilter],
  );

  if (display.isWaitingRoomDisplay && publicWaiting.isKioskMode) {
    return (
      <section
        className="emergency-whiteboard-page emergency-whiteboard-page--public-waiting-kiosk"
        aria-label="Public waiting room display"
        style={{ minHeight: '100%', background: 'var(--color-background, #0B1220)' }}
      >
        <PublicWaitingDisplay
          kioskMode
          snapshot={stablePublicWaitingSnapshot}
          title={display.label}
          refreshIntervalMs={display.refreshIntervalMs}
          refreshStatus={isNormalizedDisplayRefresh ? displayRefreshStatus : null}
          liveClock={clockTick}
          showWaitRange={
            publicWaiting.showWaitRange &&
            (!publicWaitingKpiWidgets || publicWaitingKpiWidgets.includes('wait-range'))
          }
          showCrowdLevel={
            publicWaiting.showCrowdLevel &&
            (!publicWaitingKpiWidgets || publicWaitingKpiWidgets.includes('crowd-level'))
          }
          showTriageWait={
            publicWaiting.showTriageWait &&
            (!publicWaitingKpiWidgets || publicWaitingKpiWidgets.includes('triage-wait'))
          }
          showCareProcessStages={
            publicWaiting.showCareProcessStages &&
            (!publicWaitingKpiWidgets ||
              publicWaitingKpiWidgets.includes('care-process-stages'))
          }
          showPatientGuidance={
            publicWaiting.showPatientGuidance &&
            (!publicWaitingKpiWidgets ||
              publicWaitingKpiWidgets.includes('patient-guidance'))
          }
          showSymptomEscalation={publicWaiting.showSymptomEscalation}
          showEmsCrowdingImpact={
            publicWaiting.showEmsCrowdingImpact &&
            (!publicWaitingKpiWidgets ||
              publicWaitingKpiWidgets.includes('ems-crowding-impact'))
          }
        />
      </section>
    );
  }

  const readOnlyPrivacyLabel = resolveReadOnlyWhiteboardPrivacyLabel(
    emergencySettings.wallDisplayMonitorPrivacy,
  );

  if (display.isReadOnlyWhiteboardDisplay && readOnlyWhiteboard.isKioskMode) {
    return (
      <section
        className="emergency-whiteboard-page emergency-whiteboard-page--read-only-whiteboard-kiosk"
        aria-label="Read-only department operations display"
        style={{ minHeight: '100%', background: 'var(--color-background, #0B1220)' }}
      >
        <DepartmentStatusScreen
          kioskMode
          snapshot={stableReadOnlyDepartmentSnapshot}
          title={display.label}
          refreshIntervalMs={display.refreshIntervalMs}
          refreshStatus={isNormalizedDisplayRefresh ? displayRefreshStatus : null}
          layout="wall"
          liveClock={clockTick}
          privacyLabel={
            emergencySettings.wallDisplayMonitorPrivacy !== 'operational'
              ? readOnlyPrivacyLabel
              : undefined
          }
        />
      </section>
    );
  }

  if (commandCenter.isCommandCenterScreen) {
    return (
      <section
        className="emergency-whiteboard-page emergency-whiteboard-page--command-center"
        aria-label="Command center operational performance"
        style={{ minHeight: '100%', background: 'var(--color-background, #0B1220)' }}
      >
        <CommandCenterThroughputScreen
          performanceMode
          snapshot={stableCommandCenterSnapshot}
          title={presentation.pageTitle}
          refreshIntervalMs={display.refreshIntervalMs}
          refreshStatus={isNormalizedDisplayRefresh ? displayRefreshStatus : null}
          showTriageAwaiting={
            commandCenter.showTriageAwaiting &&
            (commandCenterKpiWidgets?.['triage-awaiting'] ?? true)
          }
          showLongestUntriagedWait={
            commandCenter.showLongestUntriagedWait &&
            (commandCenterKpiWidgets?.['longest-untriaged-wait'] ?? true)
          }
          showTriageApproachingBreach={
            commandCenter.showTriageApproachingBreach &&
            (commandCenterKpiWidgets?.['triage-approaching-breach'] ?? true)
          }
          showTriageBreached={
            commandCenter.showTriageBreached &&
            (commandCenterKpiWidgets?.['triage-breached'] ?? true)
          }
          showRapidReviewFlags={
            commandCenter.showRapidReviewFlags &&
            (commandCenterKpiWidgets?.['rapid-review-flags'] ?? true)
          }
          showProviderAwaiting={
            commandCenter.showProviderAwaiting &&
            (commandCenterKpiWidgets?.['provider-awaiting'] ?? true)
          }
          showLongestProviderWait={
            commandCenter.showLongestProviderWait &&
            (commandCenterKpiWidgets?.['longest-provider-wait'] ?? true)
          }
          showProviderApproachingBreach={
            commandCenter.showProviderApproachingBreach &&
            (commandCenterKpiWidgets?.['provider-approaching-breach'] ?? true)
          }
          showProviderBreached={
            commandCenter.showProviderBreached &&
            (commandCenterKpiWidgets?.['provider-breached'] ?? true)
          }
          showArrivalsByHour={
            commandCenter.showArrivalsByHour &&
            (commandCenterKpiWidgets?.['arrivals-by-hour'] ?? true)
          }
          showWaitingCount={
            commandCenter.showWaitingCount &&
            (commandCenterKpiWidgets?.['waiting-count'] ?? true)
          }
          showLongestWait={
            commandCenter.showLongestWait &&
            (commandCenterKpiWidgets?.['longest-wait'] ?? true)
          }
          showAvgWaitTriage={
            commandCenter.showAvgWaitTriage &&
            (commandCenterKpiWidgets?.['avg-wait-triage'] ?? true)
          }
          showAvgWaitProvider={
            commandCenter.showAvgWaitProvider &&
            (commandCenterKpiWidgets?.['avg-wait-provider'] ?? true)
          }
          showEmsInbound={
            commandCenter.showEmsInbound &&
            (commandCenterKpiWidgets?.['ems-inbound'] ?? true)
          }
          showEmsOffloadDelays={
            commandCenter.showEmsOffloadDelays &&
            (commandCenterKpiWidgets?.['ems-offload-delays'] ?? true)
          }
          showOffloadDuration={
            commandCenter.showOffloadDuration &&
            (commandCenterKpiWidgets?.['offload-duration'] ?? true)
          }
          showHandoffPending={
            commandCenter.showHandoffPending &&
            (commandCenterKpiWidgets?.['handoff-pending'] ?? true)
          }
          showBoardingDuration={
            commandCenter.showBoardingDuration &&
            (commandCenterKpiWidgets?.['boarding-duration'] ?? true)
          }
          showReferralsBacklog={
            commandCenter.showReferralsBacklog &&
            (commandCenterKpiWidgets?.['referrals-backlog'] ?? true)
          }
          showCapacityScore={
            commandCenter.showCapacityScore &&
            (commandCenterKpiWidgets?.['capacity-score'] ?? true)
          }
          showCrowdLevel={
            commandCenter.showCrowdLevel &&
            (commandCenterKpiWidgets?.['crowd-level'] ?? true)
          }
          showTrendIndicators={
            commandCenter.showTrendIndicators &&
            (commandCenterKpiWidgets?.['trend-indicators'] ?? true)
          }
          showLwbsRisk={
            commandCenter.showLwbsRisk &&
            (commandCenterKpiWidgets?.['lwbs-risk'] ?? true)
          }
          showCrowdingForecast={
            commandCenter.showCrowdingForecast &&
            (commandCenterKpiWidgets?.['crowding-forecast'] ?? true)
          }
          showSystemHealth={
            commandCenter.showSystemHealth &&
            (commandCenterKpiWidgets?.['system-health'] ?? true)
          }
        />
      </section>
    );
  }

  return (
    <section
      className={[
        'emergency-whiteboard-page',
        prioritizeAwareness ? 'emergency-whiteboard-page--awareness' : '',
        whiteboardDensity.surfaces.departmentStatusScreen.visible
          ? 'emergency-whiteboard-page--department-wall'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ minHeight: '100%', background: 'var(--color-background, #0B1220)' }}
    >
      {whiteboardDensity.surfaces.departmentStatusScreen.visible ? (
        <DepartmentStatusScreen
          snapshot={stableReadOnlyDepartmentSnapshot}
          title={display.label}
          refreshIntervalMs={display.refreshIntervalMs}
          refreshStatus={isNormalizedDisplayRefresh ? displayRefreshStatus : null}
          layout="wall"
          liveClock={clockTick}
          privacyLabel={
            emergencySettings.wallDisplayMonitorPrivacy !== 'operational'
              ? resolveReadOnlyWhiteboardPrivacyLabel(emergencySettings.wallDisplayMonitorPrivacy)
              : undefined
          }
        />
      ) : null}
      {!whiteboardDensity.surfaces.departmentStatusScreen.visible ? (
      <>
      <div
        className="emergency-whiteboard-page__hero"
        style={{
          display: 'grid',
          gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
          background: 'var(--color-card, #172033)',
          boxShadow: 'none',
        }}
      >
        <div>
          <span
            style={{
              color: 'var(--status-info, #93C5FD)',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {presentation.pageEyebrow}
          </span>
          <h1 style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 24, lineHeight: 1.08, margin: '3px 0 0' }}>
            {presentation.pageTitle}
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #CBD5E1)', margin: '4px 0 0', maxWidth: 920, fontSize: 13 }}>
            {presentation.pageSubtitle}
          </p>
        </div>
        {whiteboardDensity.surfaces.heroDetail.visible ? (
        <div
          className="emergency-whiteboard-page__status"
          aria-label="CareDroid command center status"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {(
            prioritizeAwareness
              ? [
                  `${stats.waiting} waiting`,
                  `${emsAwareness.inboundCount || activeEmsArrivals.length} ambulances`,
                  `${reassessmentAttentionCount} reassess due`,
                  `${referralAwareness.buckets.pending} referrals pending`,
                  `${capacity.score} ${capacity.band} capacity`,
                ]
              : [
                  `${centralControl.label} managed`,
                  `${centralControl.inputProfile.label} input`,
                  `${capacity.score} ${capacity.band} capacity`,
                  `Updated ${formatFreshness(capacity.updatedAt || whiteboardGeneratedAt)}`,
                  `${stats.total} active ED records`,
                  `${emsArrivals.length + emsIncomingPatients.length} EMS signals`,
                  `${breachedQueueCount} queue breaches`,
                  `${centralSnapshot.boardingStatus.risk} boarding risk`,
                  `${centralSnapshot.currentDepartmentStatus.activeAlerts} active alerts`,
                  `${wearableAlertCount} IoMT review alerts`,
                  `${virtualVisitCandidateCount} VVT candidates`,
                  EMERGENCY_OS_BRANDING.safetyShort,
                ]
          ).map((item) => (
            <span
              key={item}
              style={{
                border: '1px solid var(--color-border-subtle, #1F2937)',
                borderRadius: 999,
                background: 'var(--color-floating-surface, #1E293B)',
                color: 'var(--color-text-primary, #E5E7EB)',
                fontSize: 12,
                fontWeight: 750,
                padding: '6px 10px',
              }}
            >
              {item}
            </span>
          ))}
        </div>
        ) : null}
        <p style={{ color: 'var(--color-text-muted, #9CA3AF)', margin: 0, fontSize: 12 }}>
          {prioritizeAwareness
            ? showShiftHandoffStrip
              ? 'Operational awareness mode — Patient, EMS, Referral, and Admission summaries are in the handoff bar above. Click any metric to filter.'
              : 'Operational awareness mode — attention signals first. Use filters to drill into waiting, reassess, EMS, or referral queues.'
            : `${EMERGENCY_OS_BRANDING.roleFlowSummary} Inputs flow into ${centralControl.inputProfile.escalationPath.replace(/-/g, ' ')} and remain subject to central policy.`}
        </p>
      </div>
      <CapacityCrisisMode
        capacity={capacity}
        patients={patients}
        rooms={rooms}
        referrals={referrals}
        emsArrivals={emsArrivals}
        emsIncomingPatients={emsIncomingPatients}
        readOnly={display.isDisplayMode}
      />
      {showShiftHandoffStrip ? (
        <OperationalHandoffDomainBar
          domains={operationalHandoffDomains}
          onMetricSelect={handleOperationalStripMetricSelect}
          readOnly={display.isDisplayMode}
        />
      ) : null}
      {whiteboardDensity.surfaces.opsDetail.visible &&
      !(physician.isPhysicianScreen && physician.hideOpsDetail) ? (
        <WhiteboardOpsDetailStrip defaultExpanded={whiteboardDensity.surfaces.opsDetail.defaultExpanded} />
      ) : null}
      {display.isDisplayMode ? (
        <section
          aria-label="Whiteboard display mode"
          role="status"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
            background: 'color-mix(in srgb, var(--status-info, #2563EB) 14%, var(--color-surface, #111827))',
          }}
        >
          <div style={{ display: 'grid', gap: 2 }}>
            <strong style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 13 }}>
              {display.isWaitingRoomDisplay
                ? `${display.label} · public information only`
                : display.isReadOnlyWhiteboardDisplay
                  ? `${display.label} · hallway operations`
                  : `${display.label} · operational awareness only`}
            </strong>
            <span style={{ color: 'var(--color-text-muted, #9CA3AF)', fontSize: 12 }}>
              {display.isWaitingRoomDisplay
                ? `Patient waiting-area display · auto-refresh every ${Math.round(display.refreshIntervalMs / 1000)}s · no names or clinical details`
                : display.isReadOnlyWhiteboardDisplay
                  ? `Read-only operations wall · auto-refresh every ${Math.round(display.refreshIntervalMs / 1000)}s · ${resolveReadOnlyWhiteboardPrivacyLabel(emergencySettings.wallDisplayMonitorPrivacy)}`
                  : `Read-only wall display · auto-refresh every ${Math.round(display.refreshIntervalMs / 1000)}s · no editing actions`}
            </span>
          </div>
          <span style={{ color: 'var(--color-text-secondary, #CBD5E1)', fontSize: 12, fontWeight: 750 }}>
            Updated {formatFreshness(capacity.updatedAt || whiteboardGeneratedAt)}
          </span>
        </section>
      ) : null}
      {whiteboardDensity.surfaces.publicWaitingScreen.visible ? (
        <PublicWaitingDisplay
          snapshot={stablePublicWaitingSnapshot}
          title={display.label}
          refreshIntervalMs={display.refreshIntervalMs}
          refreshStatus={isNormalizedDisplayRefresh ? displayRefreshStatus : null}
          showWaitRange={
            publicWaiting.showWaitRange &&
            (!publicWaitingKpiWidgets || publicWaitingKpiWidgets.includes('wait-range'))
          }
          showCrowdLevel={
            publicWaiting.showCrowdLevel &&
            (!publicWaitingKpiWidgets || publicWaitingKpiWidgets.includes('crowd-level'))
          }
          showTriageWait={
            publicWaiting.showTriageWait &&
            (!publicWaitingKpiWidgets || publicWaitingKpiWidgets.includes('triage-wait'))
          }
          showCareProcessStages={
            publicWaiting.showCareProcessStages &&
            (!publicWaitingKpiWidgets ||
              publicWaitingKpiWidgets.includes('care-process-stages'))
          }
          showPatientGuidance={
            publicWaiting.showPatientGuidance &&
            (!publicWaitingKpiWidgets ||
              publicWaitingKpiWidgets.includes('patient-guidance'))
          }
          showSymptomEscalation={publicWaiting.showSymptomEscalation}
          showEmsCrowdingImpact={
            publicWaiting.showEmsCrowdingImpact &&
            (!publicWaitingKpiWidgets ||
              publicWaitingKpiWidgets.includes('ems-crowding-impact'))
          }
        />
      ) : null}
      {whiteboardDensity.surfaces.commandCenterThroughput.visible ? (
        <CommandCenterThroughputScreen
          snapshot={stableCommandCenterSnapshot}
          title="Command center throughput"
          refreshIntervalMs={display.refreshIntervalMs}
          refreshStatus={isNormalizedDisplayRefresh ? displayRefreshStatus : null}
          showTriageAwaiting={
            commandCenter.showTriageAwaiting &&
            (commandCenterKpiWidgets?.['triage-awaiting'] ?? true)
          }
          showLongestUntriagedWait={
            commandCenter.showLongestUntriagedWait &&
            (commandCenterKpiWidgets?.['longest-untriaged-wait'] ?? true)
          }
          showTriageApproachingBreach={
            commandCenter.showTriageApproachingBreach &&
            (commandCenterKpiWidgets?.['triage-approaching-breach'] ?? true)
          }
          showTriageBreached={
            commandCenter.showTriageBreached &&
            (commandCenterKpiWidgets?.['triage-breached'] ?? true)
          }
          showRapidReviewFlags={
            commandCenter.showRapidReviewFlags &&
            (commandCenterKpiWidgets?.['rapid-review-flags'] ?? true)
          }
          showProviderAwaiting={
            commandCenter.showProviderAwaiting &&
            (commandCenterKpiWidgets?.['provider-awaiting'] ?? true)
          }
          showLongestProviderWait={
            commandCenter.showLongestProviderWait &&
            (commandCenterKpiWidgets?.['longest-provider-wait'] ?? true)
          }
          showProviderApproachingBreach={
            commandCenter.showProviderApproachingBreach &&
            (commandCenterKpiWidgets?.['provider-approaching-breach'] ?? true)
          }
          showProviderBreached={
            commandCenter.showProviderBreached &&
            (commandCenterKpiWidgets?.['provider-breached'] ?? true)
          }
          showArrivalsByHour={
            commandCenter.showArrivalsByHour &&
            (commandCenterKpiWidgets?.['arrivals-by-hour'] ?? true)
          }
          showWaitingRoomOccupancy={
            commandCenter.showWaitingRoomOccupancy &&
            (commandCenterKpiWidgets?.['waiting-room-occupancy'] ?? true)
          }
          showAvgWaitTriage={
            commandCenter.showAvgWaitTriage &&
            (commandCenterKpiWidgets?.['avg-wait-triage'] ?? true)
          }
          showAvgWaitProvider={
            commandCenter.showAvgWaitProvider &&
            (commandCenterKpiWidgets?.['avg-wait-provider'] ?? true)
          }
          showEmsInbound={
            commandCenter.showEmsInbound &&
            (commandCenterKpiWidgets?.['ems-inbound'] ?? true)
          }
          showEmsOffloadDelays={
            commandCenter.showEmsOffloadDelays &&
            (commandCenterKpiWidgets?.['ems-offload-delays'] ?? true)
          }
          showOffloadDuration={
            commandCenter.showOffloadDuration &&
            (commandCenterKpiWidgets?.['offload-duration'] ?? true)
          }
          showHandoffPending={
            commandCenter.showHandoffPending &&
            (commandCenterKpiWidgets?.['handoff-pending'] ?? true)
          }
          showBoardingDuration={
            commandCenter.showBoardingDuration &&
            (commandCenterKpiWidgets?.['boarding-duration'] ?? true)
          }
          showReferralsBacklog={
            commandCenter.showReferralsBacklog &&
            (commandCenterKpiWidgets?.['referrals-backlog'] ?? true)
          }
          showLwbsRisk={
            commandCenter.showLwbsRisk &&
            (commandCenterKpiWidgets?.['lwbs-risk'] ?? true)
          }
          showCrowdingForecast={
            commandCenter.showCrowdingForecast &&
            (commandCenterKpiWidgets?.['crowding-forecast'] ?? true)
          }
          showSystemHealth={
            commandCenter.showSystemHealth &&
            (commandCenterKpiWidgets?.['system-health'] ?? true)
          }
        />
      ) : null}
      {whiteboardDensity.surfaces.commandLayer.visible &&
      !(physician.isPhysicianScreen && physician.hideCommandLayer) &&
      !commandCenter.hideCommandLayer ? (
      <section
        aria-label="Operational command layer metrics"
        style={{
          display: 'grid',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
          background: 'var(--color-surface, #111827)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <strong style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 13 }}>
            Operational command layer
          </strong>
          <span style={{ color: 'var(--color-text-muted, #9CA3AF)', fontSize: 12, fontWeight: 750 }}>
            {centralSnapshot.sync.source === 'backend-snapshot' ? 'Backend snapshot' : 'Local store'} -{' '}
            {formatFreshness(centralSnapshot.sync.lastSyncedAt || centralSnapshot.generatedAt)}
            {intelligenceSnapshot.badges.length
              ? ` · ${intelligenceSnapshot.badges.map((badge) => badge.label).join(' · ')}`
              : ''}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
          }}
        >
          {commandLayerMetrics.map((metric) => {
            const canOpen = canOpenOperationalMetricOnWhiteboard(metric.key, {
              displayMode: display.isDisplayMode,
              canAccessRoute: (path) => emergencyRole.canAccessRoute(path),
            });
            const toneColor =
              metric.tone === 'critical'
                ? 'var(--status-critical, #EF4444)'
                : metric.tone === 'warning'
                  ? 'var(--status-warning, #F59E0B)'
                  : metric.tone === 'success'
                    ? 'var(--status-stable, #10B981)'
                    : 'var(--status-info, #60A5FA)';

            return display.isDisplayMode ? (
              <div
                key={metric.key}
                title={`${metric.label}: ${metric.value}. Source: ${metric.source}.`}
                style={{
                  border: '1px solid var(--color-border-subtle, #1F2937)',
                  borderRadius: 12,
                  background: 'var(--color-card, #172033)',
                  color: 'var(--color-text-primary, #F9FAFB)',
                  display: 'grid',
                  gap: 4,
                  minHeight: 68,
                  padding: 12,
                  textAlign: 'left',
                }}
              >
                <strong style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 22 }}>
                  {metric.value}
                </strong>
                <span style={{ color: toneColor, fontSize: 12, fontWeight: 850 }}>
                  {metric.label}
                </span>
              </div>
            ) : (
              <button
                key={metric.key}
                type="button"
                onClick={() => handleOperationalMetricClick(metric.key)}
                disabled={!canOpen}
                title={`${metric.label}: ${metric.value}. Source: ${metric.source}. ${centralSnapshot.sync.message}`}
                style={{
                  border: '1px solid var(--color-border-subtle, #1F2937)',
                  borderRadius: 12,
                  background: 'var(--color-card, #172033)',
                  color: canOpen ? 'var(--color-text-primary, #F9FAFB)' : 'var(--color-text-muted, #9CA3AF)',
                  cursor: canOpen ? 'pointer' : 'not-allowed',
                  display: 'grid',
                  gap: 4,
                  minHeight: 68,
                  opacity: canOpen ? 1 : 0.58,
                  padding: 12,
                  textAlign: 'left',
                }}
              >
                <strong style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 22 }}>
                  {metric.value}
                </strong>
                <span style={{ color: toneColor, fontSize: 12, fontWeight: 850 }}>
                  {metric.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      ) : null}
      {whiteboardDensity.surfaces.primaryStats.visible ? (
      <div
        className="emergency-whiteboard-page__stats"
        style={{
          background: 'var(--color-surface, #111827)',
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
          display: 'flex',
          alignItems: 'stretch',
          overflowX: 'auto',
        }}
      >
        <StatCard value={stats.waiting} label="Waiting" emphasized={prioritizeAwareness && stats.waiting > 0} />
        {whiteboardDensity.surfaces.secondaryStats.visible ? (
          <>
        <StatCard value={stats.total} label="Total" />
        <StatCard value={stats.highRisk} label="High Risk" tone={stats.highRisk ? 'critical' : 'success'} />
          </>
        ) : null}
        <StatCard value={`${capacity.score} ${capacity.band}`} label="Capacity" tone={capacityTone(capacity.band)} />
        <StatCard
          value={stats.reassessmentDue}
          label="Reassess Due"
          tone={stats.reassessmentDue ? 'warning' : 'success'}
          emphasized={Boolean(stats.reassessmentDue) && !display.isDisplayMode}
          title={
            stats.reassessmentDue
              ? 'Open reassessment drawer and filter board to flagged patients'
              : 'No reassessment patients are due'
          }
          onClick={display.isDisplayMode || !stats.reassessmentDue ? undefined : () => focusReassessmentOnBoard()}
        />
        <StatCard
          value={emsAwareness.soonestEtaLabel || emsAwareness.inboundCount || '—'}
          label="EMS ETA"
          tone={
            emsAwareness.soonestEtaMinutes !== null && emsAwareness.soonestEtaMinutes <= 10
              ? 'critical'
              : emsAwareness.inboundCount
                ? 'info'
                : 'success'
          }
          emphasized={Boolean(emsAwareness.inboundCount) && !display.isDisplayMode}
          title={
            emsAwareness.inboundCount
              ? `${emsAwareness.inboundCount} inbound unit${emsAwareness.inboundCount === 1 ? '' : 's'}${emsAwareness.soonestEtaLabel ? ` · soonest ${emsAwareness.soonestEtaLabel}` : ''}`
              : 'No inbound EMS units'
          }
          onClick={
            display.isDisplayMode || !emsAwareness.inboundCount
              ? undefined
              : () => {
                  setActiveFilter('EMS');
                  setQueueFilter(null);
                }
          }
        />
        {whiteboardDensity.surfaces.secondaryStats.visible ? (
        <StatCard
          value={emsAwareness.riskCount}
          label="EMS Risk"
          tone={emsAwareness.riskCount ? 'critical' : 'success'}
          emphasized={Boolean(emsAwareness.riskCount) && !display.isDisplayMode}
          title="Critical/high severity or P1/P2 inbound EMS"
          onClick={
            display.isDisplayMode || !emsAwareness.riskCount
              ? undefined
              : () => {
                  setActiveFilter('EMS');
                  setQueueFilter(null);
                }
          }
        />
        ) : null}
        {whiteboardDensity.surfaces.secondaryStats.visible ? (
        <StatCard
          value={
            emsAwareness.awaitingHandoff
              ? `${emsAwareness.offloadMinutes}m`
              : emsAwareness.offloadMinutes || 0
          }
          label="EMS Offload"
          tone={
            emsAwareness.offloadMinutes >= 15
              ? 'critical'
              : emsAwareness.awaitingHandoff
                ? 'warning'
                : 'success'
          }
          emphasized={Boolean(emsAwareness.awaitingHandoff) && !display.isDisplayMode}
          title={`${emsAwareness.awaitingHandoff} unit${emsAwareness.awaitingHandoff === 1 ? '' : 's'} awaiting handoff`}
          onClick={
            display.isDisplayMode || !emsAwareness.awaitingHandoff
              ? undefined
              : () => {
                  setActiveFilter('EMS');
                  setQueueFilter(null);
                  if (emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms)) {
                    openRoute(CANONICAL_ROUTES.emergencyEms);
                  }
                }
          }
        />
        ) : null}
        {whiteboardDensity.surfaces.secondaryStats.visible ? (
        <StatCard value={stats.boarding} label="Boarding" tone={stats.boarding ? 'warning' : 'success'} />
        ) : null}
        <StatCard
          value={referralAwareness.buckets.pending}
          label="Referrals Pending"
          tone={referralAwareness.buckets.pending ? 'warning' : 'success'}
          emphasized={Boolean(referralAwareness.buckets.pending) && !display.isDisplayMode}
          title="Referrals awaiting specialty response"
          onClick={
            display.isDisplayMode || !referralAwareness.buckets.pending
              ? undefined
              : () => {
                  setActiveFilter('All');
                  setQueueFilter('referral');
                }
          }
        />
        {whiteboardDensity.surfaces.secondaryStats.visible ? (
        <>
        <StatCard
          value={referralAwareness.buckets.accepted}
          label="Referrals Accepted"
          tone={referralAwareness.buckets.accepted ? 'success' : 'default'}
          title="Referrals accepted in workflow"
          onClick={
            display.isDisplayMode || !referralAwareness.buckets.accepted
              ? undefined
              : () => openReferralWorkflow(undefined, 'accepted')
          }
        />
        <StatCard
          value={referralAwareness.buckets.delayed}
          label="Referrals Delayed"
          tone={referralAwareness.buckets.delayed ? 'critical' : 'success'}
          emphasized={Boolean(referralAwareness.buckets.delayed) && !display.isDisplayMode}
          title="Referrals flagged delayed"
          onClick={
            display.isDisplayMode || !referralAwareness.buckets.delayed
              ? undefined
              : () => openReferralWorkflow(undefined, 'delayed')
          }
        />
        <StatCard
          value={formatFreshness(capacity.updatedAt || whiteboardGeneratedAt)}
          label="Data Freshness"
          tone="info"
          title="Last CareDroid capacity or whiteboard update"
        />
        </>
        ) : null}
      </div>
      ) : null}

      {whiteboardDensity.surfaces.emsAttention.visible ? (
        <EmsAttentionStrip
          emsArrivals={emsArrivals}
          patients={patients}
          staff={staff}
          rooms={rooms}
          offloadTargetMinutes={
            Number(emergencySettings?.thresholds?.emsOffloadTargetMinutes ?? 15) || 15
          }
          now={clockTick}
          onMetricSelect={handleEmsAttentionSelect}
          readOnly={display.isDisplayMode}
        />
      ) : null}

      {!display.isDisplayMode &&
      !(physician.isPhysicianScreen && physician.hideEmsOperations) &&
      (!charge.isChargeNurseScreen || charge.showEmsOffloadAggregate) ? (
        <EmsOffloadAggregateStrip
          emsArrivals={emsArrivals}
          patients={patients}
          staff={staff}
          rooms={rooms}
          offloadTargetMinutes={
            Number(emergencySettings?.thresholds?.emsOffloadTargetMinutes ?? 15) || 15
          }
          onOpenTracker={() => setEmsOffloadPanelOpen(true)}
        />
      ) : null}

      {emsAwareness.offloadRows?.length &&
      !display.isDisplayMode &&
      !(physician.isPhysicianScreen && physician.hideEmsOperations) &&
      (!charge.isChargeNurseScreen || charge.showOffloadDelays) ? (
        <EmsOffloadAttentionStrip
          emsArrivals={emsArrivals}
          patients={patients}
          staff={staff}
          rooms={rooms}
          offloadTargetMinutes={
            Number(emergencySettings?.thresholds?.emsOffloadTargetMinutes ?? 15) || 15
          }
          onSelectPatient={(patientId) => {
            selectPatient(patientId);
            setActiveFilter('EMS');
            setQueueFilter(null);
          }}
          onSelectArrival={() => {
            setActiveFilter('EMS');
            setQueueFilter(null);
            setEmsOffloadPanelOpen(true);
          }}
          onOpenTracker={() => setEmsOffloadPanelOpen(true)}
        />
      ) : null}

      {emsAwareness.offloadRows?.length &&
      !display.isDisplayMode &&
      !(physician.isPhysicianScreen && physician.hideEmsOperations) &&
      (!charge.isChargeNurseScreen || charge.showOffloadDelays) &&
      (emsOffloadPanelOpen || (emsAwareness.delayedOffloadCount ?? 0) > 0) ? (
        <div style={{ padding: '0 16px 12px' }}>
          <EmsOffloadTrackerPanel
            emsArrivals={emsArrivals}
            patients={patients}
            staff={staff}
            rooms={rooms}
            compact
            onSelectPatient={(patientId) => {
              selectPatient(patientId);
              setActiveFilter('EMS');
            }}
          />
        </div>
      ) : null}

      {whiteboardDensity.surfaces.emsInboundBanner.visible ? (
        <section
          aria-label="Inbound EMS operational awareness"
          style={{
            display: 'grid',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
            background: 'color-mix(in srgb, var(--color-secondary, #38BDF8) 8%, var(--color-surface, #111827))',
          }}
        >
          <strong style={{ color: '#BAE6FD', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Inbound EMS · operational awareness
          </strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {emsAwareness.inboundArrivals.slice(0, 3).map((arrival) => {
              const remaining = minutesRemaining(arrival);
              const offloadMinutes = getArrivalOffloadMinutes(arrival, clockTick);
              return (
                <button
                  key={arrival.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter('EMS');
                    setQueueFilter(null);
                  }}
                  style={{
                    border: '1px solid color-mix(in srgb, var(--color-secondary, #38BDF8) 34%, var(--color-border-default, #1F2937))',
                    borderRadius: 12,
                    background: 'var(--color-card, #172033)',
                    boxShadow: 'inset 3px 0 0 var(--color-secondary, #38BDF8)',
                    color: '#E0F2FE',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 4,
                    padding: 10,
                    textAlign: 'left',
                  }}
                >
                  <strong>{arrival.unitId} · {formatEmsEta(remaining, arrival.status)}</strong>
                  <span style={{ color: '#93C5FD', fontSize: 12 }}>
                    Risk {arrival.severity}
                    {offloadMinutes !== null ? ` · Offload ${offloadMinutes}m` : ''}
                  </span>
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>
                    {arrival.chiefComplaint || arrival.prearrivalComplaint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {whiteboardDensity.surfaces.referralAttention.visible ? (
        <ReferralAttentionStrip
          referrals={referrals}
          onMetricSelect={handleReferralAttentionSelect}
          readOnly={display.isDisplayMode}
        />
      ) : null}

      {whiteboardDensity.surfaces.reassessAttention.visible ? (
        <ReassessmentAttentionStrip
          patients={patients}
          onMetricSelect={handleReassessmentAttentionSelect}
          readOnly={display.isDisplayMode}
        />
      ) : null}

      {whiteboardDensity.surfaces.chargeNurseStrip.visible ? (
        <ChargeNurseOperationalStrip
          patients={patients}
          centralSnapshot={centralSnapshot}
          activeEmsArrivals={activeEmsArrivals.length}
          referrals={referrals}
          emsArrivals={emsArrivals}
          capacity={capacity}
          settings={emergencySettings}
          workflowLogs={workflowLogs}
          alerts={alerts}
          kpiMetricIds={chargeNurseKpiMetricIds}
          visibleSurfaces={
            chargeNurseKpiMetricIds ? null : charge.isChargeNurseScreen ? charge.visibleOperationalSurfaces : null
          }
          onMetricSelect={handleOperationalStripMetricSelect}
          readOnly={display.isDisplayMode}
        />
      ) : null}

      {showPhysicianStrip ? (
        <PhysicianOperationalStrip
          patients={patients}
          referrals={referrals}
          physicianStaffId={physicianStaffId}
          settings={emergencySettings}
          visibleSurfaces={physician.isPhysicianScreen ? physician.visibleOperationalSurfaces : null}
          onMetricSelect={handleOperationalStripMetricSelect}
          readOnly={display.isDisplayMode}
        />
      ) : null}

      {physician.isPhysicianScreen && physician.showProviderWaitBreaches ? (
        <ProviderWaitBreachStrip
          patients={patients}
          settings={emergencySettings}
          onSelectPatient={handleWaitingRoomSafetySelect}
          className="emergency-whiteboard-page__provider-wait-breach"
        />
      ) : null}

      {whiteboardDensity.surfaces.waitingRoomSafety.visible ? (
        <>
          {!display.isDisplayMode && !(physician.isPhysicianScreen && physician.hideWaitingRoomReceptionStrips) ? (
            <>
              <PatientExperienceStatusStrip
                patients={patients}
                referrals={referrals}
                onSelectPatient={handleWaitingRoomSafetySelect}
              />
              <WhatHappensNextStrip patients={patients} referrals={referrals} staff={staff} />
              <LwbsRiskStrip
                patients={patients}
                workflowLogs={workflowLogs}
                staff={staff}
                onSelectPatient={handleWaitingRoomSafetySelect}
              />
              <HighRiskComplaintAttentionStrip
                patients={patients}
                onSelectPatient={handleWaitingRoomSafetySelect}
              />
              <FitToWaitAttentionStrip
                patients={patients}
                onSelectPatient={handleWaitingRoomSafetySelect}
              />
              <QueueReasonAttentionStrip
                patients={patients}
                referrals={referrals}
                staff={staff}
                onSelectPatient={handleWaitingRoomSafetySelect}
              />
              <DeteriorationWatchStrip
                patients={patients}
                emsArrivals={emsArrivals}
                onSelectPatient={handleWaitingRoomSafetySelect}
              />
              {reception.isReceptionScreen ||
              ((charge.isChargeNurseScreen && !charge.showWaitingRoomSafetyEscalation) ||
                (triage.isTriageScreen && !triage.showWaitingRoomSafetyEscalation)) ? null : (
                <WaitingRoomSafetyEscalationStrip
                  patients={patients}
                  workflowLogs={workflowLogs}
                  staff={staff}
                  alerts={alerts}
                  communicationOverdueMinutes={
                    Number(emergencySettings?.thresholds?.communicationOverdueMinutes ?? 30) || 30
                  }
                  onSelectPatient={handleWaitingRoomSafetySelect}
                />
              )}
              {(charge.isChargeNurseScreen && !charge.showTriageBreach) ||
              (triage.isTriageScreen && !triage.showTriageBreach) ? null : (
              <TriageBreachStrip
                patients={patients}
                settings={emergencySettings}
                onSelectPatient={handleWaitingRoomSafetySelect}
              />
              )}
              {(charge.isChargeNurseScreen && !charge.showProviderWaitBreaches) ? null : (
                <ProviderWaitBreachStrip
                  patients={patients}
                  settings={emergencySettings}
                  onSelectPatient={handleWaitingRoomSafetySelect}
                />
              )}
              <ReceptionEscalationAttentionStrip
                alerts={alerts}
                roleId={emergencyRole.role}
                onSelectPatient={handleWaitingRoomSafetySelect}
              />
            </>
          ) : null}
          {(charge.isChargeNurseScreen && charge.showWidget('communication-status')) ||
          (triage.isTriageScreen && triage.showWidget('communication-status')) ? (
            <PatientCommunicationStatusPanel
              patients={patients}
              workflowLogs={workflowLogs}
              staff={staff}
              referrals={referrals}
              settings={emergencySettings}
              onSelectPatient={handleWaitingRoomSafetySelect}
              className="emergency-whiteboard-page__communication-status"
            />
          ) : null}
          <WaitingRoomSafetyBoard
            patients={patients}
            staff={staff}
            referrals={referrals}
            emsArrivals={emsArrivals}
            workflowLogs={workflowLogs}
            settings={emergencySettings}
            activeQueueFilter={activeQueueFilter}
            displayMode={display.isDisplayMode}
            readOnly={display.isDisplayMode || !canClassifyFitToWait}
            variant={
              charge.isChargeNurseScreen || triage.isTriageScreen ? 'focused' : 'full'
            }
            onSelectPatient={handleWaitingRoomSafetySelect}
            onOpenReassessment={focusReassessmentOnBoard}
            onClassifyFitToWait={handleClassifyFitToWait}
          />
        </>
      ) : null}

      {whiteboardDensity.surfaces.missionControl.visible &&
      !(physician.isPhysicianScreen && physician.hideMissionControlAdmin) &&
      !commandCenter.hideMissionControl ? (
      <section
        className="emergency-whiteboard-page__mission"
        aria-labelledby="whiteboard-mission-control-title"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1.1fr) minmax(260px, 1fr) minmax(240px, 0.9fr)',
          gap: 12,
          padding: 16,
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
          background: 'var(--color-background, #0B1220)',
        }}
      >
        <div
          className="emergency-whiteboard-page__mission-card"
          style={{
            border: '1px solid var(--color-border-subtle, #1F2937)',
            borderRadius: 14,
            background: 'var(--color-card, #172033)',
            padding: 12,
          }}
        >
          <span style={{ color: 'var(--status-info, #93C5FD)', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Mission control
          </span>
          <h2 id="whiteboard-mission-control-title" style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 16, margin: '4px 0 8px' }}>
            Critical actions from the board
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {isRegistrationClerk ? (
              <MissionButton
                label="Open Reception"
                onClick={() => openRoute(CANONICAL_ROUTES.emergencyReception)}
                disabled={!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReception)}
                title="Patient creation originates from the Reception arrival dashboard"
                tone="primary"
              />
            ) : createPatientPresentation.visible ? (
              <MissionButton
                label="Central Intake"
                onClick={openIntake}
                disabled={!canUseCentralIntake}
                title={canUseCentralIntake ? 'Create patient using the existing quick intake modal' : 'Central intake unavailable for this role'}
                tone="primary"
              />
            ) : null}
            <MissionButton
              label="Identity Review"
              onClick={() =>
                openRoute(
                  emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReception)
                    ? `${CANONICAL_ROUTES.emergencyIntake}?from=reception`
                    : CANONICAL_ROUTES.emergencyIntake,
                )
              }
              disabled={!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyIntake)}
              title="Open existing Smart Intake identity workflow"
            />
            <MissionButton
              label={`Reassessment Tasks (${reassessmentAttentionCount})`}
              onClick={() => focusReassessmentOnBoard()}
              disabled={!reassessmentAttentionCount}
              title={reassessmentAttentionCount ? 'Open reassessment drawer and filter board' : 'No reassessment tasks are due'}
              tone={reassessmentAttentionCount ? 'warning' : 'default'}
            />
            {manageReferralPresentation.visible ? (
            <MissionButton
              label="New Referral"
              onClick={() => openReferralWorkflow()}
              disabled={!canMutateWhiteboard || !canManageReferral}
              title={canManageReferral ? 'Open existing referral form' : 'Referral workflow unavailable for this role'}
            />
            ) : null}
          </div>
        </div>

        <div
          className="emergency-whiteboard-page__mission-card"
          style={{
            border: '1px solid var(--color-border-subtle, #1F2937)',
            borderRadius: 14,
            background: 'var(--color-card, #172033)',
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 13 }}>EMS arrivals</strong>
            <button
              type="button"
              disabled={!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms)}
              onClick={() => openRoute(CANONICAL_ROUTES.emergencyEms)}
              title={
                emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms)
                  ? 'Open EMS arrivals'
                  : 'EMS is restricted for this role'
              }
              style={{
                border: 0,
                background: 'transparent',
                color: emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms)
                  ? 'var(--status-info, #93C5FD)'
                  : 'var(--color-text-muted, #94A3B8)',
                cursor: emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms) ? 'pointer' : 'not-allowed',
                fontWeight: 850,
              }}
            >
              Open EMS
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {activeEmsArrivals.length ? activeEmsArrivals.slice(0, 3).map((arrival) => {
              const isIncoming = arrival.status === 'Inbound' && minutesRemaining(arrival) > 0;
              const canConvertNow = !isIncoming && !arrival.patientId;
              return (
                <article
                  className="emergency-whiteboard-page__arrival-card"
                  key={arrival.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    border: '1px solid color-mix(in srgb, var(--status-info, #38BDF8) 32%, var(--color-border-default, #1F2937))',
                    borderRadius: 12,
                    background: 'var(--color-surface, #111827)',
                    boxShadow: 'inset 3px 0 0 var(--status-info, #38BDF8)',
                    padding: 10,
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--color-text-primary, #E0F2FE)', fontSize: 13 }}>{arrival.unitId} · {formatEta(arrival)}</strong>
                    <p style={{ color: 'var(--color-text-muted, #9CA3AF)', fontSize: 12, margin: '3px 0 0' }}>
                      {arrival.chiefComplaint} · {arrival.severity}
                    </p>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {(prepareBayPresentation.visible || convertEmsPresentation.visible) ? (
                      <>
                        {prepareBayPresentation.visible ? (
                        <button
                          type="button"
                          onClick={() => prepareEMSBay(arrival.id)}
                          disabled={!isIncoming || !canPrepareBay || Boolean(arrival.preparedRoomId)}
                          title={arrival.preparedRoomId ? 'Bay already prepared' : 'Prepare a bay for this inbound EMS unit'}
                          style={{ border: '1px solid color-mix(in srgb, var(--status-info, #38BDF8) 40%, var(--color-border-default, #1F2937))', borderRadius: 8, background: 'var(--color-floating-surface, #1E293B)', color: '#BAE6FD', cursor: isIncoming && canPrepareBay && !arrival.preparedRoomId ? 'pointer' : 'not-allowed', opacity: isIncoming && canPrepareBay && !arrival.preparedRoomId ? 1 : 0.55, fontWeight: 800, padding: '5px 7px' }}
                        >
                          {arrival.preparedRoomId ? 'Bay Ready' : 'Prepare Bay'}
                        </button>
                        ) : null}
                        {convertEmsPresentation.visible ? (
                        <button
                          type="button"
                          onClick={() => convertArrival(arrival)}
                          disabled={!canConvertNow || !canConvertEmsArrival}
                          title={canConvertNow ? 'Convert arrived EMS unit to a whiteboard patient' : 'Conversion is available after arrival'}
                          style={{ border: '1px solid color-mix(in srgb, var(--status-stable, #10B981) 40%, var(--color-border-default, #1F2937))', borderRadius: 8, background: 'color-mix(in srgb, var(--status-stable, #10B981) 12%, var(--color-card, #172033))', color: '#A7F3D0', cursor: canConvertNow && canConvertEmsArrival ? 'pointer' : 'not-allowed', opacity: canConvertNow && canConvertEmsArrival ? 1 : 0.55, fontWeight: 800, padding: '5px 7px' }}
                        >
                          Add to Board
                        </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </article>
              );
            }) : (
              <p style={{ color: 'var(--color-text-muted, #9CA3AF)', margin: 0, fontSize: 13 }}>No active EMS arrivals. Use EMS Intake for the full pipeline.</p>
            )}
          </div>
        </div>

        <div
          className="emergency-whiteboard-page__mission-card"
          style={{
            border: '1px solid var(--color-border-subtle, #1F2937)',
            borderRadius: 14,
            background: 'var(--color-card, #172033)',
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 13 }}>Immediate tasks</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Pending', value: referralAwareness.buckets.pending, tone: '#FDE68A' },
                { label: 'Accepted', value: referralAwareness.buckets.accepted, tone: '#A7F3D0' },
                { label: 'Delayed', value: referralAwareness.buckets.delayed, tone: '#FCA5A5' },
              ].map((item) => (
                <span
                  key={item.label}
                  style={{
                    border: '1px solid var(--color-border-subtle, #1F2937)',
                    borderRadius: 999,
                    background: 'var(--color-floating-surface, #1E293B)',
                    color: item.tone,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '4px 8px',
                  }}
                >
                  {item.label} {item.value}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {[...referralAwareness.grouped.delayed, ...referralAwareness.grouped.pending, ...referralAwareness.grouped.accepted]
              .slice(0, 3)
              .map((referral) => {
                const patient = patients.find((entry) => entry.id === referral.patientId);
                const bucket =
                  referral.status === 'Delayed'
                    ? 'Delayed'
                    : referral.status === 'Accepted'
                      ? 'Accepted'
                      : 'Pending';
                return (
                  <button
                    key={referral.id}
                    type="button"
                    onClick={() => openReferralWorkflow(referral.patientId, bucket.toLowerCase())}
                    style={{
                      border: '1px solid color-mix(in srgb, var(--color-accent, #A78BFA) 34%, var(--color-border-default, #1F2937))',
                      borderRadius: 12,
                      background: 'color-mix(in srgb, var(--color-accent, #A78BFA) 12%, var(--color-card, #172033))',
                      boxShadow: 'inset 3px 0 0 var(--color-accent, #A78BFA)',
                      color: '#EDE9FE',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 2,
                      padding: 10,
                      textAlign: 'left',
                    }}
                  >
                    <strong>{patient ? patientName(patient) : referral.patientId} · {bucket}</strong>
                    <span style={{ color: 'var(--color-text-secondary, #D1D5DB)', fontSize: 12 }}>
                      {referral.targetDepartment || referral.service || 'Specialty'} · {referral.reason || referral.summary || 'Referral active'}
                    </span>
                  </button>
                );
              })}
            {!referralAwareness.total ? (
              <p style={{ color: 'var(--color-text-muted, #9CA3AF)', margin: 0, fontSize: 13 }}>No active referrals in workflow.</p>
            ) : null}
            {reassessmentPatients.length ? reassessmentPatients.slice(0, 3).map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => focusReassessmentOnBoard(patient.id)}
                style={{
                  border: '1px solid color-mix(in srgb, var(--status-warning, #F59E0B) 34%, var(--color-border-default, #1F2937))',
                  borderRadius: 12,
                  background: 'color-mix(in srgb, var(--status-warning, #F59E0B) 12%, var(--color-card, #172033))',
                  boxShadow: 'inset 3px 0 0 var(--status-warning, #F59E0B)',
                  color: '#FDE68A',
                  cursor: 'pointer',
                  display: 'grid',
                  gap: 2,
                  padding: 10,
                  textAlign: 'left',
                }}
              >
                <strong>{patientName(patient)}</strong>
                <span style={{ color: 'var(--color-text-secondary, #D1D5DB)', fontSize: 12 }}>{patient.priority} · {patient.chiefComplaint}</span>
              </button>
            )) : (
              <p style={{ color: 'var(--color-text-muted, #9CA3AF)', margin: 0, fontSize: 13 }}>No reassessment tasks are due.</p>
            )}
            <MissionButton
              label="Filter Waiting Queue"
              onClick={() => openQueueReview('Waiting')}
              disabled={!canMutateWhiteboard}
            />
          </div>
        </div>
      </section>
      ) : null}

      {whiteboardDensity.surfaces.awarenessBanner.visible ? (
        <section
          aria-label="Operational awareness summary"
          className="emergency-whiteboard-page__awareness-banner"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
            background: 'color-mix(in srgb, var(--status-warning, #F59E0B) 10%, var(--color-surface, #111827))',
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <strong style={{ color: '#FDE68A', fontSize: 13 }}>
              Department under pressure — focus on what needs action now
            </strong>
            <span style={{ color: '#CBD5E1', fontSize: 12 }}>
              {operationalLoad.primaryFocus.map((focus) => `${focus.value} ${focus.label.toLowerCase()}`).join(' · ')}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('Reassess');
                setQueueFilter(null);
              }}
              style={awarenessChipStyle}
            >
              Reassess ({reassessmentAttentionCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('EMS');
                setQueueFilter(null);
              }}
              style={awarenessChipStyle}
            >
              EMS ({emsAwareness.inboundCount || activeEmsArrivals.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('All');
                setQueueFilter('referral');
              }}
              style={awarenessChipStyle}
            >
              Referrals ({referralAwareness.buckets.pending})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('Waiting');
                setQueueFilter(null);
              }}
              style={awarenessChipStyle}
            >
              Waiting ({stats.waiting})
            </button>
          </div>
        </section>
      ) : null}

      {whiteboardDensity.surfaces.filters.visible ? (
      <div
        className="emergency-whiteboard-page__controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          padding: 16,
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
        }}
      >
        <div className="emergency-whiteboard-page__filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((filter) => {
            const active = filter === activeFilter;
            const reassessCount = filter === 'Reassess' ? reassessmentAttentionCount : 0;
            const label = reassessCount > 0 ? `Reassess (${reassessCount})` : filter;
            const highlightReassess = filter === 'Reassess' && reassessCount > 0;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setActiveFilter(filter);
                  setQueueFilter(null);
                  if (filter === 'Reassess' && reassessCount > 0) {
                    document.dispatchEvent(new Event('open-reassessment-drawer'));
                  }
                }}
                style={{
                  border: highlightReassess
                    ? '1px solid color-mix(in srgb, var(--status-warning, #F59E0B) 52%, var(--color-border-subtle, #1F2937))'
                    : '1px solid var(--color-border-subtle, #1F2937)',
                  borderRadius: 999,
                  background: active
                    ? highlightReassess
                      ? 'var(--status-warning, #F59E0B)'
                      : 'var(--color-text-primary, #F9FAFB)'
                    : highlightReassess
                      ? 'color-mix(in srgb, var(--status-warning, #F59E0B) 14%, transparent)'
                      : 'transparent',
                  color: active
                    ? highlightReassess
                      ? 'var(--color-background, #111827)'
                      : 'var(--color-background, #111827)'
                    : highlightReassess
                      ? '#FDE68A'
                      : 'var(--color-text-muted, #9CA3AF)',
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: highlightReassess ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: highlightReassess && !active
                    ? '0 0 0 1px color-mix(in srgb, var(--status-warning, #F59E0B) 24%, transparent)'
                    : undefined,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="emergency-whiteboard-page__card-key" aria-label="Patient card visual key">
          <span><i style={{ background: 'var(--priority-p1, #EF4444)' }} /> CTAS band</span>
          <span><i style={{ background: 'var(--status-danger, #EF4444)' }} /> Critical risk</span>
          <span><i style={{ background: 'var(--status-warning, #F59E0B)' }} /> Wait/reassess</span>
          <span><i style={{ background: 'var(--color-secondary, #38BDF8)' }} /> EMS</span>
          <span><i style={{ background: 'var(--color-accent, #A78BFA)' }} /> Boarding</span>
        </div>

        {display.isDisplayMode ? null : isRegistrationClerk ? (
          <button
            className="emergency-whiteboard-page__intake-button"
            type="button"
            onClick={() => openRoute(CANONICAL_ROUTES.emergencyReception)}
            disabled={!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReception)}
            title="Open the Reception arrival dashboard for patient creation"
            style={{
              border: '1px solid var(--color-border-subtle, #1F2937)',
              borderRadius: 12,
              background: 'var(--component-button-primary-bg, #2563EB)',
              color: 'var(--component-button-primary-fg, #F9FAFB)',
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Open Reception
          </button>
        ) : (
          <button
            className="emergency-whiteboard-page__intake-button"
            type="button"
            onClick={openIntake}
            disabled={!canUseCentralIntake}
            title={
              canUseCentralIntake
                ? 'Send a new patient input to the Central Node'
                : `${emergencyRole.roleLabel} cannot submit central intake inputs`
            }
            style={{
              border: '1px solid var(--color-border-subtle, #1F2937)',
              borderRadius: 12,
              background: 'var(--component-button-primary-bg, #2563EB)',
              color: 'var(--component-button-primary-fg, #F9FAFB)',
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 700,
              cursor: canUseCentralIntake ? 'pointer' : 'not-allowed',
              opacity: canUseCentralIntake ? 1 : 0.58,
              whiteSpace: 'nowrap',
            }}
          >
            + Central Intake
          </button>
        )}
      </div>
      ) : null}

      {showIntake &&
      canUseCentralIntake &&
      !(isReceptionFirstUxEnabled() && prefersReceptionForPatientCreate(emergencyRole.role)) ? (
        <QuickIntake onClose={closeIntake} onAdded={handlePatientAdded} />
      ) : null}

      {whiteboardDensity.surfaces.queueIntelligence.visible &&
      !(physician.isPhysicianScreen && physician.hideQueueIntelligence) ? (
      <section
        className="emergency-whiteboard-page__queue-intelligence"
        aria-label="Whiteboard queue intelligence"
      >
        <QueueIntelligencePanel
          collapsed={queuePanelCollapsed}
          onCollapsedChange={setQueuePanelCollapsed}
        />
      </section>
      ) : null}

      {activeQueueFilter && whiteboardDensity.surfaces.patientGrid.visible ? (
        <div
          role="status"
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
            color: 'var(--color-text-primary, #F9FAFB)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'space-between',
            padding: '10px 16px',
          }}
        >
          <span style={{ color: '#BFDBFE', fontSize: 13, fontWeight: 850 }}>
            Showing the {activeQueueFilter} queue on the Whiteboard.
          </span>
          <button
            type="button"
            onClick={() => setQueueFilter(null)}
            style={{
              border: '1px solid var(--color-border-subtle, #1F2937)',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--color-text-primary, #F9FAFB)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 850,
              padding: '6px 10px',
            }}
          >
            Clear queue filter
          </button>
        </div>
      ) : null}

      {isInitialLoading ? <SkeletonLoader variant="whiteboard" /> : null}

      {whiteboard.error ? (
        <ToolApiErrorBanner
          message={`${whiteboard.error}. ${ERROR_RECOVERY_COPY.syncStale}`}
          onRetry={() => void whiteboard.refresh()}
          retryLabel="Refresh board"
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 320,
            border: '1px solid #10B981',
            borderRadius: 12,
            background: '#052E2B',
            color: '#D1FAE5',
            padding: '12px 14px',
            fontWeight: 700,
            boxShadow: 'none',
          }}
        >
          {toast}
        </div>
      ) : null}

      {whiteboardDensity.surfaces.patientGrid.visible && !whiteboard.loading && activeQueueFilter === 'Triage' && canReviewTriage && selectedPatientId ? (
        <div style={{ padding: '0 14px', marginTop: 12 }}>
          <AiTriageAssistPanelForPatientId patientId={selectedPatientId} />
        </div>
      ) : null}

      {whiteboardDensity.surfaces.patientGrid.visible && hiddenBoardCount > 0 ? (
        <div
          role="status"
          className="emergency-whiteboard-page__board-limit"
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
            color: '#FDE68A',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'color-mix(in srgb, var(--status-warning, #F59E0B) 8%, var(--color-surface, #111827))',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 750 }}>
            Showing {boardPatients.length} of {visiblePatients.length} patients on the All view — use Waiting, Reassess, or EMS filters for the full list.
          </span>
          <button
            type="button"
            onClick={() => {
              setActiveFilter(operationalLoad.suggestedFilter as FilterId);
              setQueueFilter(null);
            }}
            style={awarenessChipStyle}
          >
            Filter {operationalLoad.suggestedFilter}
          </button>
        </div>
      ) : null}

      {whiteboardDensity.surfaces.patientGrid.visible && whiteboard.loading && boardPatients.length === 0 ? (
        <div
          className="emergency-whiteboard-page__grid emergency-whiteboard-page__grid--loading"
          style={{ padding: 14 }}
          role="status"
          aria-label="Loading patient board"
        >
          <OperationalEmptyState
            size="panel"
            icon="↻"
            title={EMPTY_STATE_COPY.whiteboard.loading.title}
            guidance={EMPTY_STATE_COPY.whiteboard.loading.guidance}
            status={EMPTY_STATE_COPY.whiteboard.loading.status}
            statusTone="neutral"
            nextSteps={EMPTY_STATE_COPY.whiteboard.loading.nextSteps}
          />
          <SkeletonLoader variant="whiteboard" />
        </div>
      ) : whiteboardDensity.surfaces.patientGrid.visible && boardPatients.length > 0 ? (
        <>
        <div
          className="emergency-whiteboard-page__grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${screenDensity.whiteboard.gridMinCardWidth}px), 1fr))`,
            gap: screenDensity.whiteboard.gridGap,
            padding: screenDensity.whiteboard.gridGap + 4,
          }}
        >
          {boardPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              workflowProfile={patientCardWorkflowProfile}
              readOnlyDisplay={display.isDisplayMode}
            />
          ))}
        </div>
        </>
      ) : whiteboardDensity.surfaces.patientGrid.visible ? (
        <div
          className="ed-whiteboard__empty"
          style={{
            minHeight: 360,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
          }}
        >
          <OperationalEmptyState
            size="panel"
            icon="◎"
            title={
              !activeQueueFilter && activeFilter === 'All'
                ? EMPTY_STATE_COPY.whiteboard.empty.title
                : EMPTY_STATE_COPY.whiteboard.filtered.title
            }
            guidance={
              !activeQueueFilter && activeFilter === 'All'
                ? EMPTY_STATE_COPY.whiteboard.empty.guidance
                : EMPTY_STATE_COPY.whiteboard.filtered.guidance
            }
            status={
              !activeQueueFilter && activeFilter === 'All'
                ? EMPTY_STATE_COPY.whiteboard.empty.status
                : EMPTY_STATE_COPY.whiteboard.filtered.status
            }
            nextSteps={
              !activeQueueFilter && activeFilter === 'All'
                ? EMPTY_STATE_COPY.whiteboard.empty.nextSteps
                : EMPTY_STATE_COPY.whiteboard.filtered.nextSteps
            }
            actions={
              <>
                {activeQueueFilter || activeFilter !== 'All' ? (
                  <OperationalEmptyAction
                    onClick={() => {
                      setActiveFilter('All');
                      setQueueFilter(null);
                    }}
                  >
                    Clear filters
                  </OperationalEmptyAction>
                ) : null}
                {canUseCentralIntake ? (
                  <OperationalEmptyAction
                    secondary
                    onClick={() => {
                      if (prefersReceptionForPatientCreate(emergencyRole.role)) {
                        profileNavigate(getReceptionQuickCreatePath());
                        return;
                      }
                      document.dispatchEvent(new Event('open-intake'));
                    }}
                  >
                    Start intake
                  </OperationalEmptyAction>
                ) : null}
              </>
            }
          />
        </div>
      ) : null}
      {!display.isDisplayMode && (!physician.isPhysicianScreen || physician.showAssignedPatients) ? (
        <WhoNextPanel mode="floating" />
      ) : null}
      </>
      ) : null}
    </section>
  );
}
