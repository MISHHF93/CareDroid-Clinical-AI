import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  IntegrationEventDefinition,
  IntegrationEventRegistry,
} from './integration-event-registry.service';
import {
  AutomationTrigger,
  IntegrationAutomationRouteResult,
  IntegrationEvent,
  NormalizedClinicalEvent,
  NormalizedClinicalEventSeverity,
  SafeAction,
} from './normalized-clinical-event.model';

const PROHIBITED_AUTOMATION_SIDE_EFFECTS = [
  'clinical_writeback',
  'medication_ordering',
  'patient_record_merge',
  'device_control',
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstArrayRecord(value: unknown): Record<string, unknown> {
  return Array.isArray(value) ? asRecord(value[0]) : {};
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nestedValue = firstString(...value);
      if (nestedValue) return nestedValue;
    }
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }
  return undefined;
}

function scalarValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function referenceId(reference: unknown) {
  const value = firstString(reference);
  if (!value) return undefined;
  return value.includes('/') ? value.split('/').filter(Boolean).pop() : value;
}

function firstCoding(codeableConcept: unknown) {
  const codeable = asRecord(codeableConcept);
  return firstArrayRecord(codeable.coding);
}

function codeFrom(codeableConcept: unknown) {
  const coding = firstCoding(codeableConcept);
  const codeable = asRecord(codeableConcept);
  return {
    code: firstString(coding.code, codeable.text),
    display: firstString(coding.display, codeable.text),
  };
}

function codeFromCodeableOrFirstArray(codeableConcept: unknown) {
  return codeFrom(Array.isArray(codeableConcept) ? firstArrayRecord(codeableConcept) : codeableConcept);
}

function severityFromInterpretation(interpretation: string | undefined) {
  const normalized = (interpretation || '').toLowerCase();
  if (['critical', 'panic', 'hh', 'll'].includes(normalized)) return 'critical';
  if (['high', 'low', 'abnormal', 'h', 'l', 'a'].includes(normalized)) return 'high';
  return 'info';
}

function highestSeverity(
  current: NormalizedClinicalEventSeverity,
  candidate: NormalizedClinicalEventSeverity,
) {
  const rank: Record<NormalizedClinicalEventSeverity, number> = {
    info: 0,
    low: 1,
    moderate: 2,
    high: 3,
    critical: 4,
  };
  return rank[candidate] > rank[current] ? candidate : current;
}

@Injectable()
export class IntegrationAutomationRouter {
  constructor(private readonly registry: IntegrationEventRegistry) {}

  routeIntegrationEvent(event: IntegrationEvent): IntegrationAutomationRouteResult {
    const definition = this.registry.findDefinition(event);
    if (!definition) {
      return this.unsupportedResult(event);
    }

    const normalizedEvent = this.normalizeIntegrationEvent(event);
    const trigger = this.evaluateAutomation(normalizedEvent);
    const safeAction = this.selectSafeAction(normalizedEvent, trigger);

    return {
      status: trigger.fired ? 'routed' : 'normalized_no_trigger',
      labels: normalizedEvent.provenance.labels,
      normalizedEvent,
      trigger,
      safeAction,
    };
  }

  normalizeIntegrationEvent(event: IntegrationEvent): NormalizedClinicalEvent {
    const definition = this.registry.findDefinition(event);
    if (!definition) {
      return this.normalizeUnsupported(event);
    }

    if (definition.family === 'fhir' && definition.eventType === 'Observation') {
      return this.normalizeFhirObservation(event, definition);
    }
    if (definition.family === 'fhir' && definition.eventType === 'Patient') {
      return this.normalizeFhirPatient(event, definition);
    }
    if (definition.family === 'fhir' && definition.eventType === 'MedicationRequest') {
      return this.normalizeFhirMedicationRequest(event, definition);
    }
    if (definition.family === 'fhir' && definition.eventType === 'Encounter') {
      return this.normalizeFhirEncounter(event, definition);
    }
    if (definition.family === 'hl7' && definition.eventType === 'ADT') {
      return this.normalizeHl7AdtPlaceholder(event, definition);
    }
    if (definition.family === 'hl7' && definition.eventType === 'ORU') {
      return this.normalizeHl7OruPlaceholder(event, definition);
    }
    if (definition.family === 'lis' && definition.eventType === 'result') {
      return this.normalizeLisResult(event, definition);
    }
    if (definition.family === 'device_telemetry' && definition.eventType === 'telemetry') {
      return this.normalizeDeviceTelemetry(event, definition);
    }

    return this.normalizeUnsupported(event);
  }

  evaluateAutomation(event: NormalizedClinicalEvent): AutomationTrigger {
    if (event.kind === 'unsupported') {
      return {
        id: `trigger-${event.id}`,
        type: 'unsupported_integration',
        fired: true,
        severity: 'low',
        reason: 'Integration family or event type is not registered for automation routing.',
        reviewRequired: true,
      };
    }

    if (event.kind === 'device_telemetry') {
      const battery = Number(event.payload.battery ?? event.payload.batteryLevel);
      const status = (event.status || '').toLowerCase();
      const deviceWarning =
        event.severity === 'critical' ||
        event.severity === 'high' ||
        status === 'offline' ||
        status === 'stale' ||
        (!Number.isNaN(battery) && battery < 20);

      return {
        id: `trigger-${event.id}`,
        type: deviceWarning ? 'device_telemetry_review' : 'device_telemetry_recorded',
        fired: deviceWarning,
        severity: deviceWarning ? highestSeverity(event.severity, 'moderate') : event.severity,
        reason: deviceWarning
          ? 'Device telemetry indicates a warning state that should be reviewed by operations or biomedical staff.'
          : 'Device telemetry normalized without a warning threshold.',
        reviewRequired: deviceWarning,
      };
    }

    const abnormalClinicalSignal =
      event.severity === 'critical' ||
      event.severity === 'high' ||
      ['critical', 'panic', 'abnormal', 'high', 'low', 'hh', 'll', 'h', 'l', 'a'].includes(
        (event.interpretation || '').toLowerCase(),
      );

    return {
      id: `trigger-${event.id}`,
      type: abnormalClinicalSignal ? `${event.kind}_review` : `${event.kind}_recorded`,
      fired: abnormalClinicalSignal,
      severity: abnormalClinicalSignal ? highestSeverity(event.severity, 'high') : event.severity,
      reason: abnormalClinicalSignal
        ? 'Normalized clinical event contains an abnormal or critical signal requiring human review.'
        : 'Normalized clinical event did not meet automation trigger criteria.',
      reviewRequired: abnormalClinicalSignal,
    };
  }

  private selectSafeAction(
    event: NormalizedClinicalEvent,
    trigger: AutomationTrigger,
  ): SafeAction {
    if (event.kind === 'unsupported') {
      return this.unsupportedAction(event);
    }

    if (!trigger.fired) {
      return {
        id: `action-${event.id}`,
        type: 'none',
        title: 'No automation action selected',
        description: 'The event was normalized and retained for audit without firing a trigger.',
        requiresHumanReview: false,
        blocked: false,
        allowedSideEffects: ['audit_label'],
        prohibitedSideEffects: PROHIBITED_AUTOMATION_SIDE_EFFECTS,
      };
    }

    if (event.kind === 'device_telemetry') {
      return {
        id: `action-${event.id}`,
        type: 'create_operational_task',
        title: 'Create biomedical operations review task',
        description:
          'Route device telemetry warning to an operations or biomedical review queue before any field action.',
        requiresHumanReview: true,
        blocked: false,
        allowedSideEffects: ['review_queue_item', 'ops_notification'],
        prohibitedSideEffects: PROHIBITED_AUTOMATION_SIDE_EFFECTS,
      };
    }

    return {
      id: `action-${event.id}`,
      type: trigger.severity === 'critical' ? 'escalate_for_review' : 'notify_review_queue',
      title:
        trigger.severity === 'critical'
          ? 'Escalate critical integration signal for review'
          : 'Notify clinical review queue',
      description:
        'Create a review-bound automation action. The router does not perform orders, writeback, patient merges, or device control.',
      requiresHumanReview: true,
      blocked: false,
      allowedSideEffects: ['review_queue_item', 'notification'],
      prohibitedSideEffects: PROHIBITED_AUTOMATION_SIDE_EFFECTS,
    };
  }

  private normalizeFhirObservation(
    event: IntegrationEvent,
    definition: IntegrationEventDefinition,
  ) {
    const payload = asRecord(event.payload);
    const quantity = asRecord(payload.valueQuantity);
    const code = codeFrom(payload.code);
    const interpretation = codeFromCodeableOrFirstArray(payload.interpretation);
    const subject = asRecord(payload.subject);
    const encounter = asRecord(payload.encounter);
    const value = scalarValue(quantity.value) ?? scalarValue(payload.valueString);

    return this.baseEvent(event, definition, {
      patientId: referenceId(subject.reference),
      encounterId: referenceId(encounter.reference),
      code: code.code,
      display: code.display,
      value,
      unit: firstString(quantity.unit, quantity.code),
      interpretation: firstString(interpretation.code, interpretation.display),
      status: firstString(payload.status),
      severity: severityFromInterpretation(firstString(interpretation.code, interpretation.display)),
      occurredAt: firstString(payload.effectiveDateTime, payload.issued),
      payload,
    });
  }

  private normalizeFhirPatient(event: IntegrationEvent, definition: IntegrationEventDefinition) {
    const payload = asRecord(event.payload);
    const name = firstArrayRecord(payload.name);
    const display = [firstString(name.given), firstString(name.family)].filter(Boolean).join(' ');

    return this.baseEvent(event, definition, {
      patientId: firstString(payload.id, event.metadata?.patientId),
      display: display || firstString(payload.id),
      status: firstString(payload.active),
      severity: 'info',
      occurredAt: firstString(payload.meta && asRecord(payload.meta).lastUpdated),
      payload,
    });
  }

  private normalizeFhirMedicationRequest(
    event: IntegrationEvent,
    definition: IntegrationEventDefinition,
  ) {
    const payload = asRecord(event.payload);
    const medication = codeFrom(payload.medicationCodeableConcept);
    const subject = asRecord(payload.subject);
    const encounter = asRecord(payload.encounter);

    return this.baseEvent(event, definition, {
      patientId: referenceId(subject.reference),
      encounterId: referenceId(encounter.reference),
      code: medication.code,
      display: medication.display || firstString(payload.medicationReference),
      status: firstString(payload.status, payload.intent),
      severity: 'info',
      occurredAt: firstString(payload.authoredOn),
      payload,
    });
  }

  private normalizeFhirEncounter(event: IntegrationEvent, definition: IntegrationEventDefinition) {
    const payload = asRecord(event.payload);
    const subject = asRecord(payload.subject);
    const period = asRecord(payload.period);
    const encounterClass = asRecord(payload.class);
    const firstLocation = firstArrayRecord(payload.location);
    const location = asRecord(firstLocation.location);

    return this.baseEvent(event, definition, {
      patientId: referenceId(subject.reference),
      encounterId: firstString(payload.id),
      code: firstString(encounterClass.code),
      display: firstString(encounterClass.display, encounterClass.code),
      status: firstString(payload.status),
      locationRef: firstString(location.reference, location.display),
      severity: 'info',
      occurredAt: firstString(period.start, period.end),
      payload,
    });
  }

  private normalizeHl7AdtPlaceholder(
    event: IntegrationEvent,
    definition: IntegrationEventDefinition,
  ) {
    const payload = asRecord(event.payload);

    return this.baseEvent(event, definition, {
      patientId: firstString(payload.patientId, payload.mrn),
      encounterId: firstString(payload.visitId, payload.encounterId),
      code: firstString(payload.messageType, payload.triggerEvent),
      display: firstString(payload.triggerEvent, payload.eventDescription, 'HL7 ADT placeholder'),
      status: firstString(payload.status, payload.patientClass),
      locationRef: firstString(payload.location, payload.assignedPatientLocation),
      severity: 'info',
      occurredAt: firstString(payload.eventTime, payload.messageTime),
      payload,
    });
  }

  private normalizeHl7OruPlaceholder(
    event: IntegrationEvent,
    definition: IntegrationEventDefinition,
  ) {
    const payload = asRecord(event.payload);
    const obx = firstArrayRecord(payload.obx);
    const interpretation = firstString(
      payload.abnormalFlag,
      payload.interpretation,
      obx.abnormalFlag,
      obx.interpretation,
    );

    return this.baseEvent(event, definition, {
      patientId: firstString(payload.patientId, payload.mrn),
      encounterId: firstString(payload.visitId, payload.encounterId),
      code: firstString(payload.observationIdentifier, obx.identifier, obx.code),
      display: firstString(payload.observationText, obx.text, obx.display),
      value: scalarValue(payload.observationValue) ?? scalarValue(obx.value),
      unit: firstString(payload.units, obx.units),
      interpretation,
      status: firstString(payload.resultStatus, obx.status),
      severity: severityFromInterpretation(interpretation),
      occurredAt: firstString(payload.observedAt, payload.resultedAt, payload.messageTime),
      payload,
    });
  }

  private normalizeLisResult(event: IntegrationEvent, definition: IntegrationEventDefinition) {
    const payload = asRecord(event.payload);
    const interpretation = firstString(payload.abnormalFlag, payload.interpretation);

    return this.baseEvent(event, definition, {
      patientId: firstString(payload.patientId, payload.mrn),
      encounterId: firstString(payload.encounterId, payload.visitId),
      code: firstString(payload.analyteCode, payload.analyte),
      display: firstString(payload.analyteName, payload.analyte),
      value: scalarValue(payload.value),
      unit: firstString(payload.unit),
      interpretation,
      status: firstString(payload.status, payload.resultStatus),
      severity: severityFromInterpretation(interpretation),
      occurredAt: firstString(payload.resultedAt, payload.observedAt),
      payload,
    });
  }

  private normalizeDeviceTelemetry(
    event: IntegrationEvent,
    definition: IntegrationEventDefinition,
  ) {
    const payload = asRecord(event.payload);
    const severity = firstString(payload.severity);

    return this.baseEvent(event, definition, {
      deviceId: firstString(payload.deviceId, payload.assetId),
      patientId: firstString(payload.patientId),
      code: firstString(payload.metric, payload.parameter),
      display: firstString(payload.metricLabel, payload.metric, payload.parameter),
      value: scalarValue(payload.value),
      unit: firstString(payload.unit),
      status: firstString(payload.status, payload.quality),
      severity: this.normalizeSeverity(severity) || 'info',
      occurredAt: firstString(payload.observedAt, payload.timestamp),
      locationRef: firstString(payload.location, payload.room, payload.bed),
      payload,
    });
  }

  private baseEvent(
    event: IntegrationEvent,
    definition: IntegrationEventDefinition,
    fields: Partial<NormalizedClinicalEvent>,
  ): NormalizedClinicalEvent {
    const receivedAt = event.receivedAt || new Date().toISOString();
    const occurredAt = fields.occurredAt || receivedAt;

    return {
      id: `normalized-${event.id || randomUUID()}`,
      kind: definition.normalizedKind,
      sourceFamily: definition.family,
      sourceEventType: definition.eventType,
      parserStatus: definition.parserStatus,
      organizationId: event.organizationId,
      workspaceId: event.workspaceId,
      sourceSystem: event.sourceSystem,
      severity: fields.severity || 'info',
      occurredAt,
      receivedAt,
      provenance: {
        originalEventId: event.id,
        sourceSystem: event.sourceSystem,
        vendor: event.vendor,
        labels: [
          definition.label,
          `automation_readiness:${definition.automationReadiness}`,
          `parser_status:${definition.parserStatus}`,
        ],
      },
      payload: fields.payload || event.payload || {},
      ...fields,
    };
  }

  private normalizeUnsupported(event: IntegrationEvent): NormalizedClinicalEvent {
    const receivedAt = event.receivedAt || new Date().toISOString();

    return {
      id: `normalized-${event.id || randomUUID()}`,
      kind: 'unsupported',
      sourceFamily: 'unknown',
      sourceEventType: event.eventType || 'unknown',
      parserStatus: 'unsupported',
      organizationId: event.organizationId,
      workspaceId: event.workspaceId,
      sourceSystem: event.sourceSystem,
      severity: 'low',
      occurredAt: receivedAt,
      receivedAt,
      provenance: {
        originalEventId: event.id,
        sourceSystem: event.sourceSystem,
        vendor: event.vendor,
        labels: this.registry.unsupportedLabels(event),
      },
      payload: event.payload || {},
    };
  }

  private unsupportedResult(event: IntegrationEvent): IntegrationAutomationRouteResult {
    const normalizedEvent = this.normalizeUnsupported(event);
    const trigger = this.evaluateAutomation(normalizedEvent);

    return {
      status: 'unsupported',
      labels: normalizedEvent.provenance.labels,
      normalizedEvent,
      trigger,
      safeAction: this.unsupportedAction(normalizedEvent),
    };
  }

  private unsupportedAction(event: NormalizedClinicalEvent): SafeAction {
    return {
      id: `action-${event.id}`,
      type: 'label_unsupported_integration',
      title: 'Unsupported integration labeled',
      description:
        'The integration event was preserved for audit but was not normalized into an automation-ready clinical event.',
      requiresHumanReview: true,
      blocked: true,
      allowedSideEffects: ['audit_label'],
      prohibitedSideEffects: PROHIBITED_AUTOMATION_SIDE_EFFECTS,
    };
  }

  private normalizeSeverity(value: string | undefined): NormalizedClinicalEventSeverity | undefined {
    const normalized = (value || '').toLowerCase();
    if (['critical', 'high', 'moderate', 'low', 'info'].includes(normalized)) {
      return normalized as NormalizedClinicalEventSeverity;
    }
    return undefined;
  }
}
