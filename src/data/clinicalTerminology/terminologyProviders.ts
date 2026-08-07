/**
 * Terminology provider abstraction so CareDroid is not tightly coupled to one
 * source. Only LocalTerminologyProvider is real today — this repository has no
 * licensed CEDIS or SNOMED CT Canadian Edition import available, and fabricating
 * plausible-looking codes would be worse than having none (see
 * localComplaintConcepts.ts's provenance note). CedisTerminologyProvider and
 * SnomedCaTerminologyProvider are typed stubs a real, licensed importer can
 * implement later without changing recognizeComplaint()'s call sites.
 */

import type { ClinicalConcept, TerminologySourceSystem } from './clinicalConceptTypes';
import { LOCAL_COMPLAINT_CONCEPTS, getComplaintConceptById } from './localComplaintConcepts';

export interface TerminologyProvider {
  readonly sourceSystem: TerminologySourceSystem;
  readonly available: boolean;
  listConcepts(): readonly ClinicalConcept[];
  getConceptById(id: string): ClinicalConcept | undefined;
}

export const LocalTerminologyProvider: TerminologyProvider = Object.freeze({
  sourceSystem: 'local',
  available: true,
  listConcepts: () => LOCAL_COMPLAINT_CONCEPTS,
  getConceptById: (id: string) => getComplaintConceptById(id),
});

function unavailableProvider(sourceSystem: TerminologySourceSystem, reason: string): TerminologyProvider {
  return Object.freeze({
    sourceSystem,
    available: false,
    listConcepts: () => {
      throw new Error(`${sourceSystem} terminology provider is not available: ${reason}`);
    },
    getConceptById: () => {
      throw new Error(`${sourceSystem} terminology provider is not available: ${reason}`);
    },
  });
}

/** Not implemented — no licensed CEDIS presenting-complaint dataset is present in this repo. */
export const CedisTerminologyProvider: TerminologyProvider = unavailableProvider(
  'cedis',
  'no licensed CEDIS import present; add a real importer under this file before enabling',
);

/** Not implemented — no licensed SNOMED CT Canadian Edition dataset is present in this repo. */
export const SnomedCaTerminologyProvider: TerminologyProvider = unavailableProvider(
  'snomed-ct-ca',
  'no licensed SNOMED CT CA import present; add a real importer under this file before enabling',
);

export const TERMINOLOGY_PROVIDERS: readonly TerminologyProvider[] = Object.freeze([
  LocalTerminologyProvider,
  CedisTerminologyProvider,
  SnomedCaTerminologyProvider,
]);

export function getAvailableTerminologyProviders(): readonly TerminologyProvider[] {
  return TERMINOLOGY_PROVIDERS.filter((provider) => provider.available);
}
