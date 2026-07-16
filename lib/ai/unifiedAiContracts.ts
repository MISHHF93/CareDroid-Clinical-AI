/**
 * Canonical CareDroid Unified AI Node request/response contracts.
 *
 * These envelopes are the single typed surface for direct API queries, CLI,
 * and workflow callers. They do not replace role-specific payloads inside
 * `structuredData` — they wrap them with status, safety, evidence, and audit.
 */

export const CARE_DROID_AI_CHANNELS = [
  'reception',
  'ems',
  'triage',
  'nursing',
  'physician',
  'operations',
  'administration',
  'training',
  'api',
] as const;

export type CareDroidUnifiedChannel = (typeof CARE_DROID_AI_CHANNELS)[number];

export const CARE_DROID_AI_TASKS = [
  'answer_question',
  'summarize',
  'retrieve_policy',
  'extract_document',
  'detect_missing_information',
  'suggest_next_action',
  'prepare_handoff',
  'select_calculator',
  'execute_calculator',
  'explain_alert',
  'forecast_operations',
  'create_training_scenario',
  'evaluate_simulation',
] as const;

export type CareDroidUnifiedTask = (typeof CARE_DROID_AI_TASKS)[number];

export const CARE_DROID_AI_RESPONSE_STATUSES = [
  'completed',
  'needs_human_review',
  'insufficient_evidence',
  'blocked_by_safety',
  'provider_unavailable',
  'failed',
] as const;

export type CareDroidUnifiedResponseStatus = (typeof CARE_DROID_AI_RESPONSE_STATUSES)[number];

export const CARE_DROID_AI_RESPONSE_TYPES = [
  'answer',
  'summary',
  'recommendation',
  'calculator_result',
  'workflow_plan',
  'training_scenario',
  'error',
] as const;

export type CareDroidUnifiedResponseType = (typeof CARE_DROID_AI_RESPONSE_TYPES)[number];

export interface CareDroidEvidenceReference {
  id: string;
  title?: string;
  sourceType?: string;
  url?: string;
  snippet?: string;
  score?: number;
  organizationId?: string;
}

export interface CareDroidCitationReference {
  id: string;
  label: string;
  evidenceId?: string;
  locator?: string;
}

export interface CareDroidToolExecutionRecord {
  toolName: string;
  version?: string;
  status: 'success' | 'failed' | 'skipped' | 'blocked';
  durationMs?: number;
  errorCode?: string;
  requiresHumanApproval?: boolean;
}

export interface CareDroidModelExecutionMetadata {
  provider: string;
  model: string;
  promptVersion?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  fallbackApplied?: boolean;
}

export interface CareDroidSafetyEvaluation {
  allowed: boolean;
  requiresHumanReview: boolean;
  reasons: string[];
  disclaimer: string;
  blockedActions?: string[];
}

export interface CareDroidHumanReviewReference {
  reviewItemId?: string;
  status: 'created' | 'pending' | 'unavailable';
  severity?: string;
  reviewType?: string;
}

export interface CareDroidUnifiedAIRequest {
  requestId: string;
  correlationId: string;
  organizationId: string;
  workspaceId?: string;
  facilityId?: string;
  userId: string;
  role: string;
  permissions: string[];
  channel: CareDroidUnifiedChannel;
  task: CareDroidUnifiedTask;
  patientContext?: Record<string, unknown>;
  encounterContext?: Record<string, unknown>;
  emsContext?: Record<string, unknown>;
  workflowContext?: Record<string, unknown>;
  documentContext?: Record<string, unknown>;
  query: string;
  attachments?: Array<{ id: string; mediaType?: string; label?: string }>;
  requestedTools?: string[];
  responseFormat: 'text' | 'structured' | 'stream';
  locale?: string;
}

export interface CareDroidUnifiedAIResponse {
  requestId: string;
  correlationId: string;
  status: CareDroidUnifiedResponseStatus;
  responseType: CareDroidUnifiedResponseType;
  content: string;
  structuredData?: unknown;
  evidence: CareDroidEvidenceReference[];
  citations: CareDroidCitationReference[];
  confidence?: number;
  uncertainty: string[];
  missingInformation: string[];
  limitations: string[];
  toolExecutions: CareDroidToolExecutionRecord[];
  model: CareDroidModelExecutionMetadata;
  safety: CareDroidSafetyEvaluation;
  humanReview?: CareDroidHumanReviewReference;
  createdAt: string;
}

export interface UnifiedAiRequestValidationIssue {
  field: string;
  message: string;
}

export interface UnifiedAiRequestValidationResult {
  valid: boolean;
  errors: UnifiedAiRequestValidationIssue[];
  request?: CareDroidUnifiedAIRequest;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isCareDroidUnifiedChannel(value: unknown): value is CareDroidUnifiedChannel {
  return (
    typeof value === 'string' &&
    (CARE_DROID_AI_CHANNELS as readonly string[]).includes(value)
  );
}

export function isCareDroidUnifiedTask(value: unknown): value is CareDroidUnifiedTask {
  return typeof value === 'string' && (CARE_DROID_AI_TASKS as readonly string[]).includes(value);
}

/**
 * Runtime-validate a candidate unified AI request before model/tool invocation.
 */
export function validateUnifiedAiRequest(input: unknown): UnifiedAiRequestValidationResult {
  const errors: UnifiedAiRequestValidationIssue[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'request', message: 'Request must be an object' }] };
  }

  const raw = input as Record<string, unknown>;

  const requireString = (field: string) => {
    if (!isNonEmptyString(raw[field])) {
      errors.push({ field, message: `${field} is required` });
    }
  };

  requireString('requestId');
  requireString('correlationId');
  requireString('organizationId');
  requireString('userId');
  requireString('role');
  requireString('query');

  if (!isStringArray(raw.permissions)) {
    errors.push({ field: 'permissions', message: 'permissions must be a string array' });
  }
  if (!isCareDroidUnifiedChannel(raw.channel)) {
    errors.push({
      field: 'channel',
      message: `channel must be one of: ${CARE_DROID_AI_CHANNELS.join(', ')}`,
    });
  }
  if (!isCareDroidUnifiedTask(raw.task)) {
    errors.push({
      field: 'task',
      message: `task must be one of: ${CARE_DROID_AI_TASKS.join(', ')}`,
    });
  }
  if (
    raw.responseFormat !== 'text' &&
    raw.responseFormat !== 'structured' &&
    raw.responseFormat !== 'stream'
  ) {
    errors.push({
      field: 'responseFormat',
      message: 'responseFormat must be text | structured | stream',
    });
  }

  if (typeof raw.query === 'string' && raw.query.length > 16_000) {
    errors.push({ field: 'query', message: 'query exceeds maximum length of 16000 characters' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    request: raw as unknown as CareDroidUnifiedAIRequest,
  };
}

export function buildBlockedUnifiedResponse(input: {
  requestId: string;
  correlationId: string;
  reasons: string[];
  disclaimer: string;
  content?: string;
}): CareDroidUnifiedAIResponse {
  return {
    requestId: input.requestId,
    correlationId: input.correlationId,
    status: 'blocked_by_safety',
    responseType: 'error',
    content: input.content || 'Request blocked by CareDroid AI safety policy.',
    evidence: [],
    citations: [],
    uncertainty: [],
    missingInformation: [],
    limitations: ['Safety policy blocked model and tool execution.'],
    toolExecutions: [],
    model: {
      provider: 'none',
      model: 'none',
      fallbackApplied: false,
    },
    safety: {
      allowed: false,
      requiresHumanReview: true,
      reasons: input.reasons,
      disclaimer: input.disclaimer,
    },
    createdAt: new Date().toISOString(),
  };
}

export function mapHeuristicNodeToUnifiedResponse(input: {
  requestId: string;
  correlationId: string;
  intent: string;
  status: 'success' | 'error';
  content: string;
  confidence?: number;
  requiresClinicianReview: boolean;
  model: string;
  latencyMs?: number;
  missingInformation?: string[];
  uncertainty?: string[];
  limitations?: string[];
  humanReview?: CareDroidHumanReviewReference;
}): CareDroidUnifiedAIResponse {
  const needsReview = input.requiresClinicianReview;
  return {
    requestId: input.requestId,
    correlationId: input.correlationId,
    status: input.status === 'error' ? 'failed' : needsReview ? 'needs_human_review' : 'completed',
    responseType: input.status === 'error' ? 'error' : 'recommendation',
    content: input.content,
    structuredData: { intent: input.intent },
    evidence: [],
    citations: [],
    confidence: input.confidence,
    uncertainty: input.uncertainty || [],
    missingInformation: input.missingInformation || [],
    limitations: input.limitations || [
      'Structured CareDroid AI node output is decision support only.',
    ],
    toolExecutions: [],
    model: {
      provider: 'local',
      model: input.model,
      latencyMs: input.latencyMs,
      fallbackApplied: false,
    },
    safety: {
      allowed: input.status !== 'error',
      requiresHumanReview: needsReview,
      reasons: needsReview ? ['clinician_review_required'] : [],
      disclaimer:
        'This AI output is decision support only and must be reviewed by a licensed clinician.',
    },
    humanReview: input.humanReview,
    createdAt: new Date().toISOString(),
  };
}
