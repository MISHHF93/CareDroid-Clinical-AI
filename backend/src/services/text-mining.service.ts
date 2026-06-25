import { ExtractedDemographics } from '../models/SmartIntake';

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export class TextMiningService {
  extractDemographics(text = ''): Partial<ExtractedDemographics> {
    const demographics: Partial<ExtractedDemographics> = {};
    const normalized = String(text);

    const firstName = normalized.match(
      /\b(?:first\s*name|given\s*name)\s*[:\-]\s*([A-Za-z][A-Za-z' -]{0,40})\b/i,
    );
    const lastName = normalized.match(
      /\b(?:last\s*name|surname|family\s*name)\s*[:\-]\s*([A-Za-z][A-Za-z' -]{0,40})\b/i,
    );
    const dob = normalized.match(
      /\b(?:dob|date of birth|birth date|born)\s*[:\-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    );
    const mrn = normalized.match(/\b(?:mrn|medical record)[:\s#-]+([A-Z0-9-]+)/i);
    const healthCard = normalized.match(
      /\b(?:health\s*card|hcn|ohip|ramq|phn)\s*[:\-#]?\s*([A-Z0-9][A-Z0-9\- ]{4,})\b/i,
    );
    const phone = normalized.match(/\b(?:phone|tel|mobile|cell)[:\s]+([+0-9().\-\s]{7,})/i);
    const sex = normalized.match(/\b(?:sex|gender)\s*[:\-]\s*(male|female|m|f)\b/i);
    const address = normalized.match(/\b(?:address|addr)\s*[:\-]\s*([^\n;]{6,80})/i);
    const email = normalized.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);

    if (firstName?.[1]) demographics.firstName = titleCase(firstName[1].trim());
    if (lastName?.[1]) demographics.lastName = titleCase(lastName[1].trim());
    if (dob?.[1]) demographics.dateOfBirth = dob[1].trim();
    if (mrn?.[1]) demographics.mrn = mrn[1].trim();
    if (healthCard?.[1]) demographics.healthCardNumber = healthCard[1].replace(/\s+/g, '').trim();
    if (phone?.[1]) demographics.phone = phone[1].trim();
    if (address?.[1]) demographics.address = address[1].trim();
    if (email?.[0]) demographics.email = email[0];
    if (sex?.[1]) {
      const token = sex[1].toLowerCase();
      demographics.sex =
        token === 'm' || token === 'male'
          ? 'Male'
          : token === 'f' || token === 'female'
            ? 'Female'
            : titleCase(token);
    }

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
