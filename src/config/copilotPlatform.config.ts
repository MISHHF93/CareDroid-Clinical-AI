/**
 * CareDroid Copilot — canonical platform configuration.
 *
 * Single registry for identity, safety, API I/O, context inputs, UI outputs,
 * quick actions, tool launches, and pilot density limits. Tune Copilot here;
 * consumers (CopilotPanel, recommendation model, chat client) read from this file.
 */
import { AI_ROUTES } from '../lib/ai/routes';
import { CAREDROID_PRODUCT } from './caredroidProduct.config';
import { CANONICAL_ROUTES } from './routes.config';
import { API_ROUTES } from './api.config';
import { EMERGENCY_OS_API_ENDPOINTS } from '../services/emergencyOsApi';
import {
  getCopilotRecommendationLimit,
  getMaxCopilotQuickActions,
  shouldForceCompactCopilotLayout,
  shouldSuppressCopilotSafetyBadge,
} from './practitionerCleanup.config';
import {
  PRACTITIONER_COPILOT_NOTES_LIMIT,
  PRACTITIONER_COPILOT_ORCHESTRATION_LIMIT,
} from './practitionerCleanup.constants';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import { COPILOT_RECOMMENDATION_DOMAIN, COPILOT_DOMAIN_PRIORITY } from './copilotRecommendationModel';

export type CopilotToolLaunchAction = Readonly<{
  id: string;
  label: string;
  eventName: 'ed:open-tools' | 'ed:open-calculator';
  detail: Readonly<Record<string, string>>;
}>;

export type CopilotContextInputKey =
  | 'emergencyStore.patients'
  | 'emergencyStore.alerts'
  | 'emergencyStore.referrals'
  | 'emergencyStore.capacity'
  | 'emergencyStore.emergencySettings'
  | 'emergencyStore.selectedPatientId'
  | 'emergencyStore.copilotMessages'
  | 'operationalIntelligence.centralSnapshot'
  | 'operationalIntelligence.snapshot'
  | 'patientOrchestration.selected'
  | 'patientAiContext.artifacts'
  | 'backend.fetchEDCopilot.promptContext'
  | 'backend.fetchEDCopilot.quickActions'
  | 'copilotRecommendations.snapshot'
  | 'queueAudit.primaryBottleneck'
  | 'whatHappensNext.guidance'
  | 'longWaitRescue.attention'
  | 'triageAssist.selectedPatient'
  | 'multimodal.attachments'
  | 'multimodal.voiceDictation';

export type CopilotOutputChannel =
  | 'chat.message.stream'
  | 'chat.message.rule'
  | 'recommendation.card'
  | 'awareness.metricChip'
  | 'workflowAction.copilot_used'
  | 'store.copilotMessages'
  | 'event.ed:open-tools'
  | 'event.ed:open-calculator'
  | 'event.ed:copilot-prefill'
  | 'navigation.profileAware'
  | 'orchestration.toolLaunch';

export const COPILOT_PLATFORM = Object.freeze({
  identity: Object.freeze({
    productName: CAREDROID_PRODUCT.name,
    name: CAREDROID_PRODUCT.copilotName,
    badge: CAREDROID_PRODUCT.copilotBadge,
    intro: CAREDROID_PRODUCT.copilotIntro,
    role: CAREDROID_PRODUCT.copilotRole,
    promptId: 'ed-copilot' as const,
    requestType: 'COPILOT_CHAT' as const,
    route: CANONICAL_ROUTES.emergencyCopilot,
    dockEvent: 'ed:copilot-prefill',
  }),

  safety: Object.freeze({
    boundedLabel: 'Staff review required',
    disclaimer: HUMAN_REVIEW_DISCLAIMER,
    boundedDisclaimer: `Staff review required — ${HUMAN_REVIEW_DISCLAIMER}`,
    safetyLine: CAREDROID_PRODUCT.safetyLine,
    notPositionedAs: CAREDROID_PRODUCT.notPositionedAs,
    multimodalBoundary:
      'Images are browser-preview metadata only until a reviewed vision model contract is connected.',
    visionModelConnected: false,
    autonomousClinicalDecisionsAllowed: false,
    requiresHumanReview: true,
  }),

  api: Object.freeze({
    chatMessage: AI_ROUTES.edCopilot,
    legacyChatMessage: '/api/chat/message',
    suggestAction: '/api/emergency/copilot/suggest-action',
    analyzeVitals: '/api/emergency/copilot/analyze-vitals',
    devSession: API_ROUTES.auth.devSession,
    runtimeContext: EMERGENCY_OS_API_ENDPOINTS.copilot,
    backendCapability: 'emergencyCopilotRuntime' as const,
    healthProbe: '/health',
  }),

  inputs: Object.freeze({
    /** Context keys assembled into the department system prompt and AI request body. */
    contextSources: Object.freeze([
      'emergencyStore.patients',
      'emergencyStore.alerts',
      'emergencyStore.referrals',
      'emergencyStore.capacity',
      'emergencyStore.emergencySettings',
      'emergencyStore.selectedPatientId',
      'operationalIntelligence.centralSnapshot',
      'operationalIntelligence.snapshot',
      'patientOrchestration.selected',
      'patientAiContext.artifacts',
      'backend.fetchEDCopilot.promptContext',
      'copilotRecommendations.snapshot',
      'queueAudit.primaryBottleneck',
      'whatHappensNext.guidance',
      'longWaitRescue.attention',
      'triageAssist.selectedPatient',
    ] satisfies CopilotContextInputKey[]),

    multimodal: Object.freeze({
      enabledInputs: ['text', 'image-metadata', 'voice-dictation'] as const,
      maxAttachments: 3,
      maxAttachmentBytes: 8 * 1024 * 1024,
      acceptedMimePrefix: 'image/',
      voiceLang: 'en-US',
    }),

    inboundEvents: Object.freeze({
      prefill: 'ed:copilot-prefill',
      openTools: 'ed:open-tools',
      openCalculator: 'ed:open-calculator',
      openPatientDetail: 'ed:open-patient-detail',
    }),
  }),

  outputs: Object.freeze({
    channels: Object.freeze([
      'chat.message.stream',
      'chat.message.rule',
      'recommendation.card',
      'awareness.metricChip',
      'workflowAction.copilot_used',
      'store.copilotMessages',
      'event.ed:open-tools',
      'event.ed:open-calculator',
      'navigation.profileAware',
      'orchestration.toolLaunch',
    ] satisfies CopilotOutputChannel[]),

    workflowActionType: 'copilot_used' as const,
    workflowSource: 'ed-copilot-panel' as const,

    recommendationDomains: COPILOT_DOMAIN_PRIORITY,
    recommendationDomainIds: COPILOT_RECOMMENDATION_DOMAIN,

    navigationRoutes: Object.freeze({
      queues: '/emergency/queues',
      capacity: '/emergency/capacity',
      boarding: '/emergency/capacity?view=boarding',
      reassessment: '/emergency/reassessment',
      whiteboard: '/emergency/whiteboard',
      ems: '/emergency/ems',
      toolsHub: CANONICAL_ROUTES.emergencyTools,
      receptionCalculators: `${CANONICAL_ROUTES.emergencyReception}?tools=calculators`,
    }),
  }),

  quickActions: Object.freeze({
    operational: Object.freeze([
      'Queue bottlenecks',
      'Capacity status',
      'Boarding pressure',
      'Reassessment queue',
    ]),
    patient: Object.freeze([
      "Summarize this patient's current status based on the provided data.",
      'Recommend clinical tools for this case',
      'What reassessment or escalation signals should I review?',
    ]),
    patientSummaryLabel: 'Patient summary',
  }),

  toolActions: Object.freeze([
    {
      id: 'medical-tools',
      label: 'Medical tools',
      eventName: 'ed:open-tools',
      detail: { source: 'copilot', filter: 'all' },
    },
    {
      id: 'calculator-hub',
      label: 'Calculators',
      eventName: 'ed:open-tools',
      detail: { source: 'calculators', filter: 'calculator' },
    },
    {
      id: 'qsofa-calculator',
      label: 'qSOFA',
      eventName: 'ed:open-calculator',
      detail: { calculatorId: 'qsofa' },
    },
  ] satisfies CopilotToolLaunchAction[]),

  ui: Object.freeze({
    shellTabs: Object.freeze(['chat', 'context', 'safety'] as const),
    chatOnlyClass: 'ed-copilot-shell--chat-only',
    compactClass: 'ed-copilot-panel--compact',
    awarenessCardLimit: 4,
    contextRecommendationPreviewLimit: 4,
    orchestrationActionPreviewLimit: 3,
  }),

  prompts: Object.freeze({
    styleRules: Object.freeze([
      'Keep answers brief, operationally useful, and explicit about uncertainty.',
      'Do not repeat generic advice. Every suggestion must name a queue, count, route, or filter.',
    ]),
    fallbackUnavailable:
      'CareDroid Copilot unavailable - check connection. Continue clinical review with human oversight.',
    backendContextDegraded: 'Using local board data — live Copilot context is temporarily unavailable.',
  }),
} as const);

export type CopilotRuntimeLimits = Readonly<{
  maxRecommendations: number;
  maxQuickActions: number;
  maxOrchestrationActions: number;
  maxRecentNotes: number;
  compactLayout: boolean;
  showSafetyBadge: boolean;
}>;

export function resolveCopilotRuntimeLimits(): CopilotRuntimeLimits {
  return Object.freeze({
    maxRecommendations: getCopilotRecommendationLimit(),
    maxQuickActions: getMaxCopilotQuickActions(),
    maxOrchestrationActions: PRACTITIONER_COPILOT_ORCHESTRATION_LIMIT,
    maxRecentNotes: PRACTITIONER_COPILOT_NOTES_LIMIT,
    compactLayout: shouldForceCompactCopilotLayout(),
    showSafetyBadge: !shouldSuppressCopilotSafetyBadge(),
  });
}

export function getCopilotOperationalQuickActions(): readonly string[] {
  return COPILOT_PLATFORM.quickActions.operational;
}

export function getCopilotPatientQuickActions(): readonly string[] {
  return COPILOT_PLATFORM.quickActions.patient;
}

export function getCopilotToolLaunchActions(): readonly CopilotToolLaunchAction[] {
  return COPILOT_PLATFORM.toolActions as unknown as readonly CopilotToolLaunchAction[];
}

export function getCopilotWelcomeMessage(compactLayout: boolean): string {
  if (compactLayout) {
    return `Ask about patients, queues, or capacity. ${COPILOT_PLATFORM.safety.disclaimer}`;
  }
  return `${COPILOT_PLATFORM.identity.name} is ready. Ask about patients, queues, capacity, or boarding.`;
}

/** Machine-readable I/O contract for audits, user manual, and integration tests. */
export function describeCopilotPlatformContract() {
  const limits = resolveCopilotRuntimeLimits();
  return Object.freeze({
    identity: { ...COPILOT_PLATFORM.identity },
    safety: { ...COPILOT_PLATFORM.safety },
    api: { ...COPILOT_PLATFORM.api },
    inputs: {
      contextSourceCount: COPILOT_PLATFORM.inputs.contextSources.length,
      contextSources: [...COPILOT_PLATFORM.inputs.contextSources],
      multimodal: { ...COPILOT_PLATFORM.inputs.multimodal },
      inboundEvents: { ...COPILOT_PLATFORM.inputs.inboundEvents },
    },
    outputs: {
      channelCount: COPILOT_PLATFORM.outputs.channels.length,
      channels: [...COPILOT_PLATFORM.outputs.channels],
      navigationRoutes: { ...COPILOT_PLATFORM.outputs.navigationRoutes },
      recommendationDomains: [...COPILOT_PLATFORM.outputs.recommendationDomains],
    },
    quickActions: {
      operational: [...COPILOT_PLATFORM.quickActions.operational],
      patient: [...COPILOT_PLATFORM.quickActions.patient],
    },
    toolActions: COPILOT_PLATFORM.toolActions.map((action) => ({ ...action })),
    limits,
    ui: { ...COPILOT_PLATFORM.ui },
  });
}