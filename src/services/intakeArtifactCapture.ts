import { invokeUnifiedAiConversational } from './careDroidUnifiedAiNode';
import { getAIPrompt } from '../lib/ai/promptRegistry';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import {
  getIntakeArtifact,
  resolveArtifactId,
  type IntakeArtifactId,
} from '../config/intakeArtifactRegistry';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import OcrIntakeApi, { type OcrJobStatus } from './ocrIntakeApi';
import analyticsService from './analyticsService';
import logger from '../utils/logger';
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
  ocrJobId?: string;
  ocrJobStatus?: OcrJobStatus;
  ocrWarnings: string[];
  ocrFailed: boolean;
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

type BackendOcrOutcome = {
  jobId: string;
  status: OcrJobStatus;
  warnings: string[];
  demographics: IdArtifactDemographics;
  clinical: ClinicalArtifactData;
  fieldCount: number;
  confidence: number;
};

async function tryBackendOcrJob(params: {
  filename: string;
  mimeType: string;
  dataUrl: string;
  rawText: string;
  artifactId: IntakeArtifactId;
  sessionId?: string;
  patientId?: string;
  staff: string;
}): Promise<BackendOcrOutcome | null> {
  if (!isBackendCapabilityEnabled('emergencyOcrIntake')) return null;

  try {
    const job = await OcrIntakeApi.createJob({
      filename: params.filename,
      mimeType: params.mimeType,
      dataUrl: params.dataUrl,
      rawText: params.rawText,
      documentTypeHint: params.artifactId,
      patientId: params.patientId,
      intakeSessionId: params.sessionId,
      actor: params.staff,
    });

    const artifact = getIntakeArtifact(job.documentType as IntakeArtifactId);
    const demographics: IdArtifactDemographics = {};
    const clinical: ClinicalArtifactData = {};
    for (const field of job.extractedFields) {
      const value = field.status === 'edited' && field.editedValue ? field.editedValue : field.value;
      if (artifact.parser === 'identity') {
        (demographics as Record<string, string>)[field.field] = value;
      } else {
        (clinical as Record<string, string>)[field.field] = value;
      }
    }

    if (job.status === 'completed' && job.extractedFields.length > 0) {
      void OcrIntakeApi.applyToIntake(job.id, params.staff).catch((error) => {
        logger.warn('Failed to apply OCR intake job to intake session', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    analyticsService.trackEvent({
      eventName: job.status === 'completed' ? 'document_ocr_processed' : 'document_ocr_failed',
      parameters: {
        documentType: job.documentType,
        fieldCount: job.extractedFields.length,
        confidenceBand: job.overallConfidence >= 0.7 ? 'high' : job.overallConfidence >= 0.4 ? 'medium' : 'low',
        warningCount: job.warnings.length,
      },
    });

    return {
      jobId: job.id,
      status: job.status,
      warnings: job.warnings,
      demographics,
      clinical,
      fieldCount: job.extractedFields.length,
      confidence: job.overallConfidence,
    };
  } catch {
    analyticsService.trackEvent({
      eventName: 'document_ocr_failed',
      parameters: { reason: 'request_error' },
    });
    return null;
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
    const response = await invokeUnifiedAiConversational({
      capabilityId: 'smartIntakeVerification',
      platformServiceId: 'smartIntakeVerification',
      requestType: 'INTAKE_SUGGESTION',
      domain: 'intake',
      sourceScreen: 'intake_artifact_capture',
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
  let ocrJobId: string | undefined;
  let ocrJobStatus: OcrJobStatus | undefined;
  let ocrWarnings: string[] = [];
  let ocrFailed = false;
  let backendConfidence: number | undefined;

  const backendResult = await tryBackendOcrJob({
    filename: file.name,
    mimeType,
    dataUrl,
    rawText,
    artifactId: resolvedArtifactId,
    sessionId,
    patientId: (boardPatient as { id?: string } | null)?.id,
    staff,
  });

  if (backendResult) {
    ocrJobId = backendResult.jobId;
    ocrJobStatus = backendResult.status;
    ocrWarnings = backendResult.warnings;
    ocrFailed = backendResult.status === 'failed';

    if (backendResult.status === 'completed' && backendResult.fieldCount > 0) {
      demographics = backendResult.demographics;
      clinical = backendResult.clinical;
      backendConfidence = backendResult.confidence;
      source = 'backend_ocr';
    }
  }

  if (source !== 'backend_ocr') {
    if (artifact.parser === 'identity') {
      demographics = parseIdArtifactText(rawText);
      if (countPopulatedFields(demographics) <= 1) source = 'filename_heuristic';
    } else {
      clinical = parseClinicalArtifactText(artifact.parser, rawText);
      if (countPopulatedFields(clinical) <= 1) source = 'filename_heuristic';
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

  const auditNote = ocrFailed
    ? `${artifact.label}: document processing failed for "${file.name}" ΓÇö continue with manual verification.`
    : fieldCount > 0
      ? `${artifact.label}: captured ${fieldCount} field${fieldCount === 1 ? '' : 's'} from "${file.name}" ΓÇö staff review required.`
      : `${artifact.label}: document "${file.name}" stored ΓÇö no structured fields detected; continue manual verification.`;

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
    confidence: backendConfidence ?? resolveConfidence(fieldCount, source),
    source,
    rawText,
    auditNote,
    ocrJobId,
    ocrJobStatus,
    ocrWarnings,
    ocrFailed,
  };
}
