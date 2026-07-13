import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { MedicalSource } from '../dto/medical-source.dto';

const VALID_EVIDENCE_LEVELS = new Set<NonNullable<MedicalSource['evidenceLevel']>>([
  'A',
  'B',
  'C',
  'expert_opinion',
]);

/**
 * Registry JSON is untrusted disk input — `evidence_grade` is a free-form
 * string on disk but `MedicalSource.evidenceLevel` is a closed literal union.
 * Unrecognized values fall back to undefined (not_assessed) rather than
 * coercing arbitrary registry content into the type.
 */
function normalizeEvidenceLevel(value: string | undefined): MedicalSource['evidenceLevel'] {
  return value && (VALID_EVIDENCE_LEVELS as Set<string>).has(value)
    ? (value as MedicalSource['evidenceLevel'])
    : undefined;
}

export interface RegistryArtifactLite {
  id: string;
  title?: string;
  specialty?: string;
  topic?: string;
  evidence_grade?: string;
  jurisdiction?: string;
  review_status?: string;
  expires_at?: string | null;
  rag_ingest_allowed?: boolean;
  license?: string;
  content_path?: string;
  publisher?: string;
}

/**
 * Load accepted knowledge-registry artifacts for metadata enrichment at ingest time.
 */
export function loadKnowledgeRegistryArtifacts(repoRoot = process.cwd()): RegistryArtifactLite[] {
  const candidates = [
    join(repoRoot, 'data', 'knowledge-registry', 'artifacts'),
    join(repoRoot, '..', 'data', 'knowledge-registry', 'artifacts'),
  ];

  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    try {
      return readdirSync(dir)
        .filter((n) => n.endsWith('.json'))
        .map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')) as RegistryArtifactLite);
    } catch {
      return [];
    }
  }
  return [];
}

export function findRegistryArtifactForSource(
  source: MedicalSource,
  artifacts: RegistryArtifactLite[],
): RegistryArtifactLite | undefined {
  const byId = artifacts.find((a) => a.id === source.id);
  if (byId) return byId;

  // Match by content path suffix when source id is path-derived
  const title = String(source.title || '').toLowerCase();
  return artifacts.find((a) => {
    if (a.content_path && source.url && source.url.includes(a.content_path)) return true;
    if (a.title && title && a.title.toLowerCase().includes(title.slice(0, 24))) return true;
    return false;
  });
}

/**
 * Merge registry provenance fields into MedicalSource for chunk metadata.
 */
export function enrichSourceWithRegistry(
  source: MedicalSource,
  artifact?: RegistryArtifactLite,
): MedicalSource {
  if (!artifact) return source;
  return {
    ...source,
    id: artifact.id || source.id,
    title: source.title || artifact.title || source.id,
    organization: source.organization || artifact.publisher,
    specialty: source.specialty || artifact.specialty,
    evidenceLevel: source.evidenceLevel || normalizeEvidenceLevel(artifact.evidence_grade),
    authoritative:
      source.authoritative ??
      (artifact.review_status === 'accepted' ||
        artifact.review_status === 'accepted_with_limitations'),
    metadata: {
      ...(source.metadata || {}),
      artifactId: artifact.id,
      evidenceGrade: artifact.evidence_grade,
      jurisdiction: artifact.jurisdiction,
      reviewStatus: artifact.review_status,
      expiresAt: artifact.expires_at,
      ragIngestAllowed: artifact.rag_ingest_allowed,
      license: artifact.license,
      topic: artifact.topic,
      knowledgeRegistry: true,
    },
  };
}
