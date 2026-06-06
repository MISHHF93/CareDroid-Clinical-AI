import { Injectable } from '@nestjs/common';
import {
  IntegrationEvent,
  IntegrationEventFamily,
  IntegrationParserStatus,
  NormalizedClinicalEventKind,
} from './normalized-clinical-event.model';

export interface IntegrationEventDefinition {
  family: IntegrationEventFamily;
  eventType: string;
  label: string;
  normalizedKind: NormalizedClinicalEventKind;
  parserStatus: IntegrationParserStatus;
  requiredPayloadFields: string[];
  automationReadiness: 'ready' | 'contract_ready' | 'placeholder_ready';
}

const INTEGRATION_EVENT_DEFINITIONS: IntegrationEventDefinition[] = [
  {
    family: 'fhir',
    eventType: 'Patient',
    label: 'FHIR Patient',
    normalizedKind: 'patient',
    parserStatus: 'normalized',
    requiredPayloadFields: ['resourceType', 'id'],
    automationReadiness: 'contract_ready',
  },
  {
    family: 'fhir',
    eventType: 'Observation',
    label: 'FHIR Observation',
    normalizedKind: 'observation',
    parserStatus: 'normalized',
    requiredPayloadFields: ['resourceType', 'status', 'code'],
    automationReadiness: 'ready',
  },
  {
    family: 'fhir',
    eventType: 'MedicationRequest',
    label: 'FHIR MedicationRequest',
    normalizedKind: 'medication_request',
    parserStatus: 'normalized',
    requiredPayloadFields: ['resourceType', 'status', 'medicationCodeableConcept'],
    automationReadiness: 'contract_ready',
  },
  {
    family: 'fhir',
    eventType: 'Encounter',
    label: 'FHIR Encounter',
    normalizedKind: 'encounter',
    parserStatus: 'normalized',
    requiredPayloadFields: ['resourceType', 'status', 'class'],
    automationReadiness: 'contract_ready',
  },
  {
    family: 'hl7',
    eventType: 'ADT',
    label: 'HL7 ADT',
    normalizedKind: 'encounter',
    parserStatus: 'placeholder',
    requiredPayloadFields: ['messageType'],
    automationReadiness: 'placeholder_ready',
  },
  {
    family: 'hl7',
    eventType: 'ORU',
    label: 'HL7 ORU',
    normalizedKind: 'lab_result',
    parserStatus: 'placeholder',
    requiredPayloadFields: ['messageType'],
    automationReadiness: 'placeholder_ready',
  },
  {
    family: 'lis',
    eventType: 'result',
    label: 'LIS results',
    normalizedKind: 'lab_result',
    parserStatus: 'normalized',
    requiredPayloadFields: ['accessionId', 'analyte'],
    automationReadiness: 'contract_ready',
  },
  {
    family: 'device_telemetry',
    eventType: 'telemetry',
    label: 'Device telemetry',
    normalizedKind: 'device_telemetry',
    parserStatus: 'normalized',
    requiredPayloadFields: ['deviceId', 'metric'],
    automationReadiness: 'ready',
  },
];

function normalize(value: string | undefined) {
  return (value || '').trim().toLowerCase();
}

@Injectable()
export class IntegrationEventRegistry {
  private readonly definitions = INTEGRATION_EVENT_DEFINITIONS;

  listDefinitions() {
    return [...this.definitions];
  }

  findDefinition(event: Pick<IntegrationEvent, 'family' | 'eventType'>) {
    const family = normalize(event.family);
    const eventType = normalize(event.eventType);

    return this.definitions.find(
      (definition) =>
        normalize(definition.family) === family && normalize(definition.eventType) === eventType,
    );
  }

  isSupported(event: Pick<IntegrationEvent, 'family' | 'eventType'>) {
    return Boolean(this.findDefinition(event));
  }

  unsupportedLabels(event: Pick<IntegrationEvent, 'family' | 'eventType'>) {
    return [
      'unsupported_integration',
      `source_family:${event.family || 'unknown'}`,
      `event_type:${event.eventType || 'unknown'}`,
    ];
  }
}
