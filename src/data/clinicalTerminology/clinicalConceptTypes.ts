/**
 * Canonical clinical-concept model for presenting-complaint / symptom recognition.
 *
 * No SNOMED CT / CEDIS / ICD-10-CA codes are fabricated here — this repository does
 * not have a licensed terminology import available, and inventing plausible-looking
 * codes would be worse than having none. Every concept below carries
 * `sourceSystem: 'local'` and `sourceCode: null`. See terminologyProviders.ts for the
 * provider abstraction a real licensed import would plug into.
 */

export type ClinicalConceptType =
  | 'PRESENTING_COMPLAINT'
  | 'SYMPTOM'
  | 'SIGN'
  | 'CONDITION'
  | 'DIAGNOSIS'
  | 'OBSERVATION'
  | 'PROCEDURE'
  | 'MEDICATION'
  | 'ALLERGY'
  | 'CLINICAL_WORKFLOW_TRIGGER';

/** FHIR models transient signs/symptoms as Observation, persistent problems as Condition. */
export type FhirResourcePreference = 'Observation' | 'Condition' | 'none';

export type TerminologySourceSystem = 'local' | 'cedis' | 'snomed-ct-ca' | 'icd-10-ca';

export interface ClinicalConcept {
  id: string;
  canonicalName: string;
  displayName: string;
  type: ClinicalConceptType;
  category: string;
  synonyms: string[];
  abbreviations: string[];
  layTerms: string[];
  spellingVariants: string[];
  language: string;
  sourceSystem: TerminologySourceSystem;
  sourceCode: string | null;
  sourceVersion: string | null;
  active: boolean;
  emergencyRelevant: boolean;
  /** True only for concepts also registered as a high-risk fast-flag in highRiskComplaintFlags.ts. */
  highRiskFlag: boolean;
  complaintGroup: string;
  fhirResourcePreference: FhirResourcePreference;
  provenance: string;
  lastUpdated: string;
}

export type MatchMethod =
  | 'exact'
  | 'synonym'
  | 'abbreviation'
  | 'lay-term'
  | 'spelling-variant'
  | 'substring'
  | 'fuzzy'
  | 'none';

export type ConfidenceTier =
  | 'HIGH_CONFIDENCE'
  | 'MEDIUM_CONFIDENCE'
  | 'LOW_CONFIDENCE'
  | 'NO_MATCH';

export interface ComplaintCandidate {
  conceptId: string;
  canonicalName: string;
  matchedTerm: string;
  matchMethod: MatchMethod;
  confidence: number;
}

export interface ComplaintRecognitionResult {
  rawText: string;
  normalizedText: string;
  matchedConceptId: string | null;
  canonicalName: string | null;
  matchedTerm: string | null;
  matchMethod: MatchMethod;
  confidence: number;
  confidenceTier: ConfidenceTier;
  alternativeCandidates: ComplaintCandidate[];
  sourceSystem: TerminologySourceSystem | null;
  requiresHumanReview: boolean;
  warnings: string[];
}

export function confidenceTierForScore(confidence: number): ConfidenceTier {
  if (confidence >= 0.85) return 'HIGH_CONFIDENCE';
  if (confidence >= 0.6) return 'MEDIUM_CONFIDENCE';
  if (confidence > 0) return 'LOW_CONFIDENCE';
  return 'NO_MATCH';
}
