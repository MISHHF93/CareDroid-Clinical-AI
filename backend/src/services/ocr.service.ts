import {
  ExtractedAllergy,
  ExtractedDemographics,
  ExtractedMedication,
  IntakeInputSource,
} from '../models/SmartIntake';

export interface NormalizedOcrPayload {
  source: IntakeInputSource;
  demographics: ExtractedDemographics;
  medications: ExtractedMedication[];
  allergies: ExtractedAllergy[];
  notes?: string;
  confidence: number;
}

export type OcrValidationResult = {
  authoritative: boolean;
  reasons: string[];
  payload: NormalizedOcrPayload;
};

const MIN_OCR_CONFIDENCE = 0.55;

export class OCRService {
  async initialize(): Promise<void> {
    // Placeholder for future tenant-specific OCR provider startup.
  }

  normalizePayload(payload: any): NormalizedOcrPayload {
    return {
      source: (payload?.source as IntakeInputSource) || 'ocr_result',
      demographics: payload?.demographics || {},
      medications: payload?.medications || [],
      allergies: payload?.allergies || [],
      notes: payload?.notes,
      confidence: Number.isFinite(payload?.confidence) ? payload.confidence : 0.72,
    };
  }

  /**
   * Architect Mode Stage G: OCR output is provisional until validated.
   * Never treat raw normalizePayload as authoritative demographics write.
   */
  validateForAuthoritativeWrite(
    payload: NormalizedOcrPayload,
    options: { humanReviewed?: boolean } = {},
  ): OcrValidationResult {
    const reasons: string[] = [];
    if (!options.humanReviewed) {
      reasons.push('human_review_required');
    }
    if (!(payload.confidence >= MIN_OCR_CONFIDENCE)) {
      reasons.push('confidence_below_threshold');
    }
    const demo = payload.demographics || {};
    const hasIdentity = Boolean(
      (demo as any).firstName ||
        (demo as any).lastName ||
        (demo as any).fullName ||
        (demo as any).dateOfBirth,
    );
    if (!hasIdentity) {
      reasons.push('missing_identity_fields');
    }
    return {
      authoritative: reasons.length === 0,
      reasons,
      payload,
    };
  }
}

export const ocrService = new OCRService();
