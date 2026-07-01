import { callAI } from '../lib/ai/client';
import { getAIPrompt } from '../lib/ai/promptRegistry';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import {
  getIntakeArtifact,
  resolveArtifactId,
  type IntakeArtifactId,
} from '../config/intakeArtifactRegistry';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import SmartIntakeApi from './smartIntakeApi';
import {
  inferTextHintsFromFilename,
  mergeDemographics,
  parseIdArtifactText,
  type IdArtifactDemographics,
} from '../utils/idArtifactParser';
import {
  parseClinicalArtifactText,
  type ClinicalArtifactData,
} from '../utils/clinicalArtifactParser';
import {
  artifactExtractionToFieldRows,
  type IdentityExtractedField,
} from '../utils/intakeArtifactFields';

export type IntakeArtifactCaptureSource =
  | 'filename_heuristic'
  | 'text_parser'
  | 'backend_ocr'
  | 'ai_assist'
  | 'staff_paste';

export type CapturedIntakeArtifact = {
  artifactId: IntakeArtifactId;
  artifactLabel: string;
  reviewStep: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
  documentType: string;
  demographics: IdArtifactDemographics;
  clinical: ClinicalArtifactData;
  extractedFields: IdentityExtractedField[];
  confidence: number;
  source: IntakeArtifactCaptureSource;
  rawText: string;
  auditNote: string;
};

export type CaptureIntakeArtifactOptions = {
  file: File;
  artifactId?: string | null;
  sessionId?: string;
  staff?: string;
  supplementalText?: string;
  boardPatient?: Record<string, unknown> | null;
  seedFields?: IdentityExtractedField[];
};

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function countPopulatedFields(values: Record<string, string | undefined>): number {
  return Object.values(values).filter((value) => String(value || '').trim()).length;
}

function buildCaptureText(file: File, supplementalText = ''): string {
  return [inferTextHintsFromFilename(file.name), supplementalText].filter(Boolean).join('\n');
}

function resolveConfidence(fieldCount: number, source: IntakeArtifactCaptureSource): number {
  if (fieldCount >= 4) return source === 'backend_ocr' ? 0.86 : 0.72;
  if (fieldCount >= 2) return 0.58;
  if (fieldCount >= 1) return 0.42;
  return 0.2;
}

function parseAiPayload(content: string, artifactId: IntakeArtifactId): {
  demographics: IdArtifactDemographics;
  clinical: ClinicalArtifactData;
} {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    const artifact = getIntakeArtifact(artifactId);
    if (artifact.parser === 'identity') {
      return { demographics: parseIdArtifactText(content), clinical: {} };
    }
    return {
      demographics: {},
      clinical: parseClinicalArtifactText(artifact.parser, content),
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    const artifact = getIntakeArtifact(artifactId);
    if (artifact.parser === 'identity') {
      return {
        demographics: parseIdArtifactText(
          Object.entries(parsed)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n'),
        ),
        clinical: {},
      };
    }
    return { demographics: {}, clinical: parsed };
  } catch {
    const artifact = getIntakeArtifact(artifactId);
    if (artifact.parser === 'identity') {
      return { demographics: parseIdArtifactText(content), clinical: {} };
    }
    return {
      demographics: {},
      clinical: parseClinicalArtifactText(artifact.parser, content),
    };
  }
}

async function tryAiAssistExtraction(
  rawText: string,
  artifactId: IntakeArtifactId,
): Promise<{ demographics: IdArtifactDemographics; clinical: ClinicalArtifactData }> {
  if (!rawText.trim()) return { demographics: {}, clinical: {} };
  const artifact = getIntakeArtifact(artifactId);
  const fieldKeys = artifact.extractableFields.join(', ');

  try {
    const response = await callAI({
      requestType: 'INTAKE_SUGGESTION',
      systemPrompt: `${getAIPrompt('smart-intake-assistant').prompt}\n${HUMAN_REVIEW_DISCLAIMER}`,
      message: [
        `Extract fields for a ${artifact.label} document.`,
        `Return JSON only with keys from: ${fieldKeys}.`,
        'Do not invent values that are not supported by the text.',
        rawText.slice(0, 4000),
      ].join('\n'),
      context: {
        smartIntake: {
          verificationOnly: true,
          artifactExtraction: true,
          artifactId,
        },
      },
    });
    const content =
      (typeof response?.content === 'string' && response.content) ||
      (typeof response?.data?.response === 'string' && response.data.response) ||
      '';
    return parseAiPayload(content, artifactId);
  } catch {
    return { demographics: {}, clinical: {} };
  }
}

export async function captureIntakeArtifact({
  file,
  artifactId = null,
  sessionId = '',
  staff = 'Current staff',
  supplementalText = '',
  boardPatient = null,
  seedFields = [] as any[],
}: CaptureIntakeArtifactOptions): Promise<CapturedIntakeArtifact> {
  const dataUrl = await readFileAsDataUrl(file);
  const mimeType = file.type || 'application/octet-stream';
  const resolvedArtifactId = resolveArtifactId(artifactId, file.name, mimeType);
  const artifact = getIntakeArtifact(resolvedArtifactId);
  const rawText = buildCaptureText(file, supplementalText);

  let source: IntakeArtifactCaptureSource = 'text_parser';
  let demographics: IdArtifactDemographics = {};
  let clinical: ClinicalArtifactData = {};

  if (artifact.parser === 'identity') {
    demographics = parseIdArtifactText(rawText);
    if (countPopulatedFields(demographics) <= 1) source = 'filename_heuristic';
  } else {
    clinical = parseClinicalArtifactText(artifact.parser, rawText);
    if (countPopulatedFields(clinical) <= 1) source = 'filename_heuristic';
  }

  if (supplementalText.trim()) {
    if (artifact.parser === 'identity') {
      demographics = mergeDemographics(parseIdArtifactText(supplementalText), demographics);
    } else {
      clinical = {
        ...parseClinicalArtifactText(artifact.parser, supplementalText),
        ...clinical,
      };
    }
    source = 'staff_paste';
  }

  const populatedCount =
    artifact.parser === 'identity'
      ? countPopulatedFields(demographics)
      : countPopulatedFields(clinical);

  if (populatedCount < 3) {
    const aiResult = await tryAiAssistExtraction(rawText, resolvedArtifactId);
    const aiCount =
      artifact.parser === 'identity'
        ? countPopulatedFields(aiResult.demographics)
        : countPopulatedFields(aiResult.clinical);

    if (aiCount > populatedCount) {
      if (artifact.parser === 'identity') {
        demographics = mergeDemographics(demographics, aiResult.demographics);
      } else {
        clinical = { ...clinical, ...aiResult.clinical };
      }
      source = 'ai_assist';
    }
  }

  if (isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession') && sessionId) {
    await SmartIntakeApi.uploadDocument(
      sessionId,
      {
        filename: file.name,
        mimeType,
        content: dataUrl,
        type: artifact.backendDocumentType,
        text: rawText,
        ocrPayload: { rawText, text: rawText, artifactId: resolvedArtifactId },
      },
      staff,
    );

    const submitPayload =
      artifact.parser === 'identity'
        ? {
            source: artifact.intakeInputSource,
            demographics,
            confidence: resolveConfidence(countPopulatedFields(demographics), 'backend_ocr'),
            notes: `${artifact.label} captured from ${file.name}`,
          }
        : {
            source: artifact.intakeInputSource,
            demographics: {},
            medications:
              artifact.parser === 'medication' && clinical.medication
                ? [{ name: clinical.medication, dose: clinical.dose, route: clinical.route, frequency: clinical.frequency }]
                : [],
            allergies:
              artifact.parser === 'allergy' && (clinical.allergy || clinical.substance)
                ? [
                    {
                      substance: clinical.substance || clinical.allergy || 'Unknown',
                      reaction: clinical.reaction,
                      severity: clinical.severity,
                    },
                  ]
                : [],
            notes: [clinical.diagnoses, clinical.recommendations, clinical.followUpInstructions]
              .filter(Boolean)
              .join(' | '),
            confidence: resolveConfidence(countPopulatedFields(clinical), 'backend_ocr'),
          };

    if (populatedCount > 0) {
      await SmartIntakeApi.submitOcrResult(sessionId, submitPayload, staff);
    }
    source = 'backend_ocr';
  }

  const fieldCount =
    artifact.parser === 'identity'
      ? countPopulatedFields(demographics)
      : countPopulatedFields(clinical);

  const extractedFields = artifactExtractionToFieldRows(artifact, {
    demographics,
    clinical,
    boardPatient,
    seedFields,
  });

  const auditNote =
    fieldCount > 0
      ? `${artifact.label}: captured ${fieldCount} field${fieldCount === 1 ? '' : 's'} from "${file.name}" — staff review required.`
      : `${artifact.label}: document "${file.name}" stored — no structured fields detected; continue manual verification.`;

  return {
    artifactId: resolvedArtifactId,
    artifactLabel: artifact.label,
    reviewStep: artifact.reviewStep,
    dataUrl,
    filename: file.name,
    mimeType,
    documentType: artifact.backendDocumentType,
    demographics,
    clinical,
    extractedFields,
    confidence: resolveConfidence(fieldCount, source),
    source,
    rawText,
    auditNote,
  };
}