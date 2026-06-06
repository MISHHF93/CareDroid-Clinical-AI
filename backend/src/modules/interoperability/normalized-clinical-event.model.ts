export type IntegrationEventFamily = 'fhir' | 'hl7' | 'lis' | 'device_telemetry' | 'unknown';

export type NormalizedClinicalEventKind =
  | 'patient'
  | 'observation'
  | 'medication_request'
  | 'encounter'
  | 'lab_result'
  | 'device_telemetry'
  | 'unsupported';

export type NormalizedClinicalEventSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical';

export type IntegrationParserStatus = 'normalized' | 'placeholder' | 'unsupported';

export interface IntegrationEvent {
  id?: string;
  family: string;
  eventType: string;
  sourceSystem?: string;
  organizationId?: string;
  workspaceId?: string;
  receivedAt?: string;
  vendor?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface NormalizedClinicalEvent {
  id: string;
  kind: NormalizedClinicalEventKind;
  sourceFamily: IntegrationEventFamily;
  sourceEventType: string;
  parserStatus: IntegrationParserStatus;
  organizationId?: string;
  workspaceId?: string;
  sourceSystem?: string;
  patientId?: string;
  encounterId?: string;
  deviceId?: string;
  locationRef?: string;
  code?: string;
  display?: string;
  value?: string | number | boolean;
  unit?: string;
  interpretation?: string;
  status?: string;
  severity: NormalizedClinicalEventSeverity;
  occurredAt: string;
  receivedAt: string;
  provenance: {
    originalEventId?: string;
    sourceSystem?: string;
    vendor?: string;
    labels: string[];
  };
  payload: Record<string, unknown>;
}

export interface AutomationTrigger {
  id: string;
  type: string;
  fired: boolean;
  severity: NormalizedClinicalEventSeverity;
  reason: string;
  reviewRequired: boolean;
}

export interface SafeAction {
  id: string;
  type:
    | 'notify_review_queue'
    | 'create_operational_task'
    | 'escalate_for_review'
    | 'label_unsupported_integration'
    | 'none';
  title: string;
  description: string;
  requiresHumanReview: boolean;
  blocked: boolean;
  allowedSideEffects: string[];
  prohibitedSideEffects: string[];
}

export interface IntegrationAutomationRouteResult {
  status: 'routed' | 'normalized_no_trigger' | 'unsupported';
  labels: string[];
  normalizedEvent?: NormalizedClinicalEvent;
  trigger?: AutomationTrigger;
  safeAction: SafeAction;
}
