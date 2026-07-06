import { getIntakeArtifact } from '../../../../src/config/intakeArtifactRegistry';
import { parseIdArtifactText } from '../../../../src/utils/idArtifactParser';
import { parseClinicalArtifactText } from '../../../../src/utils/clinicalArtifactParser';
import type { OcrProvider, OcrProviderExtractInput, OcrProviderResult } from './ocr-intake.types';

const LOW_CONFIDENCE_THRESHOLD = 0.6;

function fieldConfidence(
  field: string,
  artifact: { extractableFields: readonly string[] },
): number {
  return artifact.extractableFields.includes(field) ? 0.82 : 0.55;
}

/**
 * Deterministic, dependency-free OCR provider for local/dev use. Reuses the same
 * text-heuristic parsers the frontend capture flow uses, so field extraction stays
 * consistent whether the OCR runs client-side or server-side. Swap `createOcrProvider`
 * to a real vision/OCR provider in production without changing any caller contract.
 */
export class MockOcrProvider implements OcrProvider {
  readonly name = 'mock';

  async extract(input: OcrProviderExtractInput): Promise<OcrProviderResult> {
    const artifact = getIntakeArtifact(input.documentType);
    const text = input.rawText.trim();
    const warnings: string[] = [];

    if (!text) {
      warnings.push('No extractable text found in document; manual entry required.');
      return { text: '', fields: [], overallConfidence: 0, warnings };
    }

    const fields: Array<{ field: string; value: string; confidence: number }> = [];

    if (artifact.parser === 'identity') {
      const demographics = parseIdArtifactText(text);
      for (const [field, value] of Object.entries(demographics)) {
        if (value === undefined || value === null || String(value).trim() === '') continue;
        fields.push({ field, value: String(value), confidence: fieldConfidence(field, artifact) });
      }
    } else {
      const clinical = parseClinicalArtifactText(artifact.parser, text);
      for (const [field, value] of Object.entries(clinical)) {
        if (value === undefined || value === null || String(value).trim() === '') continue;
        fields.push({ field, value: String(value), confidence: fieldConfidence(field, artifact) });
      }
    }

    for (const required of artifact.requiredForRegistration || []) {
      if (!fields.some((extracted) => extracted.field === required)) {
        warnings.push(`Missing required field: ${required}`);
      }
    }

    const overallConfidence = fields.length
      ? Number(
          (fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length).toFixed(2),
        )
      : 0;

    if (overallConfidence > 0 && overallConfidence < LOW_CONFIDENCE_THRESHOLD) {
      warnings.push('Overall extraction confidence is low; all fields require staff verification.');
    }

    return { text, fields, overallConfidence, warnings };
  }
}

export function createOcrProvider(providerName?: string): OcrProvider {
  const name = providerName || process.env.OCR_PROVIDER || 'mock';
  switch (name) {
    case 'mock':
    default:
      return new MockOcrProvider();
  }
}
