import './AIComponents.css';

/**
 * Honesty labels for AI surfaces (PR-8).
 * Never present seed/heuristic/demo outputs as measured foundation-model quality.
 */
export type AiMaturityKind =
  | 'heuristic'
  | 'deterministic'
  | 'measured'
  | 'seed'
  | 'experimental'
  | 'rag-grounded'
  | 'degraded';

const LABELS: Record<AiMaturityKind, { title: string; hint: string }> = {
  heuristic: {
    title: 'Heuristic support',
    hint: 'Rule-based decision support — not a trained clinical foundation model.',
  },
  deterministic: {
    title: 'Deterministic tool',
    hint: 'Validated calculator or rule engine; not generative model output.',
  },
  measured: {
    title: 'Measured eval',
    hint: 'Backed by offline/live evaluation runs (not seed dashboard defaults).',
  },
  seed: {
    title: 'Seed demo metrics',
    hint: 'Demo numbers only — do not use for promotion or clinical performance claims.',
  },
  experimental: {
    title: 'Experimental',
    hint: 'Future/demo capability — not production-validated clinical AI.',
  },
  'rag-grounded': {
    title: 'Retrieved evidence',
    hint: 'Answer attached to retrieved sources; still requires clinician review.',
  },
  degraded: {
    title: 'Degraded mode',
    hint: 'Local/offline adapter or partial path — limited clinical utility.',
  },
};

export type AiMaturityBadgeProps = {
  kind: AiMaturityKind;
  className?: string;
  /** Compact chip without long title */
  compact?: boolean;
};

export function AiMaturityBadge({ kind, className = '', compact = false }: AiMaturityBadgeProps) {
  const meta = LABELS[kind] || LABELS.experimental;
  return (
    <span
      className={`cd-ai-maturity cd-ai-maturity--${kind} ${className}`.trim()}
      title={meta.hint}
      aria-label={`${meta.title}. ${meta.hint}`}
    >
      {compact ? meta.title : meta.title}
    </span>
  );
}

/**
 * Infer maturity from CareDroid structured / chat provenance payloads.
 */
export function inferAiMaturity(input: {
  modelOrEngine?: string;
  responseClass?: string;
  evidenceKinds?: string[];
  seedOnly?: boolean;
  degraded?: boolean;
  experimental?: boolean;
}): AiMaturityKind {
  if (input.seedOnly) return 'seed';
  if (input.degraded) return 'degraded';
  if (input.experimental) return 'experimental';
  if (input.modelOrEngine?.includes('heuristic') || input.modelOrEngine?.includes('careDroidAI')) {
    return 'heuristic';
  }
  if (input.modelOrEngine?.includes('local')) return 'degraded';
  if (input.evidenceKinds?.includes('deterministic_calculator')) return 'deterministic';
  if (
    input.evidenceKinds?.includes('retrieved_chunk') ||
    input.evidenceKinds?.includes('knowledge_registry')
  ) {
    return 'rag-grounded';
  }
  if (
    input.modelOrEngine?.includes('offline-fixture') ||
    input.modelOrEngine?.includes('measured')
  ) {
    return 'measured';
  }
  return 'heuristic';
}
