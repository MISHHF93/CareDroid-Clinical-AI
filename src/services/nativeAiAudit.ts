type NativeAiAuditEvent = {
  id: string;
  action: string;
  patientId?: string;
  timestamp: string;
  details?: Record<string, unknown>;
};

const auditEvents: NativeAiAuditEvent[] = [];

export function logNativeAiDashboardAudit(input: {
  action: string;
  patientId?: string;
  details?: Record<string, unknown>;
}): NativeAiAuditEvent {
  const event: NativeAiAuditEvent = {
    id: `native-ai-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: input.action,
    patientId: input.patientId,
    timestamp: new Date().toISOString(),
    details: input.details,
  };
  auditEvents.unshift(event);
  if (auditEvents.length > 500) auditEvents.length = 500;
  return event;
}

export function listNativeAiAuditEvents(limit = 50): NativeAiAuditEvent[] {
  return auditEvents.slice(0, limit);
}