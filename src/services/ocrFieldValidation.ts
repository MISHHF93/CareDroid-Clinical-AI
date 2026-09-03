/**
 * Architect Mode Stage G — OCR must be validated before becoming authoritative.
 * Extracted fields stay provisional until human accept/edit review.
 */
import { ErrorCode, err, ok, resultError, type Result } from '../contracts/results';
import type { OcrExtractedField, OcrJob } from './ocrIntakeApi';

export type AuthoritativeDemographicsPatch = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationalId?: string;
  phone?: string;
  address?: string;
};

const IDENTITY_FIELDS = new Set([
  'firstName',
  'lastName',
  'fullName',
  'dateOfBirth',
  'dob',
  'nationalId',
  'idNumber',
  'phone',
  'address',
]);

const MIN_FIELD_CONFIDENCE = 0.55;
const MIN_OVERALL_CONFIDENCE = 0.5;

export function isOcrFieldAuthoritative(field: OcrExtractedField): boolean {
  if (field.status !== 'accepted' && field.status !== 'edited') return false;
  const value = (field.status === 'edited' ? field.editedValue : field.value)?.trim();
  if (!value) return false;
  if (field.status === 'accepted' && field.confidence < MIN_FIELD_CONFIDENCE) return false;
  return true;
}

/**
 * Build a demographics patch only from human-validated OCR fields.
 * Raw OCR output alone never becomes authoritative.
 */
export function buildAuthoritativeDemographicsFromOcr(
  fields: readonly OcrExtractedField[],
): Result<AuthoritativeDemographicsPatch> {
  const accepted = fields.filter(isOcrFieldAuthoritative);
  if (accepted.length === 0) {
    return err(
      resultError(ErrorCode.VALIDATION, 'No OCR fields validated for authoritative write', {
        detail: 'ocr_not_validated',
        retryable: false,
      }),
    );
  }

  const patch: AuthoritativeDemographicsPatch = {};
  for (const field of accepted) {
    const key = field.field;
    if (!IDENTITY_FIELDS.has(key)) continue;
    const value = (field.status === 'edited' ? field.editedValue : field.value)?.trim();
    if (!value) continue;
    if (key === 'fullName') {
      const parts = value.split(/\s+/);
      if (parts.length >= 2) {
        patch.firstName = patch.firstName ?? parts[0];
        patch.lastName = patch.lastName ?? parts.slice(1).join(' ');
      }
      continue;
    }
    if (key === 'dob') {
      patch.dateOfBirth = value;
      continue;
    }
    if (key === 'idNumber') {
      patch.nationalId = value;
      continue;
    }
    if (
      key === 'firstName' ||
      key === 'lastName' ||
      key === 'dateOfBirth' ||
      key === 'nationalId' ||
      key === 'phone' ||
      key === 'address'
    ) {
      patch[key] = value;
    }
  }

  if (Object.keys(patch).length === 0) {
    return err(
      resultError(ErrorCode.VALIDATION, 'Validated OCR fields did not include demographics', {
        detail: 'ocr_no_demographics',
      }),
    );
  }

  return ok(patch);
}

export function assertOcrJobSafeForIntakeApply(job: OcrJob): Result<true> {
  if (job.status !== 'completed') {
    return err(
      resultError(ErrorCode.VALIDATION, 'OCR job is not completed', {
        detail: `ocr_status_${job.status}`,
      }),
    );
  }
  if (job.overallConfidence < MIN_OVERALL_CONFIDENCE) {
    return err(
      resultError(ErrorCode.VALIDATION, 'OCR overall confidence below threshold', {
        detail: 'ocr_low_confidence',
      }),
    );
  }
  const hasValidatedIdentity = job.extractedFields.some(
    (f) => IDENTITY_FIELDS.has(f.field) && isOcrFieldAuthoritative(f),
  );
  if (!hasValidatedIdentity) {
    return err(
      resultError(ErrorCode.VALIDATION, 'Identity fields require human validation before apply', {
        detail: 'ocr_identity_unvalidated',
      }),
    );
  }
  return ok(true);
}
