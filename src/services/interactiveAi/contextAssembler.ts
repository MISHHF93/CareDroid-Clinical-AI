/**
 * Role-aware context assembler — only attaches permitted context, labels
 * provenance kinds, and prevents silent cross-patient attachment.
 */

import type {
  InteractiveContextItem,
  InteractiveSession,
  InteractiveSessionScope,
  InteractiveContextKind,
} from '../../contracts/interactiveAi';

export type ContextAssemblerInput = {
  scope: InteractiveSessionScope;
  requested: Array<{
    id: string;
    kind: InteractiveContextKind;
    label: string;
    summary: string;
    sourceId?: string;
    version?: string;
    confidence?: number;
    patientId?: string;
    encounterId?: string;
    expiresAt?: string;
    requiredPermission?: string;
  }>;
  userPermissions: string[];
  /** When true, attaching a different patientId than session scope requires confirm */
  allowPatientSwitch?: boolean;
  confirmedPatientSwitch?: boolean;
};

export type ContextAssemblerResult = {
  session: InteractiveSession;
  attached: InteractiveContextItem[];
  rejected: Array<{ id: string; reason: string }>;
  requiresPatientSwitchConfirmation: boolean;
};

function createSessionId(): string {
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const KIND_DEFAULT_PERMISSION: Partial<Record<InteractiveContextKind, string>> = {
  confirmed_patient_fact: 'view_phi',
  user_entered_draft: 'use_ai_chat',
  ocr_extraction: 'view_phi',
  retrieved_evidence: 'use_ai_chat',
  prediction: 'use_ai_chat',
  generated_language: 'use_ai_chat',
  operational_metric: 'view_operations',
  workflow_rule: 'use_ai_chat',
};

export function assembleInteractiveContext(input: ContextAssemblerInput): ContextAssemblerResult {
  const now = new Date().toISOString();
  const attached: InteractiveContextItem[] = [];
  const rejected: Array<{ id: string; reason: string }> = [];
  let requiresPatientSwitchConfirmation = false;

  for (const item of input.requested) {
    const permission =
      item.requiredPermission || KIND_DEFAULT_PERMISSION[item.kind] || 'use_ai_chat';
    if (
      permission !== 'use_ai_chat' &&
      !input.userPermissions.includes(permission) &&
      !input.userPermissions.includes('*')
    ) {
      rejected.push({ id: item.id, reason: `missing_permission:${permission}` });
      continue;
    }

    if (item.patientId && input.scope.patientId && item.patientId !== input.scope.patientId) {
      if (!input.allowPatientSwitch || !input.confirmedPatientSwitch) {
        requiresPatientSwitchConfirmation = true;
        rejected.push({ id: item.id, reason: 'patient_context_switch_requires_confirmation' });
        continue;
      }
    }

    if (item.expiresAt && Date.parse(item.expiresAt) < Date.now()) {
      rejected.push({ id: item.id, reason: 'context_expired' });
      continue;
    }

    // OCR and generated language are never treated as authoritative clinical facts.
    const removable =
      item.kind === 'ocr_extraction' ||
      item.kind === 'generated_language' ||
      item.kind === 'user_entered_draft' ||
      item.kind === 'prediction';

    attached.push({
      id: item.id,
      kind: item.kind,
      label: item.label,
      summary: item.summary,
      sourceId: item.sourceId,
      version: item.version,
      confidence: item.confidence,
      removable,
      expiresAt: item.expiresAt,
      patientId: item.patientId,
      encounterId: item.encounterId,
    });
  }

  const session: InteractiveSession = {
    sessionId: createSessionId(),
    scope: { ...input.scope },
    attachedContext: attached,
    createdAt: now,
    updatedAt: now,
    status: 'active',
  };

  return {
    session,
    attached,
    rejected,
    requiresPatientSwitchConfirmation,
  };
}

export function removeContextItem(
  session: InteractiveSession,
  contextId: string,
): InteractiveSession {
  const item = session.attachedContext.find((c) => c.id === contextId);
  if (item && !item.removable) {
    throw new Error('This context item is not removable');
  }
  return {
    ...session,
    attachedContext: session.attachedContext.filter((c) => c.id !== contextId),
    updatedAt: new Date().toISOString(),
  };
}

export function describeContextForPrompt(session: InteractiveSession): string {
  if (!session.attachedContext.length) {
    return 'No attached workflow context.';
  }
  return session.attachedContext
    .map(
      (c) =>
        `[${c.kind}] ${c.label}: ${c.summary}${
          typeof c.confidence === 'number' ? ` (confidence ${Math.round(c.confidence * 100)}%)` : ''
        }`,
    )
    .join('\n');
}
