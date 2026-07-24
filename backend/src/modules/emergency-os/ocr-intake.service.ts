import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { resolveArtifactId } from '../../../../src/config/intakeArtifactRegistry';
import { createOcrProvider } from './ocr-providers';
import { PatientDocumentArtifactService } from './patient-document-artifact.service';
import { EmergencyPatientService } from './emergency-os.services';
import type {
  CreateOcrJobInput,
  OcrAppliedDemographicsPatch,
  OcrExtractedField,
  OcrFieldReviewInput,
  OcrHealthSnapshot,
  OcrJob,
  OcrJobAuditAction,
  OcrJobAuditEntry,
  OcrProvider,
} from './ocr-intake.types';

const MAX_RAW_TEXT_LENGTH = 8000;
const MAX_DATA_URL_LENGTH = 15_000_000; // ~11MB decoded, generous for a scanned document photo
const VALID_DATA_URL_PATTERN = /^data:(image\/(png|jpe?g|webp|gif|heic)|application\/pdf);base64,/i;
const OUTCOME_WINDOW = 20;
const DEGRADED_FAILURE_RATE = 0.2;
const DOWN_FAILURE_RATE = 0.5;
const MIN_SAMPLES_FOR_HEALTH_SIGNAL = 3;
const MIN_FIELD_CONFIDENCE = 0.55;
const HIGH_CONFIDENCE_AUTO_ACCEPT = 0.9;
const IDENTITY_FIELDS = new Set([
  'firstName',
  'lastName',
  'fullName',
  'dateOfBirth',
  'dob',
  'sex',
  'nationalId',
  'idNumber',
  'phone',
  'address',
  'healthCardNumber',
]);

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Strips non-printable control characters (keeps tab/newline/CR) and caps length. */
function sanitizeRawText(text: string): string {
  let result = '';
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const isControlChar = code < 32 && code !== 9 && code !== 10 && code !== 13;
    if (!isControlChar) result += text[index];
    if (result.length >= MAX_RAW_TEXT_LENGTH) break;
  }
  return result;
}

function validateDataUrl(dataUrl: string | undefined): string | undefined {
  if (!dataUrl) return undefined;
  if (dataUrl.length > MAX_DATA_URL_LENGTH)
    return 'Document exceeds the maximum supported upload size.';
  if (!VALID_DATA_URL_PATTERN.test(dataUrl)) return 'Unsupported document file type.';
  return undefined;
}

function referralSourceType(
  parser: string,
): 'referral_note' | 'scanned_note' | 'uploaded_document' {
  if (parser === 'referral' || parser === 'discharge') return 'referral_note';
  if (parser === 'medication' || parser === 'allergy') return 'scanned_note';
  return 'uploaded_document';
}

function isFieldAuthoritative(field: OcrExtractedField): boolean {
  if (field.status !== 'accepted' && field.status !== 'edited') return false;
  const value = (field.status === 'edited' ? field.editedValue : field.value)?.trim();
  if (!value) return false;
  if (field.status === 'accepted' && field.confidence < MIN_FIELD_CONFIDENCE) return false;
  return true;
}

function buildDemographicsFromReviewedFields(
  fields: OcrExtractedField[],
): OcrAppliedDemographicsPatch {
  const patch: OcrAppliedDemographicsPatch = {};
  for (const field of fields.filter(isFieldAuthoritative)) {
    const key = field.field;
    if (!IDENTITY_FIELDS.has(key)) continue;
    const value = (field.status === 'edited' ? field.editedValue : field.value)?.trim();
    if (!value) continue;
    if (key === 'fullName') {
      const parts = value.split(/\s+/);
      if (parts.length >= 2) {
        patch.firstName = patch.firstName ?? parts[0];
        patch.lastName = patch.lastName ?? parts.slice(1).join(' ');
      }
      continue;
    }
    if (key === 'dob') {
      patch.dateOfBirth = value;
      continue;
    }
    if (key === 'idNumber') {
      patch.nationalId = value;
      continue;
    }
    if (key === 'firstName') patch.firstName = value;
    else if (key === 'lastName') patch.lastName = value;
    else if (key === 'dateOfBirth') patch.dateOfBirth = value;
    else if (key === 'sex') patch.sex = value;
    else if (key === 'phone') patch.phone = value;
    else if (key === 'address') patch.address = value;
    else if (key === 'nationalId') patch.nationalId = value;
    else if (key === 'healthCardNumber') patch.healthCardNumber = value;
  }
  return patch;
}

@Injectable()
export class OcrIntakeService implements OnModuleDestroy {
  private readonly jobs = new Map<string, OcrJob>();
  private readonly provider: OcrProvider = createOcrProvider();
  private recentOutcomes: boolean[] = [];

  constructor(
    private readonly documentArtifactService: PatientDocumentArtifactService,
    @Optional() private readonly patientService?: EmergencyPatientService,
  ) {}

  /** Releases the OCR provider's resources (e.g. a live Tesseract worker) on
   * app shutdown, so the process can exit cleanly instead of hanging on an
   * open worker thread. */
  async onModuleDestroy(): Promise<void> {
    await this.provider.terminate?.();
  }

  async createJob(input: CreateOcrJobInput): Promise<OcrJob> {
    const documentType = resolveArtifactId(input.documentTypeHint, input.filename, input.mimeType);
    const actor = input.actor || 'unknown';
    const now = nowIso();

    const job: OcrJob = {
      id: createId('ocr-job'),
      status: 'processing',
      documentType,
      provider: this.provider.name,
      sourceFilename: input.filename,
      mimeType: input.mimeType,
      extractedText: '',
      extractedFields: [],
      overallConfidence: 0,
      warnings: [],
      patientId: input.patientId,
      intakeSessionId: input.intakeSessionId,
      intakeDraftId: input.intakeDraftId,
      appliedToIntake: false,
      createdBy: actor,
      createdAt: now,
      updatedAt: now,
      auditLog: [this.audit('job_created', actor, { documentType, filename: input.filename })],
    };
    this.jobs.set(job.id, job);

    const validationError = validateDataUrl(input.dataUrl);
    if (validationError) {
      job.status = 'failed';
      job.errorMessage = validationError;
      job.warnings = [validationError, 'Continue with manual intake entry for this document.'];
      job.updatedAt = nowIso();
      job.auditLog.push(this.audit('job_failed', 'system', { reason: validationError }));
      this.recordOutcome(false);
      return job;
    }

    try {
      const rawText = sanitizeRawText(input.rawText || '');
      const result = await this.provider.extract({
        rawText,
        dataUrl: input.dataUrl,
        mimeType: input.mimeType,
        documentType,
      });

      job.extractedText = result.text;
      job.extractedFields = result.fields.map((field) => ({
        field: field.field,
        value: field.value,
        confidence: field.confidence,
        status: 'pending' as const,
      }));
      job.overallConfidence = result.overallConfidence;
      job.warnings = result.warnings;
      job.status = 'completed';
      job.updatedAt = nowIso();
      job.auditLog.push(
        this.audit('job_completed', 'system', {
          fieldCount: job.extractedFields.length,
          overallConfidence: job.overallConfidence,
          warningCount: job.warnings.length,
        }),
      );
      this.recordOutcome(true);
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'OCR extraction failed';
      job.warnings = [
        'Document processing failed. Continue with manual intake entry for this document.',
      ];
      job.updatedAt = nowIso();
      job.auditLog.push(this.audit('job_failed', 'system', { error: job.errorMessage }));
      this.recordOutcome(false);
    }

    return job;
  }

  getJob(jobId: string): OcrJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException(`OCR job ${jobId} not found`);
    return job;
  }

  listJobs(filter: { patientId?: string; intakeSessionId?: string } = {}): OcrJob[] {
    return Array.from(this.jobs.values())
      .filter((job) => !filter.patientId || job.patientId === filter.patientId)
      .filter((job) => !filter.intakeSessionId || job.intakeSessionId === filter.intakeSessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  reviewField(jobId: string, field: string, input: OcrFieldReviewInput): OcrJob {
    const job = this.getJob(jobId);
    const target = job.extractedFields.find((extracted) => extracted.field === field);
    if (!target) throw new NotFoundException(`Field ${field} not found on OCR job ${jobId}`);

    const actor = input.actor || 'unknown';
    target.status = input.decision;
    target.editedValue = input.decision === 'edited' ? input.editedValue : undefined;
    target.reviewedBy = actor;
    target.reviewedAt = nowIso();

    job.reviewer = actor;
    job.reviewedAt = nowIso();
    job.updatedAt = nowIso();
    job.auditLog.push(this.audit('field_reviewed', actor, { field, decision: input.decision }));
    return job;
  }

  async applyToIntake(
    jobId: string,
    actor: string,
    options: { autoAcceptHighConfidence?: boolean } = {},
  ): Promise<OcrJob> {
    const job = this.getJob(jobId);
    if (job.status !== 'completed') {
      throw new BadRequestException('Only completed OCR jobs can be applied to an intake draft');
    }

    const actorName = actor || 'unknown';
    const now = nowIso();

    // Optional bulk-accept for high-confidence fields (still human-triggered apply).
    if (options.autoAcceptHighConfidence) {
      for (const field of job.extractedFields) {
        if (field.status !== 'pending') continue;
        if (field.confidence < HIGH_CONFIDENCE_AUTO_ACCEPT) continue;
        if (!String(field.value || '').trim()) continue;
        field.status = 'accepted';
        field.reviewedBy = actorName;
        field.reviewedAt = now;
      }
    }

    const authoritative = job.extractedFields.filter(isFieldAuthoritative);
    if (authoritative.length === 0) {
      throw new BadRequestException(
        'No OCR fields have been accepted or edited. Review identity fields before applying.',
      );
    }

    const demographics = buildDemographicsFromReviewedFields(job.extractedFields);
    if (Object.keys(demographics).length === 0) {
      throw new BadRequestException(
        'Validated OCR fields did not include demographics that can be applied.',
      );
    }

    job.appliedToIntake = true;
    job.appliedAt = now;
    job.updatedAt = now;
    job.appliedDemographics = demographics;
    job.reviewer = actorName;
    job.reviewedAt = now;
    job.patientUpdated = false;
    job.auditLog.push(
      this.audit('applied_to_intake', actorName, {
        fieldCount: authoritative.length,
        demographicsKeys: Object.keys(demographics),
        patientId: job.patientId || null,
      }),
    );

    if (job.patientId && this.patientService) {
      try {
        const existing = this.patientService.getPatient(job.patientId);
        if (existing) {
          const patch: Record<string, unknown> = {};
          if (demographics.firstName) patch.firstName = demographics.firstName;
          if (demographics.lastName) patch.lastName = demographics.lastName;
          if (demographics.dateOfBirth) patch.dob = demographics.dateOfBirth;
          if (demographics.sex) patch.sex = demographics.sex;
          if (demographics.phone) {
            patch.phone = demographics.phone;
            patch.mobilePhone = demographics.phone;
          }
          if (demographics.healthCardNumber) patch.mrn = existing.mrn || demographics.healthCardNumber;
          if (demographics.firstName || demographics.lastName) {
            patch.name = [demographics.firstName || existing.firstName, demographics.lastName || existing.lastName]
              .filter(Boolean)
              .join(' ')
              .trim();
          }
          this.patientService.updatePatient(job.patientId, patch as any);
          job.patientUpdated = true;
          job.auditLog.push(
            this.audit('applied_to_intake', actorName, {
              action: 'patient_demographics_updated',
              patientId: job.patientId,
              fields: Object.keys(patch),
            }),
          );
        }
      } catch {
        // Patient update is best-effort when the board id is missing or stale.
        job.warnings = [
          ...(job.warnings || []),
          'OCR applied to intake draft, but patient board update was skipped.',
        ];
      }
    }

    if (job.patientId) {
      try {
        this.documentArtifactService.extract(job.patientId, {
          patientId: job.patientId,
          encounterId: job.intakeSessionId,
          sourceDocumentId: job.id,
          documentType: job.documentType,
          sourceSystem: 'ocr_intake_service',
          sourceType: referralSourceType(job.documentType),
          rawText: job.extractedText,
          filename: job.sourceFilename,
          confidence: job.overallConfidence,
          extractedBy: `OCR Intake Service (${job.provider})`,
          modelVersion: job.provider,
          sourceState: 'extracted',
          isAiDerived: true,
        });
      } catch {
        // Document artifact enrichment is best-effort; the OCR job itself remains applied.
      }
    }

    return job;
  }

  getHealth(): OcrHealthSnapshot {
    const total = this.recentOutcomes.length;
    const failed = this.recentOutcomes.filter((success) => !success).length;
    const failureRate = total ? Number((failed / total).toFixed(2)) : 0;
    const status: OcrHealthSnapshot['status'] =
      total >= MIN_SAMPLES_FOR_HEALTH_SIGNAL && failureRate >= DOWN_FAILURE_RATE
        ? 'down'
        : total >= MIN_SAMPLES_FOR_HEALTH_SIGNAL && failureRate >= DEGRADED_FAILURE_RATE
          ? 'degraded'
          : 'healthy';

    return {
      status,
      provider: this.provider.name,
      totalJobs: this.jobs.size,
      failedJobs: Array.from(this.jobs.values()).filter((job) => job.status === 'failed').length,
      failureRate,
      lastCheckedAt: nowIso(),
    };
  }

  private recordOutcome(success: boolean) {
    this.recentOutcomes.push(success);
    if (this.recentOutcomes.length > OUTCOME_WINDOW) this.recentOutcomes.shift();
  }

  private audit(
    action: OcrJobAuditAction,
    actor: string,
    details: Record<string, unknown>,
  ): OcrJobAuditEntry {
    return { id: createId('ocr-audit'), action, actor, timestamp: nowIso(), details };
  }
}
