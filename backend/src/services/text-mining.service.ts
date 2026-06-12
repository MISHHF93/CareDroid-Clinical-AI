import { ExtractedDemographics } from '../models/SmartIntake';

export class TextMiningService {
  extractDemographics(text = ''): Partial<ExtractedDemographics> {
    const demographics: Partial<ExtractedDemographics> = {};
    const normalized = String(text);
    const dob = normalized.match(
      /\b(?:dob|date of birth)[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    );
    const mrn = normalized.match(/\b(?:mrn|medical record)[:\s#-]+([A-Z0-9-]+)/i);
    const phone = normalized.match(/\b(?:phone|tel)[:\s]+([+0-9().\-\s]{7,})/i);

    if (dob?.[1]) demographics.dateOfBirth = dob[1].trim();
    if (mrn?.[1]) demographics.mrn = mrn[1].trim();
    if (phone?.[1]) demographics.phone = phone[1].trim();
    return demographics;
  }

  extractFromDocument(document: any): Partial<ExtractedDemographics> {
    const text = [
      document?.text,
      document?.body,
      document?.notes,
      document?.ocrPayload?.text,
      document?.ocrPayload?.rawText,
    ]
      .filter(Boolean)
      .join('\n');
    return this.extractDemographics(text);
  }
}

export const textMiningService = new TextMiningService();
