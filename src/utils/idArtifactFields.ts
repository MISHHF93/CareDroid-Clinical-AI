import type { IdArtifactDemographics } from './idArtifactParser';

export type IdentityExtractedField = {
  field: string;
  extracted: string;
  existing: string;
  status: 'verified' | 'unverified' | 'conflicting';
  source: string;
};

const CORE_IDENTITY_FIELDS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'sex',
  'phone',
  'healthCardNumber',
  'address',
  'bloodType',
  'documentNumber',
  'email',
  'mrn',
  'nationality',
  'documentExpiry',
] as const;

const FIELD_SOURCE_LABEL: Record<string, string> = {
  firstName: 'ID document',
  lastName: 'ID document',
  dateOfBirth: 'ID document',
  sex: 'ID document',
  phone: 'ID document',
  healthCardNumber: 'Health card OCR',
  address: 'ID document',
  bloodType: 'ID document',
  documentNumber: 'ID document',
  email: 'ID document',
  mrn: 'Medical record',
  nationality: 'ID document',
  documentExpiry: 'ID document',
  allergy: 'Allergy card',
  medication: 'Medication list',
};

function normalizeCompare(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function resolveExistingValue(
  field: string,
  boardPatient: Record<string, unknown> | null | undefined,
  fallbackExisting = '',
): string {
  if (!boardPatient) return String(fallbackExisting || '').trim();

  const map: Record<string, unknown> = {
    firstName: boardPatient.firstName,
    lastName: boardPatient.lastName,
    dateOfBirth: boardPatient.dob ?? boardPatient.dateOfBirth,
    sex: boardPatient.sex,
    phone: boardPatient.phone ?? boardPatient.mobilePhone,
    healthCardNumber: boardPatient.healthCardNumber ?? boardPatient.healthCard ?? boardPatient.mrn,
    address: boardPatient.address,
    bloodType: boardPatient.bloodType,
    email: boardPatient.email,
    mrn: boardPatient.mrn,
  };

  const fromBoard = map[field];
  return String(fromBoard ?? fallbackExisting ?? '').trim();
}

function fieldStatus(extracted: string, existing: string): IdentityExtractedField['status'] {
  if (!extracted) return 'unverified';
  if (!existing) return 'unverified';
  return normalizeCompare(extracted) === normalizeCompare(existing) ? 'verified' : 'conflicting';
}

export function demographicsToFieldRows(
  demographics: IdArtifactDemographics,
  {
    sourceLabel = 'Document capture',
    boardPatient = null,
    seedFields = [] as any[],
  }: {
    sourceLabel?: string;
    boardPatient?: Record<string, unknown> | null;
    seedFields?: IdentityExtractedField[];
  } = {},
): IdentityExtractedField[] {
  const seedByField = new Map(seedFields.map((field) => [field.field, field]));

  const rows: IdentityExtractedField[] = CORE_IDENTITY_FIELDS.map((field) => {
    const extracted = String(demographics[field as keyof IdArtifactDemographics] || '').trim();
    const seed = seedByField.get(field);
    const existing = resolveExistingValue(field, boardPatient, seed?.existing || '');
    return {
      field,
      extracted: extracted || seed?.extracted || '',
      existing,
      status: fieldStatus(extracted || seed?.extracted || '', existing),
      source: extracted ? sourceLabel : seed?.source || FIELD_SOURCE_LABEL[field] || sourceLabel,
    };
  }).filter((row) => row.extracted || row.existing);

  const extraSeedFields = seedFields.filter(
    (field) => !CORE_IDENTITY_FIELDS.includes(field.field as (typeof CORE_IDENTITY_FIELDS)[number]),
  );

  return [...rows, ...extraSeedFields];
}

export function mergeExtractedFieldRows(
  current: IdentityExtractedField[],
  captured: IdentityExtractedField[],
): IdentityExtractedField[] {
  const merged = new Map(current.map((field) => [field.field, { ...field }]));

  captured.forEach((field) => {
    const previous = merged.get(field.field);
    if (!field.extracted && !field.existing) return;

    const nextExisting = field.existing || previous?.existing || '';
    const nextExtracted = field.extracted || previous?.extracted || '';
    merged.set(field.field, {
      field: field.field,
      extracted: nextExtracted,
      existing: nextExisting,
      status: fieldStatus(nextExtracted, nextExisting),
      source: field.extracted ? field.source : previous?.source || field.source,
    });
  });

  return Array.from(merged.values());
}
