export interface AIAuditEvent {
  userId: string;
  tenantId: string;
  timestamp: string;
  module: string;
  action: string;
  patientId?: string;
  encounterId?: string;
  purpose: string;
  result: 'allowed' | 'blocked' | 'success' | 'error';
  error?: string;
  requestType: string;
  inputPreview: string;
  outputPreview?: string;
  model?: string;
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
  const redacted = String(value ?? '')
    .replace(/\b[A-Z]{2,4}-?\d{5,}\b/g, '[redacted-id]')
    .replace(/\b(?:sk|pk|tok|key)_[A-Za-z0-9_-]{8,}\b/g, '[redacted-secret]')
    .replace(/\b\d{3}[- ]?\d{3}[- ]?\d{4}\b/g, '[redacted-phone]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\s+/g, ' ')
    .trim();
  return redacted.slice(0, maxLength);
}

type AIAuditSink = (event: AIAuditEvent) => void;
let aiAuditSink: AIAuditSink | null = null;

export function registerAIAuditSink(sink: AIAuditSink): void {
  aiAuditSink = sink;
}

export function logAIAuditEvent(event: AIAuditEvent): void {
  aiAuditSink?.(event);
  if (typeof console !== 'undefined') {
    console.info('[AI_AUDIT]', event);
  }
}
