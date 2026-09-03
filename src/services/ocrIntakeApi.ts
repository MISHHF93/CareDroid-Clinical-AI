import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { assertOcrJobSafeForIntakeApply } from './ocrFieldValidation';

const jsonHeaders = { 'Content-Type': 'application/json' };
const OCR_INTAKE_UNAVAILABLE_MESSAGE = 'OCR intake service is not available.';

export type OcrExtractedFieldStatus = 'pending' | 'accepted' | 'edited' | 'rejected';

export type OcrExtractedField = {
  field: string;
  value: string;
  confidence: number;
  status: OcrExtractedFieldStatus;
  editedValue?: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type OcrJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type OcrJob = {
  id: string;
  status: OcrJobStatus;
  documentType: string;
  provider: string;
  sourceFilename?: string;
  mimeType?: string;
  extractedText: string;
  extractedFields: OcrExtractedField[];
  overallConfidence: number;
  warnings: string[];
  patientId?: string;
  intakeSessionId?: string;
  intakeDraftId?: string;
  reviewer?: string;
  reviewedAt?: string;
  appliedToIntake: boolean;
  appliedAt?: string;
  appliedDemographics?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    sex?: string;
    phone?: string;
    address?: string;
    nationalId?: string;
    healthCardNumber?: string;
  };
  patientUpdated?: boolean;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  auditLog: Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
    details: Record<string, unknown>;
  }>;
};

export type CreateOcrJobInput = {
  filename?: string;
  mimeType?: string;
  dataUrl?: string;
  rawText?: string;
  documentTypeHint?: string;
  patientId?: string;
  intakeSessionId?: string;
  intakeDraftId?: string;
  actor?: string;
};

export type OcrHealthSnapshot = {
  status: 'healthy' | 'degraded' | 'down';
  provider: string;
  totalJobs: number;
  failedJobs: number;
  failureRate: number;
  lastCheckedAt: string;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!isBackendCapabilityEnabled('emergencyOcrIntake')) {
    throw new Error(OCR_INTAKE_UNAVAILABLE_MESSAGE);
  }
  const response = await apiFetch(path, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse(response);
  if (!response?.ok) {
    throw new Error(payload?.error || payload?.message || getApiErrorMessage(null, response));
  }
  return payload as T;
}

async function getJson<T>(path: string): Promise<T> {
  if (!isBackendCapabilityEnabled('emergencyOcrIntake')) {
    throw new Error(OCR_INTAKE_UNAVAILABLE_MESSAGE);
  }
  const response = await apiFetch(path);
  const payload = await parseApiResponse(response);
  if (!response?.ok) {
    throw new Error(payload?.error || payload?.message || getApiErrorMessage(null, response));
  }
  return payload as T;
}

export const OcrIntakeApi = Object.freeze({
  createJob(input: CreateOcrJobInput): Promise<OcrJob> {
    return postJson('/api/emergency/intake/ocr-jobs', input);
  },
  getJob(jobId: string): Promise<OcrJob> {
    return getJson(`/api/emergency/intake/ocr-jobs/${jobId}`);
  },
  listJobs(
    filter: { patientId?: string; intakeSessionId?: string } = {},
  ): Promise<{ jobs: OcrJob[] }> {
    const params = new URLSearchParams();
    if (filter.patientId) params.set('patientId', filter.patientId);
    if (filter.intakeSessionId) params.set('intakeSessionId', filter.intakeSessionId);
    const query = params.toString();
    return getJson(`/api/emergency/intake/ocr-jobs${query ? `?${query}` : ''}`);
  },
  reviewField(
    jobId: string,
    field: string,
    decision: 'accepted' | 'edited' | 'rejected',
    editedValue: string | undefined,
    actor: string,
  ): Promise<OcrJob> {
    return postJson(
      `/api/emergency/intake/ocr-jobs/${jobId}/fields/${encodeURIComponent(field)}/review`,
      {
        decision,
        editedValue,
        actor,
      },
    );
  },
  /**
   * Apply OCR to intake only after client-side validation gate.
   * Pass preloadedJob when available to avoid a race; otherwise fetches job first.
   * Set autoAcceptHighConfidence to bulk-accept ≥0.90 confidence pending fields before apply.
   */
  async applyToIntake(
    jobId: string,
    actor: string,
    preloadedJob?: OcrJob,
    options: { autoAcceptHighConfidence?: boolean } = {},
  ): Promise<OcrJob> {
    let job = preloadedJob ?? (await OcrIntakeApi.getJob(jobId));
    if (options.autoAcceptHighConfidence) {
      // Mirror server bulk-accept so client gate sees accepted fields.
      job = {
        ...job,
        extractedFields: job.extractedFields.map((field) => {
          if (field.status !== 'pending') return field;
          if (field.confidence < 0.9 || !String(field.value || '').trim()) return field;
          return {
            ...field,
            status: 'accepted' as const,
            reviewedBy: actor,
            reviewedAt: new Date().toISOString(),
          };
        }),
      };
    }
    const gate = assertOcrJobSafeForIntakeApply(job);
    if (!gate.ok) {
      throw new Error(gate.error.message);
    }
    return postJson(`/api/emergency/intake/ocr-jobs/${jobId}/apply`, {
      actor,
      autoAcceptHighConfidence: Boolean(options.autoAcceptHighConfidence),
    });
  },
  fetchHealth(): Promise<OcrHealthSnapshot> {
    return getJson('/api/emergency/intake/ocr-health');
  },
});

export default OcrIntakeApi;
