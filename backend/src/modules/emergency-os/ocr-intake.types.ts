import type { IntakeArtifactId } from '../../../../src/config/intakeArtifactRegistry';

export type OcrJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type OcrExtractedFieldStatus = 'pending' | 'accepted' | 'edited' | 'rejected';

export interface OcrExtractedField {
  field: string;
  value: string;
  confidence: number;
  status: OcrExtractedFieldStatus;
  editedValue?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export type OcrJobAuditAction =
  | 'job_created'
  | 'job_completed'
  | 'job_failed'
  | 'field_reviewed'
  | 'applied_to_intake';

export interface OcrJobAuditEntry {
  id: string;
  action: OcrJobAuditAction;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
}

/** Demographics committed only after human review (or high-confidence bulk accept). */
export type OcrAppliedDemographicsPatch = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: string;
  phone?: string;
  address?: string;
  nationalId?: string;
  healthCardNumber?: string;
};

export interface OcrJob {
  id: string;
  status: OcrJobStatus;
  documentType: IntakeArtifactId;
  provider: string;
  sourceFilename?: string;
  mimeType?: string;
  extractedText: string;
  extractedFields: OcrExtractedField[];
  overallConfidence: number;
  warnings: string[];
  organizationId?: string;
  patientId?: string;
  intakeSessionId?: string;
  intakeDraftId?: string;
  reviewer?: string;
  reviewedAt?: string;
  appliedToIntake: boolean;
  appliedAt?: string;
  /** Authoritative demographics derived only from accepted/edited fields. */
  appliedDemographics?: OcrAppliedDemographicsPatch;
  /** True when apply also updated the emergency patient board record. */
  patientUpdated?: boolean;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  auditLog: OcrJobAuditEntry[];
}

export interface CreateOcrJobInput {
  filename?: string;
  mimeType?: string;
  dataUrl?: string;
  rawText?: string;
  documentTypeHint?: string;
  organizationId?: string;
  patientId?: string;
  intakeSessionId?: string;
  intakeDraftId?: string;
  actor?: string;
}

export interface OcrFieldReviewInput {
  decision: 'accepted' | 'edited' | 'rejected';
  editedValue?: string;
  actor?: string;
}

export interface OcrProviderExtractInput {
  rawText: string;
  dataUrl?: string;
  mimeType?: string;
  documentType: IntakeArtifactId;
}

export interface OcrProviderResult {
  text: string;
  fields: Array<{ field: string; value: string; confidence: number }>;
  overallConfidence: number;
  warnings: string[];
}

export interface OcrProvider {
  readonly name: string;
  extract(input: OcrProviderExtractInput): Promise<OcrProviderResult>;
  /** Releases any held resources (e.g. a live OCR worker). Optional — providers
   * with nothing to release (like a pure text-parsing mock) need not implement it. */
  terminate?(): Promise<void>;
}

export type OcrServiceHealthStatus = 'healthy' | 'degraded' | 'down';

export interface OcrHealthSnapshot {
  status: OcrServiceHealthStatus;
  provider: string;
  totalJobs: number;
  failedJobs: number;
  failureRate: number;
  lastCheckedAt: string;
}
