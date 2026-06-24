import { Injectable } from '@nestjs/common';
import { HUMAN_REVIEW_DISCLAIMER } from '../../../../lib/ai/safetyPolicy';
import type {
  ArtifactReviewStatus,
  ExtractDocumentArtifactsInput,
  PatientDocumentArtifact,
  PatientDocumentArtifactReviewInput,
  PatientDocumentSource,
} from '../../../../src/types/patientDocumentArtifact';
import { EmergencyPatientService } from './emergency-os.services';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

type PatientArtifactStore = {
  artifacts: PatientDocumentArtifact[];
  sources: PatientDocumentSource[];
};

@Injectable()
export class PatientDocumentArtifactService {
  private readonly store = new Map<string, PatientArtifactStore>();

  constructor(private readonly patientService: EmergencyPatientService) {}

  private ensureStore(patientId: string): PatientArtifactStore {
    if (!this.store.has(patientId)) {
      this.store.set(patientId, { artifacts: [], sources: [] });
    }
    return this.store.get(patientId)!;
  }

  getEnvelope(patientId: string) {
    const bucket = this.ensureStore(patientId);
    const pendingReviewCount = bucket.artifacts.filter(
      (artifact) =>
        artifact.reviewStatus === 'pending_human_review' || artifact.reviewStatus === 'needs_clarification',
    ).length;

    return {
      module: 'Patient Document Artifacts',
      generatedAt: nowIso(),
      source: 'backend-fixture',
      status: 'active',
      data: {
        patientId,
        artifacts: bucket.artifacts,
        sources: bucket.sources,
        pendingReviewCount,
        disclaimer: HUMAN_REVIEW_DISCLAIMER,
      },
      remainingGaps: ['Persistent storage and FHIR DocumentReference export not yet wired'],
    };
  }

  extract(patientId: string, input: ExtractDocumentArtifactsInput) {
    const patients = this.patientService.getPatientEnvelope().data.patients;
    const patientExists = patients.some((patient) => patient.id === patientId);
    if (!patientExists) {
      return {
        module: 'Patient Document Artifacts',
        generatedAt: nowIso(),
        source: 'backend-fixture',
        status: 'error',
        data: {
          patientId,
          artifacts: [],
          sources: [],
          pendingReviewCount: 0,
        },
        remainingGaps: ['Patient not found'],
      };
    }

    const bucket = this.ensureStore(patientId);
    const sourceId = input.sourceDocumentId || createId('doc');
    const timestamp = nowIso();

    const source: PatientDocumentSource = {
      id: sourceId,
      patientId,
      encounterId: input.encounterId,
      documentType: input.documentType,
      sourceSystem: input.sourceSystem || 'uploaded_document',
      sourceType: input.sourceType,
      filename: input.filename,
      capturedAt: timestamp,
      sourceState: input.sourceState || 'extracted',
      fhirResourceHint: 'DocumentReference',
    };

    const artifacts = this.extractArtifactsFromText({
      ...input,
      patientId,
      sourceDocumentId: sourceId,
    });

    bucket.sources.push(source);
    bucket.artifacts = this.mergeArtifacts(bucket.artifacts, artifacts);

    return this.getEnvelope(patientId);
  }

  review(patientId: string, artifactId: string, input: PatientDocumentArtifactReviewInput) {
    const bucket = this.ensureStore(patientId);
    bucket.artifacts = bucket.artifacts.map((artifact) => {
      if (artifact.id !== artifactId) return artifact;
      const clinicalStatus =
        input.clinicalStatus ||
        (input.reviewStatus === 'accepted'
          ? 'confirmed'
          : input.reviewStatus === 'rejected'
            ? 'refuted'
            : artifact.clinicalStatus);

      return {
        ...artifact,
        reviewStatus: input.reviewStatus as ArtifactReviewStatus,
        clinicalStatus,
        reviewedBy: input.reviewer,
        reviewedAt: nowIso(),
        updatedAt: nowIso(),
        safety: {
          ...artifact.safety,
          requiresHumanReview:
            input.reviewStatus === 'pending_human_review' || input.reviewStatus === 'needs_clarification',
        },
      };
    });

    return this.getEnvelope(patientId);
  }

  private mergeArtifacts(
    existing: PatientDocumentArtifact[],
    incoming: PatientDocumentArtifact[],
  ): PatientDocumentArtifact[] {
    const byKey = new Map<string, PatientDocumentArtifact>();
    const keyFor = (artifact: PatientDocumentArtifact) =>
      `${artifact.artifactType}:${artifact.label.toLowerCase().trim()}`;

    existing.forEach((artifact) => byKey.set(keyFor(artifact), artifact));
    incoming.forEach((artifact) => {
      const key = keyFor(artifact);
      if (!byKey.has(key)) byKey.set(key, artifact);
    });

    return Array.from(byKey.values()).sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
  }

  private extractArtifactsFromText(input: ExtractDocumentArtifactsInput): PatientDocumentArtifact[] {
    const rawText = String(input.rawText || '').trim();
    if (!rawText) return [];

    const timestamp = nowIso();
    const isAiDerived = input.isAiDerived ?? true;
    const artifacts: PatientDocumentArtifact[] = [];

    const push = (
      artifact: Omit<PatientDocumentArtifact, 'id' | 'createdAt' | 'updatedAt' | 'patientCardId'> & {
        patientCardId?: string;
      },
    ) => {
      artifacts.push({
        ...artifact,
        id: createId('artifact'),
        patientCardId: artifact.patientCardId || input.patientId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    };

    push({
      patientId: input.patientId,
      encounterId: input.encounterId,
      sourceDocumentId: input.sourceDocumentId,
      artifactType: 'DOCUMENT_METADATA',
      clinicalStatus: 'confirmed',
      reviewStatus: 'accepted',
      label: input.documentType,
      value: { documentType: input.documentType, sourceType: input.sourceType, filename: input.filename },
      confidence: 1,
      provenance: {
        sourceType: input.sourceType,
        sourceSystem: input.sourceSystem || 'uploaded_document',
        extractedBy: 'CareDroid Intake',
        modelVersion: 'intake-v1',
        extractedAt: timestamp,
      },
      safety: { isAiDerived: false, requiresHumanReview: false, mayAffectClinicalWorkflow: false },
      visibility: { showOnPatientCard: true, showOnWhiteboard: false, showInCopilot: true },
      sourceState: input.sourceState || 'extracted',
      fhirResourceHint: 'DocumentReference',
    });

    const labeled = (labels: string[]) => {
      for (const label of labels) {
        const pattern = new RegExp(`\\b${label}\\s*[:\\-]\\s*([^\\n;]{2,160})`, 'i');
        const match = rawText.match(pattern);
        if (match?.[1]) return match[1].trim();
      }
      return undefined;
    };

    const chiefComplaint = labeled(['chief complaint', 'presenting complaint', 'reason for referral']);
    if (chiefComplaint) {
      push({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'CHIEF_COMPLAINT',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: chiefComplaint,
        value: { complaint: chiefComplaint },
        sourceText: chiefComplaint,
        confidence: input.confidence ?? 0.8,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: input.extractedBy || 'CareDroid Copilot',
          modelVersion: input.modelVersion || 'document-extractor-v1',
          extractedAt: timestamp,
        },
        safety: { isAiDerived, requiresHumanReview: true, mayAffectClinicalWorkflow: true },
        visibility: { showOnPatientCard: true, showOnWhiteboard: false, showInCopilot: true },
        sourceState: input.sourceState || 'extracted',
        fhirResourceHint: 'Condition',
      });
    }

    const allergy = labeled(['allergy', 'allergen', 'allergies']);
    if (allergy) {
      push({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'ALLERGY',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: allergy,
        normalizedCode: { system: 'SNOMED_CT', display: allergy },
        value: { substance: allergy },
        sourceText: allergy,
        confidence: input.confidence ?? 0.86,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: input.extractedBy || 'CareDroid Copilot',
          modelVersion: input.modelVersion || 'document-extractor-v1',
          extractedAt: timestamp,
        },
        safety: { isAiDerived, requiresHumanReview: true, mayAffectClinicalWorkflow: true },
        visibility: { showOnPatientCard: true, showOnWhiteboard: false, showInCopilot: true },
        sourceState: input.sourceState || 'extracted',
        fhirResourceHint: 'AllergyIntolerance',
      });
    }

    const medication = labeled(['medication', 'medications', 'current meds']);
    if (medication) {
      push({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'MEDICATION',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: medication,
        normalizedCode: { system: 'RXNORM', display: medication },
        value: { name: medication },
        sourceText: medication,
        confidence: input.confidence ?? 0.82,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: input.extractedBy || 'CareDroid Copilot',
          modelVersion: input.modelVersion || 'document-extractor-v1',
          extractedAt: timestamp,
        },
        safety: { isAiDerived, requiresHumanReview: true, mayAffectClinicalWorkflow: true },
        visibility: { showOnPatientCard: true, showOnWhiteboard: false, showInCopilot: true },
        sourceState: input.sourceState || 'extracted',
        fhirResourceHint: 'MedicationStatement',
      });
    }

    if (/troponin/i.test(rawText)) {
      const pending = /pending|ordered|awaiting/i.test(rawText);
      push({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'LAB_RESULT',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: pending ? 'Troponin mentioned, result pending' : 'Troponin mentioned',
        normalizedCode: { system: 'LOINC', display: 'Troponin' },
        value: { analyte: 'troponin', status: pending ? 'pending' : 'mentioned' },
        sourceText: 'troponin',
        confidence: input.confidence ?? 0.78,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: input.extractedBy || 'CareDroid Copilot',
          modelVersion: input.modelVersion || 'document-extractor-v1',
          extractedAt: timestamp,
        },
        safety: { isAiDerived, requiresHumanReview: true, mayAffectClinicalWorkflow: true },
        visibility: { showOnPatientCard: true, showOnWhiteboard: false, showInCopilot: true },
        sourceState: input.sourceState || 'extracted',
        fhirResourceHint: 'DiagnosticReport',
      });
    }

    if (/chest pain/i.test(rawText)) {
      push({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'COPILOT_TOOL_RECOMMENDATION',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: 'Consider HEART score tool',
        value: { toolId: 'heart-score', reason: 'Chest pain documented' },
        confidence: 0.68,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'copilot_synthesis',
          extractedBy: 'CareDroid Copilot',
          modelVersion: 'document-extractor-v1',
          extractedAt: timestamp,
        },
        safety: { isAiDerived: true, requiresHumanReview: true, mayAffectClinicalWorkflow: false },
        visibility: { showOnPatientCard: true, showOnWhiteboard: false, showInCopilot: true },
        sourceState: input.sourceState || 'extracted',
        fhirResourceHint: 'CarePlan',
      });
    }

    return artifacts;
  }
}