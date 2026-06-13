export interface AIAuditEvent {
  userId: string;
  tenantId: string;
  patientId?: string;
  encounterId?: string;
  purpose: string;
  sourceModule: string;
  requestType: string;
  inputPreview: string;
  outputPreview?: string;
  model?: string;
  timestamp: string;
  safety: {
    requiresHumanReview: boolean;
    blocked: boolean;
    reasons: string[];
  };
}

export function buildAIAuditEvent(input: Omit<AIAuditEvent, 'timestamp'>): AIAuditEvent {
  return {
    ...input,
    timestamp: new Date().toISOString(),
  };
}

export function previewAIText(value: unknown, maxLength = 500): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function logAIAuditEvent(event: AIAuditEvent): void {
  if (typeof console !== 'undefined') {
    console.info('[AI_AUDIT]', event);
  }
}
