import { describe, expect, it } from 'vitest';
import {
  assertOcrJobSafeForIntakeApply,
  buildAuthoritativeDemographicsFromOcr,
  isOcrFieldAuthoritative,
} from './ocrFieldValidation';
import type { OcrExtractedField, OcrJob } from './ocrIntakeApi';

const field = (partial: Partial<OcrExtractedField> & Pick<OcrExtractedField, 'field' | 'value'>): OcrExtractedField => ({
  confidence: 0.9,
  status: 'pending',
  ...partial,
});

describe('ocrFieldValidation', () => {
  it('rejects pending OCR fields as non-authoritative', () => {
    expect(
      isOcrFieldAuthoritative(
        field({ field: 'firstName', value: 'Ada', status: 'pending', confidence: 0.99 }),
      ),
    ).toBe(false);
  });

  it('accepts human-accepted high-confidence fields', () => {
    expect(
      isOcrFieldAuthoritative(
        field({ field: 'firstName', value: 'Ada', status: 'accepted', confidence: 0.9 }),
      ),
    ).toBe(true);
  });

  it('does not write demographics from unvalidated OCR', () => {
    const result = buildAuthoritativeDemographicsFromOcr([
      field({ field: 'firstName', value: 'Ada', status: 'pending' }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.detail).toBe('ocr_not_validated');
    }
  });

  it('builds demographics only from accepted/edited identity fields', () => {
    const result = buildAuthoritativeDemographicsFromOcr([
      field({ field: 'firstName', value: 'Ada', status: 'accepted', confidence: 0.9 }),
      field({ field: 'lastName', value: 'Lovelace', status: 'edited', editedValue: 'Lovelace', confidence: 0.4 }),
      field({ field: 'chiefComplaint', value: 'Chest pain', status: 'accepted', confidence: 0.95 }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.firstName).toBe('Ada');
      expect(result.data.lastName).toBe('Lovelace');
      expect((result.data as Record<string, unknown>).chiefComplaint).toBeUndefined();
    }
  });

  it('blocks apply when identity fields are not validated', () => {
    const job = {
      id: 'j1',
      status: 'completed',
      documentType: 'id',
      provider: 'tesseract',
      extractedText: 'Ada',
      extractedFields: [field({ field: 'firstName', value: 'Ada', status: 'pending' })],
      overallConfidence: 0.8,
      warnings: [],
      appliedToIntake: false,
      createdBy: 'test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLog: [],
    } as OcrJob;

    const result = assertOcrJobSafeForIntakeApply(job);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.detail).toBe('ocr_identity_unvalidated');
    }
  });
});
