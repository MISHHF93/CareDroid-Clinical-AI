/**
 * Interactive AI orchestrator — end-to-end assist path for Reception / EMS
 * through the Unified AI Node with progress states, context assembly, and
 * action proposals. Never auto-executes high-risk clinical actions.
 */

import { createClientIds } from '../unifiedAiEnvelope';
import { resolveUnifiedChannelFromRole } from '../unifiedAiEnvelope';
import { invokeUnifiedAiConversational } from '../careDroidUnifiedAiNode';
import { assembleInteractiveContext, describeContextForPrompt } from './contextAssembler';
import { createStreamProgressController, runDefaultStreamProgress } from './streamProgress';
import { createActionProposal, type CreateActionProposalInput } from './actionProposalService';
import { getSuggestedPrompts, type SuggestedPromptContext } from './suggestedPrompts';
import { buildWorkflowAiCard, type WorkflowTriggerEvent } from './workflowAiCards';
import { reviewAIRequestForSafety } from '../../../lib/ai/safetyPolicy';
import type {
  AIActionProposal,
  InteractiveSession,
  StreamProgressEvent,
  SuggestedPrompt,
  WorkflowAiCard,
  AiStreamState,
} from '../../contracts/interactiveAi';
import type { AccountableRecommendation } from '../../contracts/accountableAi';
import { accountableFromGatewayPayload } from '../../utils/accountableFromGateway';

export type InteractiveAssistRequest = {
  query: string;
  role: string;
  permissions?: string[];
  organizationId?: string;
  userId?: string;
  patientId?: string;
  pageId?: string;
  channel?: string;
  purpose?: string;
  contextItems?: Parameters<typeof assembleInteractiveContext>[0]['requested'];
  signal?: AbortSignal;
  onProgress?: (event: StreamProgressEvent) => void;
};

export type InteractiveAssistResult = {
  requestId: string;
  correlationId: string;
  session: InteractiveSession;
  progress: StreamProgressEvent[];
  finalState: AiStreamState;
  content: string;
  accountable: AccountableRecommendation;
  suggestedPrompts: SuggestedPrompt[];
  proposal?: AIActionProposal;
  cancelled: boolean;
};

export async function runInteractiveAssist(
  input: InteractiveAssistRequest,
): Promise<InteractiveAssistResult> {
  const ids = createClientIds();
  const channel =
    input.channel || resolveUnifiedChannelFromRole(input.role, 'api');
  const controller = createStreamProgressController({
    requestId: ids.requestId,
    correlationId: ids.correlationId,
  });
  if (input.onProgress) {
    controller.subscribe(input.onProgress);
  }

  const safety = reviewAIRequestForSafety({
    prompt: input.query,
    patientSpecific: Boolean(input.patientId),
  });
  if (!safety.allowed) {
    controller.advance('blocked', safety.reasons.join('; ') || 'Blocked by safety policy');
    const accountable = accountableFromGatewayPayload({
      content: 'Request blocked by CareDroid AI safety policy.',
      safety: { status: 'escalate', reasons: safety.reasons },
      humanReviewRequired: true,
    });
    return {
      requestId: ids.requestId,
      correlationId: ids.correlationId,
      session: {
        sessionId: `blocked-${ids.requestId}`,
        scope: {
          tenantId: input.organizationId || 'unknown-org',
          role: input.role,
          channel,
          purpose: input.purpose || 'interactive_assist',
          patientId: input.patientId,
          organizationId: input.organizationId,
        },
        attachedContext: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed',
      },
      progress: controller.getHistory(),
      finalState: 'blocked',
      content: accountable.content,
      accountable,
      suggestedPrompts: [],
      cancelled: false,
    };
  }

  const assembled = assembleInteractiveContext({
    scope: {
      tenantId: input.organizationId || 'unknown-org',
      organizationId: input.organizationId,
      role: input.role,
      channel,
      purpose: input.purpose || 'interactive_assist',
      patientId: input.patientId,
    },
    requested: input.contextItems || [],
    userPermissions: input.permissions || ['use_ai_chat', 'view_phi', 'view_operations'],
  });

  if (input.signal?.aborted) {
    controller.cancel();
    return buildCancelledResult(ids, assembled.session, controller);
  }

  await runDefaultStreamProgress(controller, {
    validating_request: async () => {
      if (input.signal?.aborted) controller.cancel();
    },
    retrieving_evidence: async () => {
      if (input.signal?.aborted) controller.cancel();
    },
    checking_safety: async () => {
      if (input.signal?.aborted) controller.cancel();
    },
  });

  if (controller.getState() === 'cancelled' || input.signal?.aborted) {
    return buildCancelledResult(ids, assembled.session, controller);
  }

  controller.advance('preparing_response', 'Calling unified AI node…', 80);

  const contextBlock = describeContextForPrompt(assembled.session);
  const systemPrompt = [
    'You are CareDroid Interactive Intelligence — a workflow assistant.',
    'Decision support only. Never diagnose, prescribe, or execute high-risk clinical actions.',
    'Human review is required before any clinical action.',
    'Attached context (with provenance kinds):',
    contextBlock,
  ].join('\n');

  try {
    const response = await invokeUnifiedAiConversational({
      capabilityId: 'copilot',
      platformServiceId: 'copilot',
      requestType: 'COPILOT_CHAT',
      systemPrompt,
      message: input.query,
      messages: [{ role: 'user', content: input.query }],
      patientId: input.patientId,
      sourceScreen: `interactive_${channel}`,
      context: {
        userRole: input.role,
        unifiedChannel: channel,
        interactiveSessionId: assembled.session.sessionId,
        unifiedAiRequest: {
          requestId: ids.requestId,
          correlationId: ids.correlationId,
          channel,
          task: 'answer_question',
        },
      },
    });

    if (input.signal?.aborted) {
      controller.cancel();
      return buildCancelledResult(ids, assembled.session, controller);
    }

    if (!response.ok) {
      controller.fail(`Unified AI node returned status ${response.status}`);
      const accountable = accountableFromGatewayPayload(response.data ?? response, '');
      return {
        requestId: ids.requestId,
        correlationId: ids.correlationId,
        session: assembled.session,
        progress: controller.getHistory(),
        finalState: 'failed',
        content: accountable.content || 'Assist request failed.',
        accountable,
        suggestedPrompts: buildPrompts(channel, input),
        cancelled: false,
      };
    }

    const content =
      typeof response.content === 'string'
        ? response.content
        : String((response.data as Record<string, unknown>)?.response || '');
    const accountable = accountableFromGatewayPayload(response.data ?? response, content);
    controller.complete('Assist response ready for review');

    let proposal: AIActionProposal | undefined;
    if (shouldOfferFollowUpProposal(input.query, channel)) {
      proposal = createActionProposal(buildFollowUpProposal(ids, input, channel, accountable));
      controller.advance(
        'awaiting_human_approval',
        'Optional follow-up action proposed — human approval required',
        100,
      );
    }

    return {
      requestId: ids.requestId,
      correlationId: ids.correlationId,
      session: assembled.session,
      progress: controller.getHistory(),
      finalState: controller.getState(),
      content: accountable.content || content,
      accountable,
      suggestedPrompts: buildPrompts(channel, input),
      proposal,
      cancelled: false,
    };
  } catch (error) {
    if (input.signal?.aborted) {
      controller.cancel();
      return buildCancelledResult(ids, assembled.session, controller);
    }
    const message = error instanceof Error ? error.message : String(error);
    controller.fail(message);
    const accountable = accountableFromGatewayPayload(
      { content: `Assist unavailable: ${message}`, safety: { status: 'degraded', reasons: [message] } },
      message,
    );
    return {
      requestId: ids.requestId,
      correlationId: ids.correlationId,
      session: assembled.session,
      progress: controller.getHistory(),
      finalState: 'failed',
      content: accountable.content,
      accountable,
      suggestedPrompts: buildPrompts(channel, input),
      cancelled: false,
    };
  }
}

export function triggerWorkflowCard(event: WorkflowTriggerEvent): WorkflowAiCard | null {
  return buildWorkflowAiCard(event);
}

function buildPrompts(
  channel: string,
  input: InteractiveAssistRequest,
): SuggestedPrompt[] {
  const ctx: SuggestedPromptContext = {
    channel,
    role: input.role,
    pageId: input.pageId,
    hasPatient: Boolean(input.patientId),
    hasEmsArrival: channel === 'ems',
    hasOcrJob: input.contextItems?.some((c) => c.kind === 'ocr_extraction'),
    missingRegistrationFields:
      channel === 'reception' ? ['insurance', 'next_of_kin'] : undefined,
  };
  return getSuggestedPrompts(ctx);
}

function shouldOfferFollowUpProposal(query: string, channel: string): boolean {
  const q = query.toLowerCase();
  if (channel === 'reception' && (q.includes('missing') || q.includes('handoff'))) return true;
  if (channel === 'ems' && (q.includes('prepare') || q.includes('handoff') || q.includes('eta')))
    return true;
  return false;
}

function buildFollowUpProposal(
  ids: { requestId: string; correlationId: string },
  input: InteractiveAssistRequest,
  channel: string,
  accountable: AccountableRecommendation,
): CreateActionProposalInput {
  const isEms = channel === 'ems';
  return {
    originatingRequestId: ids.requestId,
    correlationId: ids.correlationId,
    patientId: input.patientId,
    toolName: isEms ? 'prepare_ems_handoff_draft' : 'prepare_triage_handoff_draft',
    validatedArguments: {
      patientId: input.patientId || null,
      channel,
      draftFrom: accountable.content.slice(0, 500),
    },
    expectedEffect: isEms
      ? 'Create a draft EMS→ED handoff note for clinician review (does not write to chart).'
      : 'Create a draft registration→triage handoff note for clinician review (does not write to chart).',
    riskLevel: 'moderate',
    requiredPermission: 'use_ai_chat',
    requiresApproval: true,
    model: accountable.model.name,
    promptVersion: accountable.promptVersion,
    previewSummary: isEms
      ? 'Preview: draft EMS handoff note only — no chart write, no diversion, no orders.'
      : 'Preview: draft triage handoff note only — no chart write, no triage assignment.',
    dataWillChange: ['draft_handoff_note (ephemeral until approved)'],
    rollbackCapable: true,
    reversibleWindowMs: 15 * 60 * 1000,
    evidence: accountable.evidence.map((e) => ({
      id: e.sourceId,
      title: e.title || e.citation,
      score: e.score,
    })),
    ownerRole: input.role,
    ownerUserId: input.userId,
  };
}

function buildCancelledResult(
  ids: { requestId: string; correlationId: string },
  session: InteractiveSession,
  controller: ReturnType<typeof createStreamProgressController>,
): InteractiveAssistResult {
  return {
    requestId: ids.requestId,
    correlationId: ids.correlationId,
    session,
    progress: controller.getHistory(),
    finalState: 'cancelled',
    content: 'Assist request cancelled.',
    accountable: accountableFromGatewayPayload({
      content: 'Assist request cancelled.',
      safety: { status: 'ok', reasons: ['cancelled_by_user'] },
      humanReviewRequired: false,
    }),
    suggestedPrompts: [],
    cancelled: true,
  };
}
