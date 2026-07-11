/**
 * CareDroid AI response provenance contract (PR-6).
 *
 * Clinically meaningful outputs must declare supporting evidence, confidence,
 * missing information, uncertainty, population limits, and human-review requirements.
 * LLMs summarize/retrieve/draft; they do not independently invent patient facts or scores.
 */

export const PROVENANCE_CONTRACT_VERSION = '1.0.0';

export type ProvenanceEvidenceKind =
  | 'retrieved_chunk'
  | 'knowledge_registry'
  | 'deterministic_calculator'
  | 'live_operational_data'
  | 'structured_rule'
  | 'user_input'
  | 'unknown';

export interface ProvenanceEvidenceItem {
  id: string;
  kind: ProvenanceEvidenceKind;
  title?: string;
  sourceId?: string;
  artifactId?: string;
  version?: string;
  excerpt?: string;
  url?: string;
  score?: number;
  evidenceGrade?: string;
  jurisdiction?: string;
}

export interface ProvenanceSourceVersion {
  sourceId: string;
  title?: string;
  version?: string;
  retrievedAt?: string;
  artifactId?: string;
}

export interface AiResponseProvenance {
  contractVersion: typeof PROVENANCE_CONTRACT_VERSION;
  evidence: ProvenanceEvidenceItem[];
  sourceVersions: ProvenanceSourceVersion[];
  confidence: number;
  missingInformation: string[];
  uncertainty: string;
  applicablePopulation: string;
  limitations: string[];
  recommendedReviewerRole: string;
  requiresClinicianReview: true;
  generatedAt: string;
  modelOrEngine?: string;
  responseClass: 'clinical' | 'operational' | 'informational' | 'error';
  /** Optional: claims stripped by entailment grounding */
  strippedClaims?: string[];
  unsupportedClaimRate?: number;
}

export interface BuildProvenanceInput {
  confidence?: number;
  evidence?: Array<Partial<ProvenanceEvidenceItem> & { id?: string; kind?: ProvenanceEvidenceKind }>;
  sourceVersions?: ProvenanceSourceVersion[];
  missingInformation?: string[];
  uncertainty?: string;
  applicablePopulation?: string;
  limitations?: string[];
  recommendedReviewerRole?: string;
  modelOrEngine?: string;
  responseClass?: AiResponseProvenance['responseClass'];
  strippedClaims?: string[];
  unsupportedClaimRate?: number;
  /** RAG sources shape from MedicalSource / citation panel */
  ragSources?: Array<{
    id?: string;
    title?: string;
    url?: string;
    date?: string;
    specialty?: string;
    evidenceLevel?: string;
    organization?: string;
  }>;
  ragChunks?: Array<{
    id?: string;
    text?: string;
    score?: number;
    metadata?: {
      sourceId?: string;
      title?: string;
      artifactId?: string;
      evidenceGrade?: string;
      jurisdiction?: string;
      metadata?: Record<string, unknown>;
    };
  }>;
  warnings?: string[];
  redFlags?: string[];
  missingFromData?: unknown;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter((s) => s.trim().length > 0);
}

/**
 * Build a complete provenance block with safe defaults.
 * `requiresClinicianReview` is always true for this contract.
 */
export function buildAiResponseProvenance(input: BuildProvenanceInput = {}): AiResponseProvenance {
  const evidence: ProvenanceEvidenceItem[] = [];

  for (const item of input.evidence || []) {
    evidence.push({
      id: item.id || `ev-${evidence.length + 1}`,
      kind: item.kind || 'unknown',
      title: item.title,
      sourceId: item.sourceId,
      artifactId: item.artifactId,
      version: item.version,
      excerpt: item.excerpt ? String(item.excerpt).slice(0, 280) : undefined,
      url: item.url,
      score: typeof item.score === 'number' ? clamp01(item.score) : undefined,
      evidenceGrade: item.evidenceGrade,
      jurisdiction: item.jurisdiction,
    });
  }

  for (const chunk of input.ragChunks || []) {
    const meta = chunk.metadata || {};
    const nested = (meta.metadata || {}) as Record<string, unknown>;
    evidence.push({
      id: chunk.id || `chunk-${evidence.length + 1}`,
      kind: 'retrieved_chunk',
      title: meta.title,
      sourceId: meta.sourceId,
      artifactId:
        (meta as any).artifactId ||
        (nested.artifactId as string | undefined) ||
        meta.sourceId,
      excerpt: chunk.text ? String(chunk.text).slice(0, 280) : undefined,
      score: typeof chunk.score === 'number' ? clamp01(chunk.score) : undefined,
      evidenceGrade:
        (meta as any).evidenceGrade ||
        (nested.evidenceGrade as string | undefined),
      jurisdiction:
        (meta as any).jurisdiction || (nested.jurisdiction as string | undefined),
    });
  }

  for (const source of input.ragSources || []) {
    if (!source?.id) continue;
    if (evidence.some((e) => e.sourceId === source.id || e.artifactId === source.id)) continue;
    evidence.push({
      id: `src-${source.id}`,
      kind: 'knowledge_registry',
      title: source.title,
      sourceId: source.id,
      artifactId: source.id.startsWith('kn-') ? source.id : undefined,
      url: source.url,
      version: source.date,
      evidenceGrade: source.evidenceLevel,
    });
  }

  const sourceVersions: ProvenanceSourceVersion[] = [
    ...(input.sourceVersions || []),
  ];
  for (const ev of evidence) {
    const sid = ev.artifactId || ev.sourceId;
    if (!sid) continue;
    if (sourceVersions.some((s) => s.sourceId === sid || s.artifactId === sid)) continue;
    sourceVersions.push({
      sourceId: sid,
      title: ev.title,
      version: ev.version,
      artifactId: ev.artifactId,
      retrievedAt: new Date().toISOString(),
    });
  }

  const missingInformation = unique([
    ...asStringArray(input.missingInformation),
    ...asStringArray(input.missingFromData),
  ]);

  const limitations = unique([
    ...(input.limitations || []),
    'Decision support only — not a diagnosis, prescription, or autonomous clinical order.',
    'Verify against primary sources and bedside assessment before acting.',
    evidence.length === 0
      ? 'No retrieved evidence was attached; treat as ungrounded draft guidance.'
      : '',
  ].filter(Boolean));

  const confidence = clamp01(
    typeof input.confidence === 'number'
      ? input.confidence
      : evidence.length
        ? 0.55
        : 0.25,
  );

  const uncertainty =
    input.uncertainty ||
    (missingInformation.length
      ? `Incomplete inputs: ${missingInformation.slice(0, 5).join(', ')}.`
      : evidence.length
        ? 'Evidence attached; residual uncertainty remains until clinician review.'
        : 'Low grounding: limited or no supporting evidence retrieved.');

  const redFlags = asStringArray(input.redFlags);
  const recommendedReviewerRole =
    input.recommendedReviewerRole ||
    (redFlags.length ? 'emergency_physician' : 'Responsible clinician');

  return {
    contractVersion: PROVENANCE_CONTRACT_VERSION,
    evidence,
    sourceVersions,
    confidence,
    missingInformation,
    uncertainty,
    applicablePopulation:
      input.applicablePopulation ||
      'Adult emergency / acute care operational context unless otherwise specified; not a universal protocol.',
    limitations,
    recommendedReviewerRole,
    requiresClinicianReview: true,
    generatedAt: new Date().toISOString(),
    modelOrEngine: input.modelOrEngine,
    responseClass: input.responseClass || (evidence.length ? 'clinical' : 'informational'),
    ...(input.strippedClaims?.length ? { strippedClaims: input.strippedClaims } : {}),
    ...(typeof input.unsupportedClaimRate === 'number'
      ? { unsupportedClaimRate: clamp01(input.unsupportedClaimRate) }
      : {}),
  };
}

export function isAiResponseProvenance(value: unknown): value is AiResponseProvenance {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.contractVersion === PROVENANCE_CONTRACT_VERSION &&
    Array.isArray(v.evidence) &&
    Array.isArray(v.sourceVersions) &&
    typeof v.confidence === 'number' &&
    Array.isArray(v.missingInformation) &&
    typeof v.uncertainty === 'string' &&
    typeof v.applicablePopulation === 'string' &&
    Array.isArray(v.limitations) &&
    typeof v.recommendedReviewerRole === 'string' &&
    v.requiresClinicianReview === true &&
    typeof v.generatedAt === 'string'
  );
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}
