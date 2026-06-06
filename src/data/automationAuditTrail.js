export const AUTOMATION_AUDIT_STATUSES = Object.freeze({
  SUCCESS: 'success',
  BLOCKED: 'blocked',
  FAILED: 'failed',
});

export const AUTOMATION_AUDIT_STATUS_LABELS = Object.freeze({
  [AUTOMATION_AUDIT_STATUSES.SUCCESS]: 'Succeeded',
  [AUTOMATION_AUDIT_STATUSES.BLOCKED]: 'Blocked',
  [AUTOMATION_AUDIT_STATUSES.FAILED]: 'Failed',
});

const REQUIRED_FIELDS = [
  'triggerFired',
  'conditionsEvaluated',
  'actionSelected',
  'user',
  'tenant',
  'workspace',
  'aiInvolvement',
  'toolCalled',
  'backendEndpoint',
  'timestamp',
];

const automationAuditEntries = [];

export const INITIAL_AUTOMATION_AUDIT_ENTRIES = Object.freeze([
  {
    id: 'audit-news2-escalation-success',
    triggerFired: 'High NEWS2 threshold reached',
    conditionsEvaluated: [
      { label: 'Patient is admitted', result: true },
      { label: 'Responsible clinician assigned', result: true },
    ],
    actionSelected: 'Notify clinician escalation pool',
    user: { id: 'user-demo-clinician', name: 'Demo Clinician' },
    tenant: { id: 'tenant-demo-hospital', name: 'Demo Hospital' },
    workspace: { id: 'emergency', name: 'Emergency Workspace' },
    aiInvolvement: { involved: true, summary: 'AI reviewed deterioration context and suggested NEWS2 escalation.' },
    toolCalled: 'news2',
    backendEndpoint: '/api/clinical/alerts',
    status: AUTOMATION_AUDIT_STATUSES.SUCCESS,
    timestamp: '2026-06-06T17:40:00.000Z',
    reviewer: { required: false, name: '' },
  },
  {
    id: 'audit-device-maintenance-blocked',
    triggerFired: 'Device heartbeat stale',
    conditionsEvaluated: [
      { label: 'Device has assigned owner', result: false },
      { label: 'Maintenance integration enabled', result: false },
    ],
    actionSelected: 'Create maintenance ticket',
    user: { id: 'user-biomed-reviewer', name: 'Biomed Reviewer' },
    tenant: { id: 'tenant-demo-hospital', name: 'Demo Hospital' },
    workspace: { id: 'medical-iot', name: 'Medical IoT Workspace' },
    aiInvolvement: { involved: false, summary: 'Rules-only telemetry check.' },
    toolCalled: 'device-maintenance',
    backendEndpoint: '/api/devices/maintenance',
    status: AUTOMATION_AUDIT_STATUSES.BLOCKED,
    reason: 'Device maintenance backend capability is disabled.',
    timestamp: '2026-06-06T17:45:00.000Z',
    reviewer: { required: true, name: 'Biomed lead' },
  },
  {
    id: 'audit-potassium-failed',
    triggerFired: 'Abnormal potassium critical result',
    conditionsEvaluated: [
      { label: 'Critical result confirmed', result: true },
      { label: 'Laboratory workflow reachable', result: false },
    ],
    actionSelected: 'Open laboratory workflow',
    user: { id: 'user-lab-specialist', name: 'Lab Specialist' },
    tenant: { id: 'tenant-research-clinic', name: 'Research Clinic' },
    workspace: { id: 'laboratory', name: 'Laboratory Workspace' },
    aiInvolvement: { involved: true, summary: 'AI summarized potassium trend before workflow handoff.' },
    toolCalled: 'lab-interpreter',
    backendEndpoint: '/api/tools/lab-interpreter/execute',
    status: AUTOMATION_AUDIT_STATUSES.FAILED,
    error: 'Laboratory workflow route returned 503.',
    timestamp: '2026-06-06T17:50:00.000Z',
    reviewer: { required: true, name: 'Lab safety reviewer' },
  },
]);

function cloneEntry(entry) {
  return {
    ...entry,
    conditionsEvaluated: [...(entry.conditionsEvaluated || [])],
    user: { ...(entry.user || {}) },
    tenant: { ...(entry.tenant || {}) },
    workspace: { ...(entry.workspace || {}) },
    aiInvolvement: { ...(entry.aiInvolvement || {}) },
    reviewer: { ...(entry.reviewer || {}) },
  };
}

function normalizeEntity(value, fallbackId, fallbackName) {
  if (typeof value === 'string') {
    return { id: value, name: value };
  }
  return {
    id: value?.id || fallbackId,
    name: value?.name || value?.label || fallbackName,
  };
}

function normalizeConditions(conditionsEvaluated = []) {
  return conditionsEvaluated.map((condition) =>
    typeof condition === 'string'
      ? { label: condition, result: true }
      : { label: condition.label || condition.name || 'Condition', result: Boolean(condition.result) }
  );
}

function validateAutomationAuditEntry(entry) {
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = entry[field];
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  });

  if (missing.length) {
    throw new Error(`Automation audit entry missing required fields: ${missing.join(', ')}`);
  }
  if (entry.status === AUTOMATION_AUDIT_STATUSES.BLOCKED && !entry.reason) {
    throw new Error('Blocked automation audit entries require a reason.');
  }
  if (entry.status === AUTOMATION_AUDIT_STATUSES.FAILED && !entry.error) {
    throw new Error('Failed automation audit entries require an error.');
  }
}

export function createAutomationAuditEntry(event) {
  const status = Object.values(AUTOMATION_AUDIT_STATUSES).includes(event.status)
    ? event.status
    : AUTOMATION_AUDIT_STATUSES.SUCCESS;
  const entry = {
    id: event.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    triggerFired: event.triggerFired,
    conditionsEvaluated: normalizeConditions(event.conditionsEvaluated),
    actionSelected: event.actionSelected,
    user: normalizeEntity(event.user, 'unknown-user', 'Unknown user'),
    tenant: normalizeEntity(event.tenant, 'unknown-tenant', 'Unknown tenant'),
    workspace: normalizeEntity(event.workspace, 'unknown-workspace', 'Unknown workspace'),
    aiInvolvement:
      typeof event.aiInvolvement === 'boolean'
        ? { involved: event.aiInvolvement, summary: event.aiInvolvement ? 'AI-assisted automation.' : 'No AI involvement.' }
        : {
            involved: Boolean(event.aiInvolvement?.involved),
            summary: event.aiInvolvement?.summary || 'No AI involvement.',
          },
    toolCalled: event.toolCalled || 'none',
    backendEndpoint: event.backendEndpoint || 'none',
    status,
    timestamp: event.timestamp || new Date().toISOString(),
    reviewer:
      typeof event.reviewer === 'string'
        ? { required: true, name: event.reviewer }
        : { required: Boolean(event.reviewer?.required), name: event.reviewer?.name || '' },
    reason: event.reason || '',
    error: event.error || '',
  };

  validateAutomationAuditEntry(entry);
  return entry;
}

export function resetAutomationAuditTrail(seed = INITIAL_AUTOMATION_AUDIT_ENTRIES) {
  automationAuditEntries.splice(0, automationAuditEntries.length, ...seed.map(cloneEntry));
}

export function logAutomationAuditEvent(event) {
  const entry = createAutomationAuditEntry(event);
  automationAuditEntries.unshift(entry);
  return cloneEntry(entry);
}

export function getAutomationAuditEntries({ tenantId } = {}) {
  const rows = tenantId
    ? automationAuditEntries.filter((entry) => entry.tenant.id === tenantId)
    : automationAuditEntries;
  return rows.map(cloneEntry);
}

export function getAutomationAuditTenants(entries = automationAuditEntries) {
  const tenants = new Map();
  for (const entry of entries) {
    tenants.set(entry.tenant.id, entry.tenant);
  }
  return [...tenants.values()].map((tenant) => ({ ...tenant }));
}

export function summarizeAutomationAuditTrail(entries = getAutomationAuditEntries()) {
  return {
    total: entries.length,
    success: entries.filter((entry) => entry.status === AUTOMATION_AUDIT_STATUSES.SUCCESS).length,
    blocked: entries.filter((entry) => entry.status === AUTOMATION_AUDIT_STATUSES.BLOCKED).length,
    failed: entries.filter((entry) => entry.status === AUTOMATION_AUDIT_STATUSES.FAILED).length,
    reviewerRequired: entries.filter((entry) => entry.reviewer.required).length,
    aiInvolved: entries.filter((entry) => entry.aiInvolvement.involved).length,
  };
}

resetAutomationAuditTrail();
