/** Pure-JS fallback of unified AI contract helpers for the CLI when TS import is unavailable. */

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
];

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
];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateUnifiedAiRequest(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'request', message: 'Request must be an object' }] };
  }
  for (const field of [
    'requestId',
    'correlationId',
    'organizationId',
    'userId',
    'role',
    'query',
  ]) {
    if (!isNonEmptyString(input[field])) {
      errors.push({ field, message: `${field} is required` });
    }
  }
  if (!Array.isArray(input.permissions) || !input.permissions.every((p) => typeof p === 'string')) {
    errors.push({ field: 'permissions', message: 'permissions must be a string array' });
  }
  if (!CARE_DROID_AI_CHANNELS.includes(input.channel)) {
    errors.push({ field: 'channel', message: 'invalid channel' });
  }
  if (!CARE_DROID_AI_TASKS.includes(input.task)) {
    errors.push({ field: 'task', message: 'invalid task' });
  }
  if (!['text', 'structured', 'stream'].includes(input.responseFormat)) {
    errors.push({ field: 'responseFormat', message: 'invalid responseFormat' });
  }
  if (typeof input.query === 'string' && input.query.length > 16000) {
    errors.push({ field: 'query', message: 'query exceeds maximum length of 16000 characters' });
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [], request: input };
}

export function buildBlockedUnifiedResponse(input) {
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
    model: { provider: 'none', model: 'none', fallbackApplied: false },
    safety: {
      allowed: false,
      requiresHumanReview: true,
      reasons: input.reasons,
      disclaimer: input.disclaimer,
    },
    createdAt: new Date().toISOString(),
  };
}

export function mapHeuristicNodeToUnifiedResponse(input) {
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
