import { apiFetch, parseApiResponse } from './apiClient';
import type {
  ExtractDocumentArtifactsInput,
  PatientDocumentArtifact,
  PatientDocumentArtifactReviewInput,
  PatientDocumentSource,
} from '../types/patientDocumentArtifact';
import {
  applyArtifactReview,
  extractDocumentArtifacts,
  mergePatientDocumentArtifacts,
} from './patientDocumentArtifactModel';

export type PatientDocumentArtifactEnvelope = {
  module: string;
  generatedAt: string;
  source: string;
  status: string;
  data: {
    patientId: string;
    artifacts: PatientDocumentArtifact[];
    sources: PatientDocumentSource[];
    pendingReviewCount: number;
  };
  remainingGaps: string[];
};

function localEnvelope(
  patientId: string,
  artifacts: PatientDocumentArtifact[],
  sources: PatientDocumentSource[] = [],
): PatientDocumentArtifactEnvelope {
  const pendingReviewCount = artifacts.filter(
    (artifact) =>
      artifact.reviewStatus === 'pending_human_review' || artifact.reviewStatus === 'needs_clarification',
  ).length;

  return {
    module: 'Patient Document Artifacts',
    generatedAt: new Date().toISOString(),
    source: 'frontend-local',
    status: 'active',
    data: { patientId, artifacts, sources, pendingReviewCount },
    remainingGaps: [],
  };
}

export async function fetchPatientDocumentArtifacts(
  patientId: string,
): Promise<PatientDocumentArtifactEnvelope> {
  try {
    const response = await apiFetch(`/api/emergency/patients/${patientId}/document-artifacts`);
    const parsed = await (parseApiResponse as (r: Response) => Promise<PatientDocumentArtifactEnvelope>)(response);
    if (parsed?.data?.artifacts) return parsed;
  } catch {
    // Fall through to empty local envelope.
  }
  return localEnvelope(patientId, [], []);
}

export async function extractPatientDocumentArtifacts(
  input: ExtractDocumentArtifactsInput,
): Promise<PatientDocumentArtifactEnvelope> {
  const local = extractDocumentArtifacts(input);

  try {
    const response = await apiFetch(`/api/emergency/patients/${input.patientId}/document-artifacts/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const parsed = await (parseApiResponse as (r: Response) => Promise<PatientDocumentArtifactEnvelope>)(response);
    if (parsed?.data?.artifacts?.length) return parsed;
  } catch {
    // Fall through to local extraction.
  }

  return localEnvelope(input.patientId, local.artifacts, [local.source]);
}

export async function reviewPatientDocumentArtifact(
  patientId: string,
  reviewInput: PatientDocumentArtifactReviewInput,
  currentArtifacts: PatientDocumentArtifact[] = [],
): Promise<PatientDocumentArtifactEnvelope> {
  try {
    const response = await apiFetch(
      `/api/emergency/patients/${patientId}/document-artifacts/${reviewInput.artifactId}/review`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewInput),
      },
    );
    const parsed = await (parseApiResponse as (r: Response) => Promise<PatientDocumentArtifactEnvelope>)(response);
    if (parsed?.data?.artifacts) return parsed;
  } catch {
    // Fall through to local review.
  }

  const updated = currentArtifacts.map((artifact) =>
    artifact.id === reviewInput.artifactId
      ? applyArtifactReview(artifact, {
          reviewStatus: reviewInput.reviewStatus,
          clinicalStatus: reviewInput.clinicalStatus,
          reviewer: reviewInput.reviewer,
          reviewNote: reviewInput.reviewNote,
        })
      : artifact,
  );

  return localEnvelope(patientId, updated);
}

export function mergeArtifactEnvelopes(
  patientId: string,
  existing: PatientDocumentArtifact[] = [],
  incoming: PatientDocumentArtifact[] = [],
  sources: PatientDocumentSource[] = [],
): PatientDocumentArtifactEnvelope {
  return localEnvelope(patientId, mergePatientDocumentArtifacts(existing, incoming), sources);
}