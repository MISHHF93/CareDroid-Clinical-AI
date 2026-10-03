/**
 * CareDroid HL7 FHIR R4 Specification Types
 * Strongly typed representations of FHIR R4 Patient, Encounter, Observation,
 * Condition, Device, and Bundle resources.
 */

export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  system?: string;
  value: string;
  use?: 'usual' | 'official' | 'temp' | 'secondary';
}

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname';
  family: string;
  given: string[];
  prefix?: string[];
}

export interface FhirReference {
  reference: string;
  display?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirPatientResource {
  resourceType: 'Patient';
  id: string;
  identifier?: FhirIdentifier[];
  active: boolean;
  name: FhirHumanName[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{ system: string; value: string; use?: string }>;
}

export interface FhirEncounterResource {
  resourceType: 'Encounter';
  id: string;
  identifier?: FhirIdentifier[];
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: FhirCoding;
  subject: FhirReference;
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
}

export interface FhirObservationResource {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  valueString?: string;
  interpretation?: FhirCodeableConcept[];
}

export interface FhirBundleEntry {
  fullUrl?: string;
  resource:
    | FhirPatientResource
    | FhirEncounterResource
    | FhirObservationResource
    | Record<string, unknown>;
}

export interface FhirBundleResource {
  resourceType: 'Bundle';
  id: string;
  type: 'document' | 'message' | 'transaction' | 'collection' | 'searchset';
  timestamp?: string;
  entry: FhirBundleEntry[];
}
