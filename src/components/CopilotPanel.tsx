import './CopilotPanel.css';
import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSend } from '@tabler/icons-react';
import { PatientFlag, PatientState, Priority, type Alert, type Patient } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { useEDCopilot } from '../hooks/useEmergencyOs';
import useAiChiefOrchestrator from '../hooks/useAiChiefOrchestrator';
import useUnifiedApplicationKnowledgeGraph from '../hooks/useUnifiedApplicationKnowledgeGraph';
import type { CareDroidCentralNodeSnapshot } from '../central-node/careDroidCentralNode';
import { invokeUnifiedAiConversational } from '../services/careDroidUnifiedAiNode';
import { resolveUnifiedChannelFromRole } from '../services/unifiedAiEnvelope';
import { getAIPrompt } from '../lib/ai/promptRegistry';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import {
  PATIENT_STATUS_SUMMARY_PROMPT,
  SAFETY_BOUNDED_ASSISTANT_LABEL,
} from '../config/copilotSafety.config';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import { resolveCopilotChromeLabels } from '../config/profileDesignLanguage.config';
import { EMPTY_STATE_COPY } from '../config/emptyStateCopy';
import OperationalEmptyState, { OperationalEmptyAction } from './ui/OperationalEmptyState';
import './CopilotPanel.css';
import type { OperationalIntelligenceSnapshot } from '../operational-intelligence/operationalIntelligence.types';
import { formatLongWaitAttentionForCopilot } from '../utils/longWaitRescue';
import { formatCopilotRecommendationsForPrompt } from '../config/copilotRecommendationModel';
import {
  buildCopilotRecommendationSnapshot,
  resolveCopilotQuickActionFromSnapshot,
} from '../services/copilotRecommendationDiscovery';
import { formatWhatHappensNextForCopilot } from '../services/whatHappensNextGuidance';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';

import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import usePatientOrchestration from '../hooks/usePatientOrchestration';
import {
  formatPatientOrchestrationForCopilot,
  formatPatientToolRecommendationsForCopilot,
} from '@lib/patient-orchestration';
import { launchOrchestrationRecommendation } from '../services/orchestrationToolLaunch';
import { buildCopilotPatientArtifactContext } from '../services/patientAiContext';
import CopilotRiskLayerPanel from './copilot/CopilotRiskLayerPanel';
import AiTransparencyDashboard from './copilot/AiTransparencyDashboard';
import CopilotShell, { type CopilotShellTab } from './copilot/CopilotShell';
import useFeature from '../hooks/useFeature';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';
import {
  COPILOT_PLATFORM,
  getCopilotOperationalQuickActions,
  getCopilotToolLaunchActions,
  getCopilotWelcomeMessage,
  resolveCopilotRuntimeLimits,
} from '../config/copilotPlatform.config';
import useRouteScreenMode from '../hooks/useRouteScreenMode';
import { MetricChip } from './ui/CareDroidPrimitives';
import { persistCopilotInteractionSafely } from '../services/emergencyOsApi';
import { AccountableRecommendationCard } from './ai/AccountableRecommendationCard';
import AiRouteMetadata from './chat/AiRouteMetadata';
import { accountableFromGatewayPayload } from '../utils/accountableFromGateway';
import { abstainFromAiFailure } from '../services/aiFailureAbstention';
import { normalizeAiFoundationMetadata } from '../services/clinicalChatService';
import type { AccountableRecommendation } from '../contracts/accountableAi';

type CopilotMessage = {
  id: string;
  role: 'staff' | 'copilot';
  content: string;
  timestamp: Date;
  attachments?: CopilotAttachment[];
  /** Stage G: structured evidence / safety envelope when available */
  accountable?: AccountableRecommendation;
  /** CareDroid gateway + unified AI node routing snapshot */
  aiFoundation?: Record<string, unknown>;
  aiGateway?: Record<string, unknown>;
};

type StoreCopilotMessage = ReturnType<typeof useEmergencyStore.getState>['copilotMessages'][number];

type CopilotAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const QUICK_ACTIONS = [...getCopilotOperationalQuickActions()];
const TOOL_ACTIONS = getCopilotToolLaunchActions();
const MAX_COPILOT_ATTACHMENTS = COPILOT_PLATFORM.inputs.multimodal.maxAttachments;
const MAX_COPILOT_ATTACHMENT_BYTES = COPILOT_PLATFORM.inputs.multimodal.maxAttachmentBytes;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function attachmentSizeLabel(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentPromptSummary(attachments: CopilotAttachment[]): string {
  if (!attachments.length) return '';
  return attachments
    .map((attachment) => `${attachment.name} (${attachment.type || 'unknown type'}, ${attachmentSizeLabel(attachment.size)})`)
    .join('; ');
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition || candidate.webkitSpeechRecognition || null;
}

function transcriptFromSpeechEvent(event: unknown): string {
  const results = (event as { results?: ArrayLike<ArrayLike<{ transcript?: string }>> })?.results;
  if (!results) return '';
  return Array.from(results)
    .flatMap((result) => Array.from(result))
    .map((item) => item.transcript || '')
    .join(' ')
    .trim();
}

function waitMinutes(arrivalTime: string): number {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn;
}

function patientFlags(patient: Patient): PatientFlag[] {
  return Array.isArray(patient.flags) ? patient.flags : [];
}

function patientVitals(patient: Patient): Patient['vitals'] {
  return Array.isArray(patient.vitals) ? patient.vitals : [];
}

function isActivePatient(patient: Patient): boolean {
  return patient.state !== PatientState.Discharge;
}

function isHighRiskPatient(patient: Patient): boolean {
  const flags = patientFlags(patient);
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    flags.includes(PatientFlag.HighRisk) ||
    flags.includes(PatientFlag.DeteriorationRisk) ||
    flags.includes(PatientFlag.SepsisAlert)
  );
}

function isReassessmentDue(patient: Patient): boolean {
  return patientFlags(patient).includes(PatientFlag.ReassessmentDue);
}

function formatAlert(alert: Alert): string {
  return `${alert.severity}: ${alert.title} - ${alert.message}`;
}

function formatPressure(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mergeActiveAlerts(alerts: Alert[], centralSnapshot: CareDroidCentralNodeSnapshot): Alert[] {
  const byId = new Map<string, Alert>();
  for (const alert of [...centralSnapshot.operationalAlerts, ...alerts]) {
    if (!alert.dismissed) byId.set(alert.id, alert);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function formatQueueHealthForPrompt(centralSnapshot: CareDroidCentralNodeSnapshot): string {
  const queueHealth = Array.isArray(centralSnapshot.queueHealth) ? centralSnapshot.queueHealth : [];
  const breachedQueues = queueHealth.filter((queue) => queue.breached);
  if (!breachedQueues.length) return 'No queue thresholds breached.';
  return breachedQueues
    .slice(0, 4)
    .map(
      (queue) =>
        `${queue.label}: ${queue.count} waiting, oldest ${queue.oldestWaitMinutes}m vs ${queue.targetMinutes}m target`,
    )
    .join('; ');
}

function summarizePatient(patient: Patient): string {
  const latestVitals = patientVitals(patient).at(-1);
  const flags = patientFlags(patient);
  const vitals = latestVitals
    ? `HR ${latestVitals.hr ?? '--'}, SBP ${latestVitals.sbp ?? '--'}, SpO2 ${latestVitals.spo2 ?? '--'}, Temp ${latestVitals.temp ?? '--'}`
    : 'Vitals unavailable';
  return [
    patientName(patient),
    patient.mrn,
    patient.chiefComplaint,
    patient.state,
    patient.priority,
    `Wait ${waitMinutes(patient.arrivalTime)}m`,
    vitals,
    flags.length ? `Flags: ${flags.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
}

function buildDepartmentPrompt({
  patients,
  alerts,
  emergencySettings,
  backendCopilotContext,
  centralSnapshot,
  intelligenceSnapshot,
  attachments,
  selectedPatient,
  copilotRecommendations,
  referrals,
  patientOrchestrationPrompt,
  patientToolRecommendationsPrompt,
  aiChiefVisibleScenarios,
}: {
  patients: Patient[];
  alerts: Alert[];
  emergencySettings: ReturnType<typeof useEmergencyStore.getState>['emergencySettings'];
  backendCopilotContext?: Record<string, unknown>;
  centralSnapshot: CareDroidCentralNodeSnapshot;
  intelligenceSnapshot: OperationalIntelligenceSnapshot;
  attachments?: CopilotAttachment[];
  selectedPatient?: Patient | null;
  copilotRecommendations: ReturnType<typeof buildCopilotRecommendationSnapshot>['recommendations'];
  referrals?: ReturnType<typeof useEmergencyStore.getState>['referrals'];
  patientOrchestrationPrompt?: string;
  patientToolRecommendationsPrompt?: string;
  aiChiefVisibleScenarios?: string[];
}) {
  const activePatients = patients.filter(isActivePatient);
  const highRiskPatients = activePatients.filter(isHighRiskPatient);
  const reassessmentQueue = activePatients.filter(isReassessmentDue);
  const activeAlerts = mergeActiveAlerts(alerts, centralSnapshot);
  const longWaitAttention = formatLongWaitAttentionForCopilot(activePatients, new Date(), emergencySettings);
  const queueHealth = Array.isArray(centralSnapshot.queueHealth) ? centralSnapshot.queueHealth : [];
  const breachedQueues = queueHealth.filter((queue) => queue.breached);
  const bottleneckRegistry = centralSnapshot.bottleneckRegistry;
  const activeBottlenecks = bottleneckRegistry?.activeBottlenecks || [];
  const degradedServices = (bottleneckRegistry?.serviceHealth || []).filter((service) =>
    ['degraded', 'down'].includes(service.status),
  );
  const attachmentSummary = attachmentPromptSummary(attachments || []);

  return [
    getAIPrompt(COPILOT_PLATFORM.identity.promptId).prompt,
    HUMAN_REVIEW_DISCLAIMER,
    typeof backendCopilotContext?.safetyRule === 'string' ? backendCopilotContext.safetyRule : null,
    ...(COPILOT_PLATFORM.prompts.styleRules as string[]),
    formatCopilotRecommendationsForPrompt(copilotRecommendations as unknown[]),
    attachmentSummary
      ? `Multimodal input attached: ${attachmentSummary}. Image bytes are retained in the browser preview only in this pass; do not claim visual interpretation or diagnosis. Ask for human review or a connected vision model contract before acting on image content.`
      : null,
    '',
    `Patient count: ${activePatients.length}`,
    `High risk count: ${highRiskPatients.length}`,
    `Capacity band: ${centralSnapshot.capacityStatus.band} (${centralSnapshot.capacityStatus.score})`,
    `EMS pressure: ${centralSnapshot.emsPressure.status}; ${centralSnapshot.emsPressure.inbound} inbound, ${centralSnapshot.emsPressure.criticalInbound} critical inbound`,
    `Boarding pressure: ${centralSnapshot.boardingStatus.risk}; ${centralSnapshot.boardingStatus.boarders} boarders`,
    `Queue health: ${breachedQueues.length} breached queues. ${formatQueueHealthForPrompt(centralSnapshot)}`,
    `Active bottlenecks: ${activeBottlenecks.length}. ${bottleneckRegistry?.rootCauseSummary || 'No root cause summary available.'}`,
    `3-minute risk projection: ${bottleneckRegistry?.threeMinuteRiskProjection?.status || 'unknown'} - ${bottleneckRegistry?.threeMinuteRiskProjection?.summary || 'No projection available.'}`,
    `Degraded services: ${degradedServices.length ? degradedServices.map((service) => `${service.serviceName} (${service.status})`).join('; ') : 'None'}`,
    'Bottleneck loop intents available: service_bottleneck_analysis, workflow_delay_analysis, fallback_recommendation, three_minute_risk_projection, operational_root_cause_summary.',
    'AI Chief orchestration continuously monitors patient flow, capacity, staffing, bottlenecks, alerts, service health, EMS arrivals, prioritization, and clinical workflow support. All outputs are advisory and require clinician review.',
    activeBottlenecks.length
      ? [
          'Active bottleneck details:',
          ...activeBottlenecks.slice(0, 5).map(
            (event) =>
              `- ${event.severity} ${event.category}: ${event.title}; service ${event.serviceName}; owner ${event.ownerRole}; fallback ${event.fallbackAction}`,
          ),
        ].join('\n')
      : null,
    `Reassessment queue count: ${centralSnapshot.reassessmentStatus.due}; overdue ${centralSnapshot.reassessmentStatus.overdue}`,
    `Active operational alerts: ${activeAlerts.length}`,
    longWaitAttention || null,
    '',
    formatWhatHappensNextForCopilot(patients, {
      referrals,
      selectedPatientId: selectedPatient?.id || null,
    }),
    '',
    'Active high risk patients:',
    highRiskPatients.length ? highRiskPatients.map((patient) => `- ${summarizePatient(patient)}`).join('\n') : '- None',
    '',
    'Reassessment queue:',
    reassessmentQueue.length ? reassessmentQueue.map((patient) => `- ${summarizePatient(patient)}`).join('\n') : '- None',
    '',
    'Active alerts:',
    activeAlerts.length ? activeAlerts.map((alert) => `- ${formatAlert(alert)}`).join('\n') : '- None',
    '',
    'Operational intelligence snapshot:',
    `- Mode: ${intelligenceSnapshot.mode}`,
    `- Data freshness: ${intelligenceSnapshot.dataFreshness.status}`,
    `- Anomalies: ${(intelligenceSnapshot.anomalies ?? []).length}`,
    `- Advisory recommendations: ${(intelligenceSnapshot.recommendations ?? []).map((rec) => `${rec.action} (${rec.route || 'no route'})`).join('; ') || 'None'}`,
    `- ${intelligenceSnapshot.disclaimers.operational}`,
    `- ${intelligenceSnapshot.disclaimers.clinical}`,
    selectedPatient?.triageAssist
      ? [
          '',
          'Selected patient triage assist (staff must confirm):',
          `- Patient: ${summarizePatient(selectedPatient)}`,
          `- Suggested priority: ${selectedPatient.triageAssist.suggestedPriority}`,
          `- Suggested queue: ${selectedPatient.triageAssist.suggestedQueue}`,
          `- Rationale: ${(selectedPatient.triageAssist.rationale ?? []).join(' | ') || 'Not recorded'}`,
          `- ${selectedPatient.triageAssist.disclaimers?.[0] || HUMAN_REVIEW_DISCLAIMER}`,
        ].join('\n')
      : null,
    patientOrchestrationPrompt || null,
    patientToolRecommendationsPrompt || null,
    aiChiefVisibleScenarios?.length
      ? `AI Chief alert scenarios visible to this role: ${aiChiefVisibleScenarios.join(', ')}. Route recommendations to suggested owners; escalation roles apply when unacknowledged.`
      : null,
  ].filter((line): line is string => Boolean(line)).join('\n');
}

function extractResponseText(data: unknown): string {
  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const response = payload.response;
  if (typeof response === 'string' && response.trim()) return response;
  const message = payload.message;
  if (typeof message === 'string' && message.trim()) return message;
  return 'I could not generate a response.';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function tokenDelay(token: string): number {
  if (/[.!?]\s*$/.test(token)) return 14;
  if (/[,;:]\s*$/.test(token)) return 10;
  return 7;
}

async function streamIntoMessage(
  text: string,
  messageId: string,
  setMessages: Dispatch<SetStateAction<CopilotMessage[]>>,
) {
  const tokens = text.match(/\S+\s*/g) || [text];
  let nextContent = '';

  for (const token of tokens) {
    nextContent += token;
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId ? { ...message, content: nextContent } : message,
      ),
    );
    await delay(tokenDelay(token));
  }
}

function timestampFromStoreMessage(message: StoreCopilotMessage): Date {
  const parsed = new Date(message.createdAt);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
}

function panelMessagesFromStoreMessage(message: StoreCopilotMessage): CopilotMessage[] {
  const timestamp = timestampFromStoreMessage(message);
  return [
    message.query
      ? {
          id: `${message.id}-staff`,
          role: 'staff' as const,
          content: message.query,
          timestamp,
        }
      : null,
    {
      id: message.id,
      role: 'copilot' as const,
      content: message.response,
      timestamp,
    },
  ].filter((item): item is CopilotMessage => Boolean(item));
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }} aria-label="Copilot typing">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="ed-copilot-typing-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: MEDICAL_THEME.inkSubtle,
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function CopilotPanel() {
  const navigate = useNavigate();
  const patients = useEmergencyStore((store) => store.patients);
  const referrals = useEmergencyStore((store) => store.referrals);
  const selectedPatientId = useEmergencyStore((store) => store.selectedPatientId);
  const capacity = useEmergencyStore((store) => store.capacity);
  const alerts = useEmergencyStore((store) => store.alerts);
  const emergencySettings = useEmergencyStore((store) => store.emergencySettings);
  const setCopilotOpen = useEmergencyStore((store) => store.setCopilotOpen);
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const recordWorkflowAction = useEmergencyStore((store) => store.recordWorkflowAction);
  const appendCopilotMessage = useEmergencyStore((store) => store.appendCopilotMessage);
  const storeCopilotMessages = useEmergencyStore((store) => store.copilotMessages);
  const routeScreenMode = useRouteScreenMode();
  const aiChiefOrchestrator = useAiChiefOrchestrator({
    screenMode: routeScreenMode,
    realtime: false,
    selectedPatientId,
  });
  const operationalIntelligence = aiChiefOrchestrator.operationalIntelligence;
  const centralSnapshot = aiChiefOrchestrator.centralSnapshot;
  const intelligenceSnapshot = aiChiefOrchestrator.intelligenceSnapshot;
  const aiChiefSnapshot = aiChiefOrchestrator.snapshot;
  const knowledgeGraphContext = useUnifiedApplicationKnowledgeGraph({ selectedPatientId }).copilotContext;
  const { saasRole, profileCopy } = useEffectiveUserProfile();
  const copilotChrome = useMemo(() => resolveCopilotChromeLabels(profileCopy), [profileCopy]);
  const emergencyRole = useEmergencyRolePermissions();
  const { visibleScenarios: aiChiefVisibleScenarios } = aiChiefOrchestrator.aiChiefRouting;
  const practitionerSurfaces = usePractitionerSurfaceVisibility();
  const copilotSurfaces = practitionerSurfaces.copilot;
  const copilotLimits = resolveCopilotRuntimeLimits();
  const quickActionLimit = copilotLimits.maxQuickActions;
  const welcomeMessage = useMemo(
    () => getCopilotWelcomeMessage(copilotSurfaces.compactLayout, profileCopy),
    [copilotSurfaces.compactLayout, profileCopy],
  );
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'copilot-welcome',
      role: 'copilot',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  useEffect(() => {
    setMessages((current) => {
      if (current.length === 1 && current[0]?.id === 'copilot-welcome') {
        return [{ ...current[0], content: welcomeMessage }];
      }
      return current;
    });
  }, [welcomeMessage]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);
  const [composerStatus, setComposerStatus] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CopilotShellTab>('chat');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const attachmentsRef = useRef<CopilotAttachment[]>([]);
  const backendCopilot = useEDCopilot() as {
    data?: {
      data?: {
        promptContext?: Record<string, unknown>;
        quickActions?: string[];
      };
    } | null;
    error?: string;
  };
  const backendCopilotContext = backendCopilot.data?.data?.promptContext;
  const quickActions = useMemo(() => {
    const actions = backendCopilot.data?.data?.quickActions;
    return Array.isArray(actions) && actions.length ? actions : QUICK_ACTIONS;
  }, [backendCopilot.data]);
  const backendSafetyRule =
    typeof backendCopilotContext?.safetyRule === 'string' ? backendCopilotContext.safetyRule : '';

  const activePatients = useMemo(() => patients.filter(isActivePatient), [patients]);
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );
  const patientOrchestration = usePatientOrchestration(selectedPatient);
  const { enabled: aiTransparencyEnabled } = useFeature('ai_transparency_dashboard');
  const patientOrchestrationPrompt = useMemo(
    () => formatPatientOrchestrationForCopilot(patientOrchestration),
    [patientOrchestration],
  );
  const patientToolRecommendationsPrompt = useMemo(
    () => formatPatientToolRecommendationsForCopilot(patientOrchestration),
    [patientOrchestration],
  );
  const copilotSnapshot = useMemo(() => {
    const base = buildCopilotRecommendationSnapshot({
      centralSnapshot,
      patients,
      referrals,
      emsInbound: centralSnapshot.emsPressure.inbound,
    });
    const aiChiefMapped = aiChiefSnapshot.recommendations.map((recommendation) => ({
      id: recommendation.id,
      domain: recommendation.domain,
      action: recommendation.action,
      detail: recommendation.rationale,
      route: recommendation.route,
      severity:
        recommendation.tone === 'critical'
          ? 'Critical'
          : recommendation.tone === 'warning'
            ? 'Warning'
            : 'Info',
      priority: recommendation.priority,
      generatedAt: aiChiefSnapshot.generatedAt,
      humanReviewRequired: true,
      advisoryOnly: true,
      ownerRole: recommendation.ownerRole,
    }));
    const seen = new Set<string>();
    const recommendations = [...aiChiefMapped, ...base.recommendations].filter((recommendation) => {
      if (seen.has(recommendation.id)) return false;
      seen.add(recommendation.id);
      return true;
    });
    return { ...base, recommendations };
  }, [aiChiefSnapshot, centralSnapshot, patients, referrals]);
  const copilotRecommendations = copilotSnapshot.recommendations;

  const openRecommendation = (route?: string) => {
    if (!route) return;
    navigateProfileAware(navigate, route, { emergencyRole, saasRole });
  };

  useEffect(() => {
    const handlePrefill = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; patientId?: string }>).detail;
      if (detail?.patientId) {
        selectPatient(detail.patientId);
        setCopilotOpen(true);
      }
      if (detail?.message) {
        setInput(detail.message);
      }
    };
    window.addEventListener(COPILOT_PLATFORM.identity.dockEvent, handlePrefill);
    return () => window.removeEventListener(COPILOT_PLATFORM.identity.dockEvent, handlePrefill);
  }, [selectPatient, setCopilotOpen]);

  useEffect(() => {
    const handleSetTab = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: CopilotShellTab }>).detail?.tab;
      if (tab) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('ed:copilot-set-tab', handleSetTab);
    return () => window.removeEventListener('ed:copilot-set-tab', handleSetTab);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('ed:copilot-tab-changed', { detail: { tab: activeTab } }),
    );
  }, [activeTab]);
  const highRiskCount = useMemo(() => activePatients.filter(isHighRiskPatient).length, [activePatients]);
  const reassessmentCount = useMemo(() => activePatients.filter(isReassessmentDue).length, [activePatients]);
  const activeOperationalAlerts = useMemo(
    () => mergeActiveAlerts(alerts, centralSnapshot),
    [alerts, centralSnapshot],
  );
  const breachedQueues = useMemo(
    () =>
      (Array.isArray(centralSnapshot.queueHealth) ? centralSnapshot.queueHealth : []).filter(
        (queue) => queue.breached,
      ),
    [centralSnapshot.queueHealth],
  );
  const firstBreachedQueue = breachedQueues[0];
  const awarenessCards = [
    {
      label: 'Capacity',
      value: `${centralSnapshot.capacityStatus.score}`,
      detail: centralSnapshot.capacityStatus.band,
    },
    {
      label: 'EMS',
      value: `${centralSnapshot.emsPressure.inbound}`,
      detail:
        centralSnapshot.emsPressure.criticalInbound > 0
          ? `${centralSnapshot.emsPressure.criticalInbound} critical`
          : formatPressure(centralSnapshot.emsPressure.status),
    },
    {
      label: 'Queues',
      value: `${breachedQueues.length}`,
      detail: firstBreachedQueue
        ? `${firstBreachedQueue.label} ${firstBreachedQueue.oldestWaitMinutes}m`
        : 'Clear',
    },
    {
      label: 'Alerts',
      value: `${activeOperationalAlerts.length}`,
      detail: activeOperationalAlerts[0]?.title || 'None',
    },
    {
      label: 'Bottlenecks',
      value: `${centralSnapshot.bottleneckRegistry.analytics.activeCount}`,
      detail: centralSnapshot.bottleneckRegistry.threeMinuteRiskProjection.status.replace(/_/g, ' '),
    },
  ];

  useEffect(() => {
    if (!storeCopilotMessages.length) return;
    setMessages((currentMessages) => {
      const nextMessages = [...currentMessages];
      for (const storeMessage of storeCopilotMessages) {
        if (!storeMessage.response) continue;
        const alreadyRendered = nextMessages.some(
          (message) =>
            message.id === storeMessage.id ||
            (message.role === 'copilot' && message.content === storeMessage.response),
        );
        if (alreadyRendered) continue;
        nextMessages.push(...panelMessagesFromStoreMessage(storeMessage));
      }
      return nextMessages.length === currentMessages.length ? currentMessages : nextMessages;
    });
  }, [storeCopilotMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [loading, messages]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => () => {
    attachmentsRef.current.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    speechRecognitionRef.current?.abort?.();
  }, []);

  const addImageAttachments = (files: FileList | null) => {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      setComposerStatus('Attach images only for this Copilot pass.');
      return;
    }

    setAttachments((currentAttachments) => {
      const remainingSlots = Math.max(0, MAX_COPILOT_ATTACHMENTS - currentAttachments.length);
      const accepted = imageFiles
        .filter((file) => file.size <= MAX_COPILOT_ATTACHMENT_BYTES)
        .slice(0, remainingSlots)
        .map((file) => ({
          id: createId('attachment'),
          name: file.name,
          type: file.type,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
        }));

      const rejectedCount = imageFiles.length - accepted.length;
      setComposerStatus(
        rejectedCount > 0
          ? 'Some images were skipped due to size or attachment limits.'
          : 'Image context attached for human-reviewed Copilot prompt metadata.',
      );
      return [...currentAttachments, ...accepted];
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((currentAttachments) => {
      const attachment = currentAttachments.find((candidate) => candidate.id === attachmentId);
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      return currentAttachments.filter((candidate) => candidate.id !== attachmentId);
    });
  };

  const startVoiceDictation = () => {
    if (voiceListening) {
      speechRecognitionRef.current?.stop();
      setVoiceListening(false);
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setComposerStatus('Voice dictation is not supported by this browser.');
      return;
    }

    const recognition = new Recognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = transcriptFromSpeechEvent(event);
      if (transcript) {
        setInput((current) => (current ? `${current} ${transcript}` : transcript));
        setComposerStatus('Voice transcript inserted for staff review before sending.');
      }
    };
    recognition.onerror = () => {
      setComposerStatus('Voice dictation stopped. Confirm microphone permission and try again.');
      setVoiceListening(false);
    };
    recognition.onend = () => setVoiceListening(false);
    setVoiceListening(true);
    setComposerStatus('Listening. Speech text remains editable before it is sent.');
    recognition.start();
  };

  const sendMessage = async (value?: string) => {
    const submittedAttachments = value ? [] : attachments;
    const text = (value ?? input).trim();
    const attachmentSummary = attachmentPromptSummary(submittedAttachments);
    const messageAttachments = submittedAttachments.map(({ id, name, type, size }) => ({
      id,
      name,
      type,
      size,
    }));
    const promptText =
      text ||
      (attachmentSummary
        ? `Review attached clinical image metadata: ${attachmentSummary}`
        : '');
    if ((!promptText && !submittedAttachments.length) || loading) return;

    const staffMessage: CopilotMessage = {
      id: createId('staff'),
      role: 'staff',
      content: promptText,
      timestamp: new Date(),
      attachments: messageAttachments,
    };
    const assistantId = createId('copilot');
    const assistantMessage: CopilotMessage = {
      id: assistantId,
      role: 'copilot',
      content: '',
      timestamp: new Date(),
    };
    const history = messages;
    const systemPrompt = buildDepartmentPrompt({
      patients,
      alerts,
      emergencySettings,
      backendCopilotContext,
      centralSnapshot,
      intelligenceSnapshot,
      attachments: submittedAttachments,
      selectedPatient,
      copilotRecommendations,
      referrals,
      patientOrchestrationPrompt,
      patientToolRecommendationsPrompt,
      aiChiefVisibleScenarios,
    });
    const quickActionResolution = resolveCopilotQuickActionFromSnapshot(promptText, {
      centralSnapshot,
      patients,
      referrals,
      emsInbound: centralSnapshot.emsPressure.inbound,
    });
    recordWorkflowAction({
      type: COPILOT_PLATFORM.outputs.workflowActionType,
      title: 'Copilot used',
      summary: `${resolveUnifiedChannelFromRole(String(emergencyRole.role || saasRole || ''), 'api') === 'reception' ? 'Reception Copilot' : 'ED Copilot'} prompt submitted: ${promptText.slice(0, 80)}${promptText.length > 80 ? '...' : ''}`,
      actorStaffId: 'current-user',
      source: COPILOT_PLATFORM.outputs.workflowSource,
      metadata: {
        unifiedChannel: resolveUnifiedChannelFromRole(String(emergencyRole.role || saasRole || ''), 'api'),
        promptLength: promptText.length,
        multimodalAttachmentCount: submittedAttachments.length,
        multimodalAttachmentTypes: submittedAttachments.map((attachment) => attachment.type).join(', '),
        multimodalSafetyBoundary:
          submittedAttachments.length > 0
            ? 'Images are browser-preview metadata only until a reviewed vision model contract is connected.'
            : undefined,
        activePatientCount: activePatients.length,
        capacityScore: centralSnapshot.capacityStatus.score,
        capacityBand: centralSnapshot.capacityStatus.band,
        emsPressure: centralSnapshot.emsPressure.status,
        emsInbound: centralSnapshot.emsPressure.inbound,
        boardingRisk: centralSnapshot.boardingStatus.risk,
        boarders: centralSnapshot.boardingStatus.boarders,
        breachedQueues: breachedQueues.length,
        reassessmentQueueCount: centralSnapshot.reassessmentStatus.due,
        activeAlerts: activeOperationalAlerts.length,
      },
    });

    setInput('');
    submittedAttachments.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    setAttachments([]);
    setLoading(true);
    setMessages((currentMessages) => [...currentMessages, staffMessage, assistantMessage]);

    if (quickActionResolution.handled && quickActionResolution.response) {
      await streamIntoMessage(quickActionResolution.response, assistantId, setMessages);
      appendCopilotMessage({
        id: assistantId,
        query: promptText,
        response: quickActionResolution.response,
        safetyStatus: 'unknown',
        createdAt: assistantMessage.timestamp.toISOString(),
        raw: { source: quickActionResolution.source || 'rule' },
      });
      setLoading(false);
      return;
    }

    try {
      const requestMessages = [
        ...history.map((message) => ({
          role: message.role === 'staff' ? 'user' as const : 'assistant' as const,
          content: message.content,
        })),
        { role: 'user' as const, content: promptText },
      ];
      const patientArtifactContext = buildCopilotPatientArtifactContext(
        selectedPatient,
        patientOrchestration,
      );

      const callerRole = String(emergencyRole.role || saasRole || 'unknown');
      const unifiedChannel = resolveUnifiedChannelFromRole(callerRole, 'api');
      const isReceptionCopilot = unifiedChannel === 'reception';
      const response = await invokeUnifiedAiConversational({
        capabilityId: 'copilot',
        platformServiceId: 'copilot',
        requestType: COPILOT_PLATFORM.identity.requestType,
        systemPrompt,
        message: promptText,
        messages: requestMessages,
        patientId: selectedPatient?.id,
        sourceScreen: isReceptionCopilot ? 'reception_copilot' : 'copilot_panel',
        context: {
          userRole: callerRole,
          unifiedChannel,
          aiRequest: {
            requestType: COPILOT_PLATFORM.identity.requestType,
            patientId: selectedPatient?.id,
            patientContext: patientOrchestrationPrompt,
            complaint: selectedPatient?.chiefComplaint || selectedPatient?.complaint,
            patientVitals: patientArtifactContext?.vitals,
          },
          edCopilot: {
            channel: unifiedChannel,
            receptionCopilot: isReceptionCopilot,
            patientCount: activePatients.length,
            highRiskCount,
            selectedPatientId: selectedPatient?.id || null,
            patientArtifactContext,
            patientOrchestrationPrompt,
            patientToolRecommendationsPrompt,
            capacityBand: capacity.band,
            capacityScore: capacity.score,
            emsPressure: centralSnapshot.emsPressure,
            boardingStatus: centralSnapshot.boardingStatus,
            queueHealth: centralSnapshot.queueHealth,
            bottleneckRegistry: {
              activeBottlenecks: centralSnapshot.bottleneckRegistry.activeBottlenecks,
              serviceHealth: centralSnapshot.bottleneckRegistry.serviceHealth,
              threeMinuteRiskProjection: centralSnapshot.bottleneckRegistry.threeMinuteRiskProjection,
              rootCauseSummary: centralSnapshot.bottleneckRegistry.rootCauseSummary,
            },
            reassessmentStatus: centralSnapshot.reassessmentStatus,
            reassessmentQueueCount: centralSnapshot.reassessmentStatus.due,
            activeAlerts: activeOperationalAlerts.length,
            safetyRule: EMERGENCY_OS_BRANDING.safetyLine,
            backendContext: backendCopilotContext,
            aiChiefSnapshot: {
              generatedAt: aiChiefSnapshot.generatedAt,
              metrics: aiChiefSnapshot.metrics,
              recommendations: aiChiefSnapshot.recommendations,
              visibleScenarios: aiChiefVisibleScenarios,
            },
            knowledgeGraphContext,
            multimodal: {
              enabledInputs: [...COPILOT_PLATFORM.inputs.multimodal.enabledInputs],
              attachments: submittedAttachments.map((attachment) => ({
                name: attachment.name,
                type: attachment.type,
                size: attachment.size,
              })),
              visionModelConnected: COPILOT_PLATFORM.safety.visionModelConnected,
              safetyBoundary: COPILOT_PLATFORM.safety.multimodalBoundary,
            },
          },
        },
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const responseText =
        typeof response.content === 'string' ? response.content : extractResponseText(response.data);
      const responsePayload =
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : (response as unknown as Record<string, unknown>);
      const accountable = accountableFromGatewayPayload(responsePayload, responseText);
      const aiFoundation = normalizeAiFoundationMetadata(
        (responsePayload.metadata as Record<string, unknown>) || {},
      );
      const aiGateway =
        responsePayload.metadata &&
        typeof responsePayload.metadata === 'object' &&
        (responsePayload.metadata as { aiGateway?: Record<string, unknown> }).aiGateway
          ? (responsePayload.metadata as { aiGateway: Record<string, unknown> }).aiGateway
          : undefined;
      await streamIntoMessage(accountable.content || responseText, assistantId, setMessages);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, accountable, aiFoundation, aiGateway }
            : message,
        ),
      );
      appendCopilotMessage({
        id: assistantId,
        query: promptText,
        response: accountable.content || responseText,
        safetyStatus:
          accountable.safety.status === 'ok'
            ? 'safe'
            : accountable.safety.status === 'degraded'
              ? 'caution'
              : accountable.safety.status === 'escalate' || accountable.safety.status === 'abstain'
                ? 'blocked'
                : 'unknown',
        createdAt: assistantMessage.timestamp.toISOString(),
        raw: { ...(response.data as object), accountableRecommendation: accountable },
      });
      persistCopilotInteractionSafely({
        question: promptText,
        patientId: selectedPatient?.id,
        patientContextSummary: patientOrchestrationPrompt,
        draftGuidance: accountable.content || responseText,
        userRole: emergencyRole.role,
        requiresHumanReview: accountable.humanReviewRequired,
      });
    } catch (error) {
      const abstain = abstainFromAiFailure(error, {
        provider: 'caredroid-copilot',
        promptVersion: 'copilot-panel@1',
      });
      const fallbackResponse =
        abstain.content ||
        COPILOT_PLATFORM.prompts.fallbackUnavailable.replace(
          'CareDroid Copilot',
          EMERGENCY_OS_BRANDING.copilotName,
        );
      await streamIntoMessage(fallbackResponse, assistantId, setMessages);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: fallbackResponse, accountable: abstain }
            : message,
        ),
      );
      appendCopilotMessage({
        id: assistantId,
        query: promptText,
        response: fallbackResponse,
        safetyStatus: 'blocked',
        createdAt: assistantMessage.timestamp.toISOString(),
        raw: { accountableRecommendation: abstain },
      });
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const sendQuickAction = (action: string) => {
    setInput((current) => (current ? `${current} ${action}` : action));
    void sendMessage(action);
  };

  const openToolAction = (action: (typeof TOOL_ACTIONS)[number]) => {
    window.dispatchEvent(new CustomEvent(action.eventName, { detail: action.detail }));
  };

  const contextBadgeCount = copilotRecommendations.length;

  const copilotHeader = (
    <header className="ed-copilot-panel__header">
      <span
        role="status"
        aria-label="Copilot panel active"
        className="ed-copilot-panel__live-dot"
      />
      <div className="ed-copilot-panel__identity">
        <span>{copilotChrome.productName}</span>
        {copilotSurfaces.showSafetyBadge ? (
          <strong>{SAFETY_BOUNDED_ASSISTANT_LABEL}</strong>
        ) : null}
      </div>
      {copilotSurfaces.showStatusStrip ? (
        <div className="ed-copilot-panel__status-strip" aria-label="Department snapshot">
          <MetricChip value={activePatients.length} label="patients" />
          <MetricChip value={capacity?.band ?? '—'} label="cap" />
          <MetricChip value={reassessmentCount} label="reassess" />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setCopilotOpen(false)}
        aria-label={`Close ${copilotChrome.productName}`}
        className="ed-copilot-panel__close"
      >
        X
      </button>
    </header>
  );

  const chatContent = (
    <div
      aria-label={`${copilotChrome.productName} messages`}
      className="ed-copilot-panel__messages"
    >
      {backendCopilot.error ? (
        <div role="status" className="ed-copilot-panel__policy" data-state="error">
          {COPILOT_PLATFORM.prompts.backendContextDegraded}
        </div>
      ) : null}
      {!backendCopilot.error && backendSafetyRule ? (
        <div role="status" className="ed-copilot-panel__policy">
          Backend safety policy: {backendSafetyRule}
        </div>
      ) : null}
      {messages.map((message) => (
        <div key={message.id} className="ed-copilot-panel__message" data-role={message.role}>
          <div className="ed-copilot-panel__bubble">
            {message.role === 'copilot' && message.accountable ? (
              <AccountableRecommendationCard recommendation={message.accountable} compact />
            ) : (
              message.content || (message.role === 'copilot' && loading ? <TypingIndicator /> : null)
            )}
            {message.role === 'copilot' && message.aiFoundation ? (
              <AiRouteMetadata
                aiFoundation={message.aiFoundation}
                aiGateway={message.aiGateway}
              />
            ) : null}
            {message.attachments?.length ? (
              <div className="ed-copilot-panel__message-attachments">
                {message.attachments.map((attachment) => (
                  <span key={attachment.id}>
                    Image: {attachment.name} · {attachmentSizeLabel(attachment.size)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <time>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      ))}
      {!messages.length && !loading ? (
        <OperationalEmptyState
          size="inline"
          icon="💬"
          title={EMPTY_STATE_COPY.copilot.noMessages.title}
          guidance={EMPTY_STATE_COPY.copilot.noMessages.guidance}
          helpTopicId="copilot"
          actions={QUICK_ACTIONS.slice(0, quickActionLimit).map((prompt) => (
            <OperationalEmptyAction key={prompt} secondary onClick={() => sendQuickAction(prompt)}>
              {prompt}
            </OperationalEmptyAction>
          ))}
        />
      ) : null}
      {loading && messages[messages.length - 1]?.content ? (
        <div style={{ alignSelf: 'flex-start' }}>
          <TypingIndicator />
        </div>
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );

  const contextContent = (
    <>
      {selectedPatient ? (
        <p className="ed-copilot-panel__context-patient">
          <strong>
            {selectedPatient.firstName} {selectedPatient.lastName}
          </strong>
          {patientOrchestration?.operationalStage
            ? ` · ${patientOrchestration.operationalStage}`
            : ''}
        </p>
      ) : null}
      <section aria-label="Copilot operational awareness" className="ed-copilot-panel__awareness">
        <strong>Suggestions</strong>
        {copilotRecommendations.length ? (
          <div className="ed-copilot-panel__recommendations" aria-label="Copilot recommendations">
            {copilotRecommendations
              .slice(0, COPILOT_PLATFORM.ui.contextRecommendationPreviewLimit)
              .map((recommendation) => (
              <button
                key={recommendation.id}
                type="button"
                className="ed-copilot-panel__recommendation"
                data-domain={recommendation.domain}
                data-severity={recommendation.severity}
                title={recommendation.detail}
                onClick={() => openRecommendation(recommendation.route)}
                disabled={loading}
              >
                <span>{recommendation.domain}</span>
                <strong>{recommendation.action}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="ed-copilot-panel__recommendations-empty">No department actions flagged right now.</p>
        )}
        <div className="ed-copilot-panel__awareness-grid">
          {awarenessCards.map((card) => (
            <div key={card.label} className="ed-copilot-panel__awareness-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  const safetyContent = (
    <>
      <CopilotRiskLayerPanel
        activeLayerId="clinical_decision_support"
        patient={selectedPatient}
        compact
        className="ed-copilot-panel__risk-layers"
      />
      {aiTransparencyEnabled && selectedPatient ? (
        <AiTransparencyDashboard
          patients={[selectedPatient]}
          compact
          className="ed-copilot-panel__transparency"
        />
      ) : null}
    </>
  );

  const chatFooter = (
    <>
      <div className="ed-copilot-panel__quick-actions">
        {selectedPatient ? (
          <button
            type="button"
            onClick={() => sendQuickAction(PATIENT_STATUS_SUMMARY_PROMPT)}
            disabled={loading}
            data-copilot-quick-action="patient-status-summary"
          >
            Patient summary
          </button>
        ) : null}
        {quickActions.slice(0, quickActionLimit).map((action) => (
          <button key={action} type="button" onClick={() => sendQuickAction(action)} disabled={loading}>
            {action}
          </button>
        ))}
      </div>

      {copilotSurfaces.showOrchestrationActions &&
      selectedPatient &&
      (patientOrchestration?.prioritizedRecommendations?.length ?? 0) > 0 ? (
        <div className="ed-copilot-panel__tool-actions" role="toolbar" aria-label="Patient tool shortcuts">
          {(patientOrchestration?.prioritizedRecommendations ?? [])
            .slice(0, COPILOT_PLATFORM.ui.orchestrationActionPreviewLimit)
            .map((recommendation) => (
            <button
              key={recommendation.id}
              type="button"
              onClick={() =>
                launchOrchestrationRecommendation({
                  patientId: selectedPatient.id,
                  recommendation,
                })
              }
              disabled={loading || recommendation.completed}
              data-copilot-tool-action={recommendation.toolId}
              aria-label={`Open ${recommendation.label} for selected patient`}
            >
              {recommendation.label}
            </button>
          ))}
        </div>
      ) : null}

      {copilotSurfaces.showMultimodalInput && (attachments.length || composerStatus) ? (
        <div className="ed-copilot-panel__multimodal" aria-label="Attachment tray">
          {attachments.length ? (
            <div className="ed-copilot-panel__attachment-tray" aria-label="Attached image previews">
              {attachments.map((attachment) => (
                <article key={attachment.id}>
                  {attachment.previewUrl ? (
                    <img src={attachment.previewUrl} alt="" aria-hidden />
                  ) : null}
                  <div>
                    <strong>{attachment.name}</strong>
                    <span>
                      {attachment.type || 'image'} · {attachmentSizeLabel(attachment.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    aria-label={`Remove ${attachment.name}`}
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
          ) : null}
          <p role="status" className="ed-copilot-panel__composer-note">
            {composerStatus || 'Images add context only — not auto-interpreted.'}
          </p>
        </div>
      ) : null}

      <form onSubmit={submitMessage} className="ed-copilot-panel__composer ed-copilot-panel__composer--raised">
        {copilotSurfaces.showMultimodalInput ? (
          <div
            className="ed-copilot-panel__composer-tools"
            aria-label="CareDroid multimodal input controls"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="ed-copilot-panel__file-input"
              onChange={(event) => addImageAttachments(event.target.files)}
              aria-label="Attach clinical image"
            />
            <button
              type="button"
              className="ed-copilot-panel__icon-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || attachments.length >= MAX_COPILOT_ATTACHMENTS}
              aria-label="Attach image"
              title="Attach image"
            >
              +
            </button>
            <button
              type="button"
              className="ed-copilot-panel__icon-btn"
              onClick={startVoiceDictation}
              disabled={loading}
              data-listening={voiceListening ? 'true' : 'false'}
              aria-label={voiceListening ? 'Stop voice dictation' : 'Start voice dictation'}
              title={voiceListening ? 'Stop voice' : 'Voice dictation'}
            >
              {voiceListening ? '■' : '⌁'}
            </button>
            {!selectedPatient ? (
              <button
                type="button"
                className="ed-copilot-panel__icon-btn ed-copilot-panel__icon-btn--text"
                onClick={() => openToolAction(TOOL_ACTIONS[0])}
                disabled={loading}
                aria-label="Open medical tools"
              >
                Tools
              </button>
            ) : null}
          </div>
        ) : null}
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={copilotChrome.placeholder}
          aria-label={copilotChrome.messageAriaLabel}
        />
        <button
          type="submit"
          aria-label={copilotChrome.sendAriaLabel}
          disabled={loading || (!input.trim() && attachments.length === 0)}
        >
          <IconSend size={17} stroke={2.2} />
        </button>
      </form>
    </>
  );

  const copilotTabs = useMemo(() => {
    const tabs: Array<{ id: CopilotShellTab; label: string; badge?: number }> = [
      { id: 'chat', label: 'Chat' },
    ];
    if (copilotSurfaces.showContextTab) {
      tabs.push({
        id: 'context',
        label: 'Context',
        badge: contextBadgeCount || undefined,
      });
    }
    if (copilotSurfaces.showSafetyTab) {
      tabs.push({ id: 'safety', label: 'Safety' });
    }
    return tabs;
  }, [
    contextBadgeCount,
    copilotSurfaces.showContextTab,
    copilotSurfaces.showSafetyTab,
  ]);

  useEffect(() => {
    if (!copilotTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('chat');
    }
  }, [activeTab, copilotTabs]);

  return (
    <aside
      className={[
        'ed-copilot-panel',
        copilotSurfaces.compactLayout ? 'ed-copilot-panel--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CopilotShell
        header={copilotHeader}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={copilotTabs}
        chatContent={chatContent}
        contextContent={copilotSurfaces.showContextTab ? contextContent : null}
        safetyContent={copilotSurfaces.showSafetyTab ? safetyContent : null}
        footer={chatFooter}
      />
    </aside>
  );
}
