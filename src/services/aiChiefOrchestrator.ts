/**
 * AI Chief orchestrator — canonical entry point for all CareDroid AI requests.
 *
 * Routes structured intents (intake, triage, alerts, routing, summaries, bottlenecks,
 * handoffs, operational awareness) through CareDroidAI with enrichment and alert routing.
 * Routes conversational copilot/chat requests through the unified AI client.
 * Every request is audited; every structured response requires clinician review.
 *
 * Continuous operational monitoring (patient flow, capacity, staffing, bottlenecks,
 * alerts, service health, EMS, prioritization) lives in aiChiefContinuousMonitoringService
 * and is consumed through useAiChiefOrchestrator.
 */

import {
  buildAIAuditEvent,
  logAIAuditEvent,
  previewAIText,
  type AIAuditEvent,
} from '../../lib/ai/auditLogger';
import type {
  CareDroidAIContext,
  CareDroidAIIntent,
  CareDroidAIRequest,
  CareDroidAIResponse,
} from '../../lib/ai/careDroidAI';
import {
  callAI,
  UNIFIED_AI_MODEL,
  type AIRequest,
  type AIRequestType,
  type AIResponse,
} from '../lib/ai/client';
import {
  type AlertScenario,
  type AiRecommendationRoute,
  getCanonicalAiRecommendationRoute,
} from '../lib/users/aiChiefRouting';
import type { CareDroidUserProfile } from '../lib/users/userTypes';
import {
  buildBottleneckRegistrySnapshot,
  type BottleneckRegistrySnapshot,
} from './bottleneckRegistry';
import { buildUnifiedAiNodeContext } from '../config/careDroidUnifiedAiNode.config';
import { transportCareDroidAINode } from './careDroidAiApi';

export const AI_CHIEF_ORCHESTRATOR_VERSION = '2026.06.30';

export type AIChiefDomain =
  | 'intake'
  | 'triage'
  | 'alerts'
  | 'routing'
  | 'summaries'
  | 'bottlenecks'
  | 'handoffs'
  | 'operational_awareness'
  | 'copilot_chat';

export type AIChiefStructuredRequest = CareDroidAIRequest & {
  alertScenario?: AlertScenario;
  profile?: CareDroidUserProfile | null;
  bottleneckSnapshot?: BottleneckRegistrySnapshot;
  skipEnrichment?: boolean;
};

export type AIChiefConversationalRequest = AIRequest & {
  domain?: AIChiefDomain;
  profile?: CareDroidUserProfile | null;
  sourceScreen?: string;
};

export type AIChiefCopilotQueryOptions = {
  userRole?: string;
  patientId?: string;
  context?: Record<string, unknown>;
  profile?: CareDroidUserProfile | null;
  sourceScreen?: string;
};

export type AIChiefCopilotQueryResult = {
  id: string;
  query: string;
  response: string;
  safetyStatus: 'unknown' | 'unsafe';
  createdAt: string;
  raw: Record<string, unknown>;
};

const INTENT_DOMAIN: Record<CareDroidAIIntent, AIChiefDomain> = {
  patient_intake_assist: 'intake',
  triage_recommendation: 'triage',
  critical_alert_assessment: 'alerts',
  escalation_recommendation: 'alerts',
  emergency_call_risk_summary: 'alerts',
  ems_prearrival_risk_summary: 'alerts',
  department_routing: 'routing',
  staff_resource_insight: 'routing',
  wait_time_prediction: 'routing',
  patient_summary: 'summaries',
  handoff_summary: 'handoffs',
  three_minute_response_plan: 'alerts',
  three_minute_risk_projection: 'bottlenecks',
  service_bottleneck_analysis: 'bottlenecks',
  workflow_delay_analysis: 'bottlenecks',
  operational_root_cause_summary: 'bottlenecks',
  hospital_command_insight: 'operational_awareness',
  fallback_recommendation: 'operational_awareness',
};

const BOTTLENECK_ENRICHED_INTENTS = new Set<CareDroidAIIntent>([
  'service_bottleneck_analysis',
  'three_minute_risk_projection',
  'workflow_delay_analysis',
  'operational_root_cause_summary',
  'hospital_command_insight',
  'department_routing',
  'escalation_recommendation',
]);

const ALERT_SCENARIO_TERMS: ReadonlyArray<{ scenario: AlertScenario; terms: string[] }> = [
  { scenario: 'critical_chest_pain', terms: ['chest pain', 'cardiac', 'mi', 'myocardial'] },
  {
    scenario: 'stroke_alert',
    terms: ['stroke', 'facial droop', 'slurred speech', 'one-sided weakness'],
  },
  { scenario: 'sepsis_alert', terms: ['sepsis', 'septic', 'fever', 'infection'] },
  { scenario: 'pediatric_emergency', terms: ['pediatric', 'infant', 'child', 'neonate'] },
  { scenario: 'trauma_activation', terms: ['trauma', 'major trauma', 'mvc', 'gunshot', 'stab'] },
  {
    scenario: 'mental_health_crisis',
    terms: ['suicidal', 'self harm', 'psychosis', 'behavioral crisis'],
  },
  {
    scenario: 'medication_interaction',
    terms: ['medication interaction', 'drug interaction', 'polypharmacy'],
  },
  { scenario: 'lab_critical_value', terms: ['critical lab', 'critical value', 'critical result'] },
  {
    scenario: 'bed_capacity_breach',
    terms: ['bed capacity', 'boarding', 'capacity breach', 'no beds'],
  },
  {
    scenario: 'triage_breach',
    terms: ['triage breach', 'three minute', '3-minute', 'wait breach'],
  },
  { scenario: 'ems_incoming', terms: ['ems inbound', 'ems incoming', 'pre-arrival', 'prearrival'] },
  {
    scenario: 'security_incident',
    terms: ['security', 'violence', 'weapon', 'aggressive patient'],
  },
];

export function resolveAIChiefDomain(intent: CareDroidAIIntent): AIChiefDomain {
  return INTENT_DOMAIN[intent] || 'operational_awareness';
}

export function inferAlertScenario(
  input: Record<string, unknown> = {},
  intent?: CareDroidAIIntent,
): AlertScenario | undefined {
  if (intent === 'ems_prearrival_risk_summary') return 'ems_incoming';
  if (intent === 'three_minute_response_plan' || intent === 'three_minute_risk_projection') {
    return 'triage_breach';
  }
  if (intent === 'service_bottleneck_analysis' || intent === 'operational_root_cause_summary') {
    return 'bed_capacity_breach';
  }

  const haystack = [
    input.chiefComplaint,
    input.complaint,
    input.alertSource,
    input.alertTitle,
    input.symptoms,
    input.redFlags,
    input.category,
    input.scenario,
  ]
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!haystack.trim()) return undefined;

  for (const entry of ALERT_SCENARIO_TERMS) {
    if (entry.terms.some((term) => haystack.includes(term))) {
      return entry.scenario;
    }
  }
  return undefined;
}

export function enrichStructuredRequest(
  request: AIChiefStructuredRequest,
  options: { bottleneckSnapshot?: BottleneckRegistrySnapshot } = {},
): CareDroidAIRequest {
  if (request.skipEnrichment) {
    return {
      intent: request.intent,
      input: request.input,
      context: request.context,
    };
  }

  const snapshot =
    request.bottleneckSnapshot ||
    options.bottleneckSnapshot ||
    (BOTTLENECK_ENRICHED_INTENTS.has(request.intent)
      ? buildBottleneckRegistrySnapshot()
      : undefined);

  const enrichedInput: Record<string, unknown> = { ...request.input };

  if (snapshot && BOTTLENECK_ENRICHED_INTENTS.has(request.intent)) {
    enrichedInput.activeBottlenecks = snapshot.activeBottlenecks;
    enrichedInput.serviceHealth = snapshot.serviceHealth;
    enrichedInput.threeMinuteRiskProjection = snapshot.threeMinuteRiskProjection;
    enrichedInput.rootCauseSummary = snapshot.rootCauseSummary;
    enrichedInput.bottleneckAnalytics = snapshot.analytics;
  }

  const context = buildUnifiedAiNodeContext({
    ...(request.context || {}),
    orchestratorVersion: AI_CHIEF_ORCHESTRATOR_VERSION,
    domain: resolveAIChiefDomain(request.intent),
    sourceScreen: request.context?.sourceScreen || 'ai_chief_orchestrator',
    capabilityId: request.intent,
    ...(snapshot
      ? {
          bottleneckRegistry: {
            generatedAt: snapshot.generatedAt,
            activeCount: snapshot.analytics.activeCount,
            criticalCount: snapshot.analytics.criticalCount,
            threeMinuteRiskStatus: snapshot.threeMinuteRiskProjection.status,
          },
        }
      : {}),
  }) as CareDroidAIContext;

  return {
    intent: request.intent,
    input: enrichedInput,
    context,
  };
}

export function applyAlertRoutingToResponse(
  response: CareDroidAIResponse,
  scenario: AlertScenario | undefined,
  profile?: CareDroidUserProfile | null,
): CareDroidAIResponse {
  if (!scenario) return response;

  const route = getCanonicalAiRecommendationRoute(scenario, profile);
  return {
    ...response,
    visibleToRoles: response.visibleToRoles?.length
      ? response.visibleToRoles
      : [...route.visibleToRoles],
    escalationRole: response.escalationRole || route.escalationRole,
    suggestedOwnerRole: response.suggestedOwnerRole || route.suggestedOwnerRole,
    assignedRole: response.assignedRole || route.suggestedOwnerRole,
    requiresClinicianReview: route.requiresClinicianReview || response.requiresClinicianReview,
    clinicianOverrideAvailable:
      route.clinicianOverrideAvailable ?? response.clinicianOverrideAvailable,
  };
}

function auditStructuredInteraction(
  request: CareDroidAIRequest,
  response: CareDroidAIResponse,
  route?: AiRecommendationRoute,
): void {
  const event = buildAIAuditEvent({
    userId: String(request.context?.tenant?.userId || request.context?.userRole || 'unknown'),
    tenantId: String(
      request.context?.tenant?.organizationId || request.context?.organizationId || 'care-droid',
    ),
    module: 'ai_chief_orchestrator',
    action: `structured:${request.intent}`,
    patientId: readPatientId(request.input),
    purpose: 'CareDroid AI Chief structured decision support; clinician review required',
    result: response.status === 'success' ? 'success' : 'error',
    requestType: request.intent,
    inputPreview: previewAIText(request.input),
    outputPreview: previewAIText(response.data),
    model: response.provenance?.modelOrEngine,
    safety: {
      requiresHumanReview: response.requiresClinicianReview,
      blocked: response.status === 'error',
      reasons: response.warnings,
    },
  });
  logAIAuditEvent({
    ...event,
    ...(route
      ? {
          outputPreview: previewAIText({
            ...response.data,
            routing: {
              scenario: route.suggestedOwnerRole,
              escalationRole: route.escalationRole,
            },
          }),
        }
      : {}),
  } as AIAuditEvent);
}

function auditConversationalInteraction(
  request: AIChiefConversationalRequest,
  response: AIResponse,
  error?: string,
): void {
  const event = buildAIAuditEvent({
    userId: String(
      request.profile?.id ||
        (isRecord(request.context) ? request.context.userRole : undefined) ||
        'unknown',
    ),
    tenantId: String(request.profile?.organizationId || 'care-droid'),
    module: 'ai_chief_orchestrator',
    action: `conversational:${request.requestType}`,
    patientId: request.patientId,
    encounterId: request.encounterId,
    purpose: 'CareDroid AI Chief conversational decision support; clinician review required',
    result: error ? 'error' : response.ok ? 'success' : 'error',
    error,
    requestType: request.requestType,
    inputPreview: previewAIText(request.message || request.messages),
    outputPreview: previewAIText(
      typeof response.content === 'string' ? response.content : response.data,
    ),
    model: UNIFIED_AI_MODEL,
    safety: {
      requiresHumanReview: true,
      blocked: false,
      reasons: ['Conversational AI output requires licensed clinician review before action.'],
    },
  });
  logAIAuditEvent(event);
}

function readPatientId(input: Record<string, unknown>): string | undefined {
  const candidate = input.patientId || input.patient_id || input.id;
  return typeof candidate === 'string' && candidate.trim() ? candidate : undefined;
}

export async function requestAiChiefStructured(
  request: AIChiefStructuredRequest,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<CareDroidAIResponse> {
  const { withWorkflowTrace } = await import('./observabilityTrace');
  return withWorkflowTrace(
    'ai-chief-request',
    {
      source: 'aiChiefOrchestrator',
      patientId: readPatientId(request.input as Record<string, unknown>),
      summary: `AI Chief structured request (${request.intent || 'general'})`,
      metadata: { intent: request.intent },
    },
    async () => {
      const prepared = enrichStructuredRequest(request);
      const scenario = request.alertScenario || inferAlertScenario(prepared.input, prepared.intent);
      const route = scenario
        ? getCanonicalAiRecommendationRoute(scenario, request.profile)
        : undefined;

      const response = await transportCareDroidAINode(prepared, options);
      const routed = applyAlertRoutingToResponse(response, scenario, request.profile);
      auditStructuredInteraction(prepared, routed, route);
      return routed;
    },
  );
}

export async function requestAiChiefConversational(
  request: AIChiefConversationalRequest,
  runtime?: Parameters<typeof callAI>[1],
): Promise<AIResponse> {
  const { withWorkflowTrace } = await import('./observabilityTrace');
  return withWorkflowTrace(
    'ai-chief-request',
    {
      source: 'aiChiefOrchestrator',
      patientId: request.patientId,
      summary: `AI Chief conversational request (${request.requestType})`,
      metadata: { requestType: request.requestType },
    },
    async () => {
      const domain = request.domain || conversationalDomain(request.requestType);
      const enriched: AIRequest = {
        ...request,
        context: buildUnifiedAiNodeContext({
          ...(isRecord(request.context) ? request.context : {}),
          aiChief: {
            orchestratorVersion: AI_CHIEF_ORCHESTRATOR_VERSION,
            domain,
            sourceScreen: request.sourceScreen || 'ai_chief_orchestrator',
          },
        }),
      };

      try {
        const response = await callAI(enriched, runtime);
        auditConversationalInteraction(request, response);
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        auditConversationalInteraction(
          request,
          {
            ok: false,
            status: 0,
            content: '',
            data: {},
            toolCalls: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              cacheReadInputTokens: 0,
              cacheCreationInputTokens: 0,
            },
            requestType: request.requestType,
          },
          message,
        );
        throw error;
      }
    },
  );
}

function conversationalDomain(requestType: AIRequestType): AIChiefDomain {
  if (requestType === 'HANDOFF_BRIEF') return 'handoffs';
  if (requestType === 'INTAKE_SUGGESTION' || requestType === 'INTAKE_SUGGEST') return 'intake';
  if (requestType === 'TRIAGE_ASSIST') return 'triage';
  if (requestType === 'CLINICAL_SUMMARY') return 'summaries';
  if (
    requestType === 'SHIFT_SUMMARY' ||
    requestType === 'CAPACITY_CRISIS' ||
    requestType === 'STAFF_BALANCE'
  ) {
    return 'operational_awareness';
  }
  return 'copilot_chat';
}

export async function requestAiChiefCopilotQuery(
  query: string,
  options: AIChiefCopilotQueryOptions = {},
): Promise<AIChiefCopilotQueryResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery) throw new Error('Copilot query is required.');

  const response = await requestAiChiefConversational({
    requestType: 'COPILOT_CHAT',
    systemPrompt: '',
    message: cleanQuery,
    messages: [{ role: 'user', content: cleanQuery }],
    patientId: options.patientId,
    sourceScreen: options.sourceScreen || 'copilot_query',
    profile: options.profile,
    context: {
      ...(options.context || {}),
      userRole: options.userRole,
      edCopilot: {
        enabled: true,
        querySource: 'ai_chief_orchestrator',
      },
    },
  });

  if (!response?.ok) {
    throw new Error(`AI Chief copilot query failed with status ${response?.status ?? 'unknown'}`);
  }

  const responseText =
    typeof response.content === 'string'
      ? response.content
      : String(response.data?.response || response.data?.message || response.data?.content || '');

  return {
    id: `ai-chief-${Date.now()}`,
    query: cleanQuery,
    response: responseText || 'AI Chief returned no response text.',
    safetyStatus: 'unknown',
    createdAt: new Date().toISOString(),
    raw: isRecord(response.data) ? response.data : { content: responseText },
  };
}

export async function requestAiChiefHandoffBrief(request: AIRequest): Promise<AIResponse> {
  return requestAiChiefConversational({
    ...request,
    requestType: 'HANDOFF_BRIEF',
    domain: 'handoffs',
    sourceScreen: 'handoff_brief_generator',
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
