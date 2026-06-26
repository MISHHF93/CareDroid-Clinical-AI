import type { IntakeArtifactDefinition } from '../config/intakeArtifactRegistry';
import type { IdArtifactDemographics } from './idArtifactParser';
import {
  demographicsToFieldRows,
  mergeExtractedFieldRows,
  type IdentityExtractedField,
} from './idArtifactFields';
import type { ClinicalArtifactData } from './clinicalArtifactParser';

export type { IdentityExtractedField };
export { mergeExtractedFieldRows };

function fieldStatus(extracted: string, existing: string): IdentityExtractedField['status'] {
  if (!extracted) return 'unverified';
  if (!existing) return 'unverified';
  return extracted.trim().toLowerCase() === existing.trim().toLowerCase() ? 'verified' : 'conflicting';
}

export function clinicalDataToFieldRows(
  data: ClinicalArtifactData,
  artifact: IntakeArtifactDefinition,
  {
    boardPatient = null,
    seedFields = [] as any[],
  }: {
    boardPatient?: Record<string, unknown> | null;
    seedFields?: IdentityExtractedField[];
  } = {},
): IdentityExtractedField[] {
  const seedByField = new Map(seedFields.map((field) => [field.field, field]));

  return artifact.extractableFields
    .map((field) => {
      const extracted = String(data[field] || '').trim();
      const seed = seedByField.get(field);
      const existing = String(seed?.existing || '').trim();
      if (!extracted && !existing) return null;
      return {
        field,
        extracted: extracted || seed?.extracted || '',
        existing,
        status: fieldStatus(extracted || seed?.extracted || '', existing),
        source: extracted ? artifact.label : seed?.source || artifact.label,
      };
    })
    .filter((row): row is IdentityExtractedField => Boolean(row));
}

export function artifactExtractionToFieldRows(
  artifact: IntakeArtifactDefinition,
  {
    demographics = {} as any,
    clinical = {} as any,
    boardPatient = null,
    seedFields = [] as any[],
  }: {
    demographics?: IdArtifactDemographics;
    clinical?: ClinicalArtifactData;
    boardPatient?: Record<string, unknown> | null;
    seedFields?: IdentityExtractedField[];
  },
): IdentityExtractedField[] {
  if (artifact.parser === 'identity') {
    return demographicsToFieldRows(demographics, {
      sourceLabel: artifact.label,
      boardPatient,
      seedFields,
    });
  }

  return clinicalDataToFieldRows(clinical, artifact, { boardPatient, seedFields });
}