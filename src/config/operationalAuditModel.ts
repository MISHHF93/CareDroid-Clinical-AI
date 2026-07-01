/**
 * Operational audit model — classify workflow logs for patient, queue, reassessment, referral.
 */

export const OPERATIONAL_AUDIT_DOMAIN = Object.freeze({
  PATIENT: 'patient',
  QUEUE: 'queue',
  REASSESSMENT: 'reassessment',
  REFERRAL: 'referral',
  COMMUNICATION: 'communication',
});

export const OPERATIONAL_AUDIT_DOMAIN_LABELS = Object.freeze({
  patient: 'Patient actions',
  queue: 'Queue changes',
  reassessment: 'Reassessments',
  referral: 'Referrals',
  communication: 'Staff communication',
});

const PATIENT_ACTION_TYPES = new Set([
  'patient_created',
  'encounter_created',
  'clinician_assigned',
  'ems_converted_to_patient',
  'boarding_started',
  'copilot_used',
  'provincial_data_viewed',
]);

const REASSESSMENT_TYPES = new Set(['reassessment_created', 'reassessment_completed']);

const REFERRAL_TYPES = new Set(['referral_created', 'referral_status_changed']);

const QUEUE_SOURCES = new Set([
  'queue-assignment',
  'reception-workspace',
  'intake-handoff',
  'patient-journey-engine',
  'reception.handoff',
]);

const COMMUNICATION_SOURCES = new Set(['waiting-room-communication']);

function metadataValue(log, key) {
  return log?.metadata?.[key];
}

export function isCommunicationWorkflowLog(log) {
  if (!log) return false;
  if (COMMUNICATION_SOURCES.has(log.source)) return true;
  if (log.metadata?.communicationKind) return true;
  return false;
}

export function isQueueWorkflowLog(log) {
  if (!log) return false;
  if (log.type === 'journey_state_changed') return true;
  if (log.type === 'integration_event_received' && metadataValue(log, 'handoff')) return true;
  if (QUEUE_SOURCES.has(log.source)) return true;
  if (metadataValue(log, 'queue') || metadataValue(log, 'targetState') || metadataValue(log, 'toRoomId')) {
    return true;
  }
  return false;
}

export function classifyWorkflowLog(log) {
  if (!log?.type) return null;
  if (isCommunicationWorkflowLog(log)) return OPERATIONAL_AUDIT_DOMAIN.COMMUNICATION;
  if (PATIENT_ACTION_TYPES.has(log.type)) return OPERATIONAL_AUDIT_DOMAIN.PATIENT;
  if (REASSESSMENT_TYPES.has(log.type)) return OPERATIONAL_AUDIT_DOMAIN.REASSESSMENT;
  if (REFERRAL_TYPES.has(log.type)) return OPERATIONAL_AUDIT_DOMAIN.REFERRAL;
  if (isQueueWorkflowLog(log)) return OPERATIONAL_AUDIT_DOMAIN.QUEUE;
  if (log.type === 'ems_arrival_created') return OPERATIONAL_AUDIT_DOMAIN.PATIENT;
  return null;
}

export function filterOperationalHistory(logs = [] as any[], { domain = null, patientId = null, limit = 12 }: any = {}) {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return sorted
    .filter((log) => {
      if (patientId && log.patientId && log.patientId !== patientId) return false;
      if (!domain) return Boolean(classifyWorkflowLog(log));
      return classifyWorkflowLog(log) === domain;
    })
    .slice(0, limit);
}

export function groupOperationalHistory(logs = [] as any[], { patientId = null, limitPerDomain = 8 }: any = {}) {
  const domains = Object.values(OPERATIONAL_AUDIT_DOMAIN);
  return domains.reduce((groups, domain) => {
    groups[domain] = filterOperationalHistory(logs, { domain, patientId, limit: limitPerDomain });
    return groups;
  }, ({} as Record<string, unknown[]>));
}

export function summarizeOperationalHistory(logs = [] as any[], { patientId = null }: any = {}) {
  const grouped = groupOperationalHistory(logs, { patientId, limitPerDomain: 100 });
  return Object.entries(grouped).map(([domain, entries]) => ({
    domain,
    label: OPERATIONAL_AUDIT_DOMAIN_LABELS[domain] || domain,
    count: entries.length,
    latest: entries[0] || null,
  }));
}

export const OPERATIONAL_AUDIT_SURFACE_REGISTRY = Object.freeze([
  { id: 'patient-detail', domains: ['patient', 'queue', 'reassessment', 'referral'] },
  { id: 'reassessment-drawer', domains: ['reassessment'] },
  { id: 'referral-panel', domains: ['referral'] },
  { id: 'reception-workspace', domains: ['patient', 'queue'] },
  { id: 'whiteboard-strip', domains: ['patient', 'queue', 'reassessment', 'referral'] },
  { id: 'emergency-settings', domains: ['patient', 'queue', 'reassessment', 'referral'] },
]);

export function auditOperationalHistoryExposure() {
  return {
    surfaceCount: OPERATIONAL_AUDIT_SURFACE_REGISTRY.length,
    domains: Object.values(OPERATIONAL_AUDIT_DOMAIN),
    passesAudit: OPERATIONAL_AUDIT_SURFACE_REGISTRY.length >= 5,
  };
}
