import type { ClinicalConcept } from './clinicalConceptTypes';
import { HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS } from '../../services/highRiskComplaintFlags';

const LAST_UPDATED = '2026-08-08';
const PROVENANCE =
  'CareDroid local complaint-recognition seed (2026-08-08 terminology-layer round) — ' +
  'no licensed CEDIS/SNOMED CT CA/ICD-10-CA source files are present in this repository; ' +
  'these are plain-language local concepts, not authoritative codes.';

function baseConcept(partial: Partial<ClinicalConcept> & Pick<ClinicalConcept, 'id' | 'canonicalName' | 'displayName' | 'category' | 'complaintGroup'>): ClinicalConcept {
  return {
    type: 'SYMPTOM',
    synonyms: [],
    abbreviations: [],
    layTerms: [],
    spellingVariants: [],
    language: 'en',
    sourceSystem: 'local',
    sourceCode: null,
    sourceVersion: null,
    active: true,
    emergencyRelevant: true,
    highRiskFlag: false,
    fhirResourcePreference: 'Observation',
    provenance: PROVENANCE,
    lastUpdated: LAST_UPDATED,
    ...partial,
  };
}

/**
 * Concepts NOT already covered by highRiskComplaintFlags.ts's fast-flag registry.
 * These are common ED presenting complaints that are NOT automatically high-risk on
 * their own (isolated dizziness, isolated fever, etc.) — deliberately kept out of the
 * high-risk fast-flag list so adding recognition for them doesn't silently expand a
 * safety-alerting surface that hasn't had clinical review. See project memory
 * (terminology-recognition round) for the reasoning.
 */
export const LOCAL_GENERAL_COMPLAINT_CONCEPTS: readonly ClinicalConcept[] = Object.freeze([
  baseConcept({
    id: 'dizziness-lightheadedness',
    canonicalName: 'Dizziness',
    displayName: 'Dizziness / lightheadedness',
    category: 'neurologic',
    complaintGroup: 'Neurologic',
    synonyms: ['dizzy', 'dizziness', 'lightheaded', 'light headed', 'lightheadedness', 'vertigo', 'room spinning'],
    layTerms: ['woozy', 'feeling faint', 'head spinning'],
  }),
  baseConcept({
    id: 'abdominal-pain-general',
    canonicalName: 'Abdominal Pain',
    displayName: 'Abdominal pain (general)',
    category: 'gastrointestinal',
    complaintGroup: 'Gastrointestinal',
    synonyms: ['abdominal pain', 'abdo pain', 'belly pain', 'stomach pain', 'tummy pain', 'abdominal discomfort'],
    abbreviations: ['abdo pain'],
    layTerms: ['stomach ache', 'gut pain'],
  }),
  baseConcept({
    id: 'nausea-vomiting',
    canonicalName: 'Nausea and Vomiting',
    displayName: 'Nausea / vomiting',
    category: 'gastrointestinal',
    complaintGroup: 'Gastrointestinal',
    synonyms: ['nausea', 'nauseous', 'vomiting', 'vomit', 'throwing up'],
    layTerms: ['feel sick to my stomach', 'upset stomach', 'being sick'],
  }),
  baseConcept({
    id: 'fever',
    canonicalName: 'Fever',
    displayName: 'Fever',
    type: 'SIGN',
    category: 'infectious',
    complaintGroup: 'Infectious / General',
    synonyms: ['fever', 'feverish', 'febrile', 'running a temperature'],
    layTerms: ['high temperature', 'hot and cold', 'chills and fever'],
  }),
  baseConcept({
    id: 'weakness-general',
    canonicalName: 'Generalized Weakness',
    displayName: 'Weakness (general)',
    category: 'general',
    complaintGroup: 'Pediatric / General',
    synonyms: ['weakness', 'general weakness', 'generalized weakness', 'feeling weak', 'weak all over'],
  }),
  baseConcept({
    id: 'palpitations',
    canonicalName: 'Palpitations',
    displayName: 'Palpitations / irregular heartbeat',
    category: 'cardiovascular',
    complaintGroup: 'Cardiovascular',
    synonyms: ['palpitations', 'heart racing', 'racing heart', 'irregular heartbeat', 'heart pounding', 'skipped a beat', 'heart fluttering'],
  }),
]);

function highRiskFlagToConcept(definition: (typeof HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS)[number]): ClinicalConcept {
  // The fast-flag registry matches on regex, not a flat synonym list — recognizeComplaint()
  // consults HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS directly for matching, this projection
  // exists only so these categories also appear in concept listings/autocomplete/gap
  // review UIs alongside the general concepts above, without re-deriving matching logic.
  return baseConcept({
    id: definition.id,
    canonicalName: definition.label,
    displayName: definition.label,
    category: (definition.categories[0] || 'general').toLowerCase(),
    complaintGroup: definition.categories[0] || 'General',
    highRiskFlag: true,
  });
}

export const LOCAL_HIGH_RISK_COMPLAINT_CONCEPTS: readonly ClinicalConcept[] = Object.freeze(
  HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS.map(highRiskFlagToConcept),
);

/** Full local complaint-concept registry: high-risk fast-flag categories + general complaints. */
export const LOCAL_COMPLAINT_CONCEPTS: readonly ClinicalConcept[] = Object.freeze([
  ...LOCAL_HIGH_RISK_COMPLAINT_CONCEPTS,
  ...LOCAL_GENERAL_COMPLAINT_CONCEPTS,
]);

export function getComplaintConceptById(id: string): ClinicalConcept | undefined {
  return LOCAL_COMPLAINT_CONCEPTS.find((concept) => concept.id === id);
}
