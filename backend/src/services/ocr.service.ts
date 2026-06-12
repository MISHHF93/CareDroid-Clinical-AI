import { ExtractedAllergy, ExtractedDemographics, ExtractedMedication, IntakeInputSource } from '../models/SmartIntake';

export interface NormalizedOcrPayload {
  source: IntakeInputSource;
  demographics: ExtractedDemographics;
  medications: ExtractedMedication[];
  allergies: ExtractedAllergy[];
  notes?: string;
  confidence: number;
}

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
}

export const ocrService = new OCRService();
