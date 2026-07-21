/** Normalize artifact-router text so train and inference share the same label-type signal. */

export function inferRouterLabelType(text: string): 'name' | 'route' {
  const trimmed = text.trim().replace(/^(name|route):\s+/i, '');
  if (trimmed.startsWith('/')) return 'route';
  return 'name';
}

/**
 * Soft path-family cue from surface form only (no gold labels).
 * Kept separate from type: hints so catalog noise (e.g. prompt rows with
 * /tools/calculators/* routes) does not inject a conflicting type token.
 */
export function extractPathFamily(text: string): string | undefined {
  const bare = text.trim().replace(/^(name|route):\s+/i, '');
  if (/\/tools\/calculators(\/|$)/i.test(bare) || /\/calculators\//i.test(bare)) {
    return 'calculator';
  }
  if (/\/tools\//i.test(bare)) return 'tool';
  if (/^\/platform|platform-admin|\/products(\/|$)/i.test(bare)) return 'platform';
  if (/^\/api(\/|$)|frontend-api-/i.test(bare)) return 'api-endpoint';
  return undefined;
}

/** Clinical score / calculator name shape (excludes plugin/connector tools). */
export function isScoreLikeName(text: string): boolean {
  const bare = text.trim().replace(/^(name|route):\s+/i, '');
  if (bare.startsWith('/')) return false;
  if (/\b(plugin|connector|integration|firewall|dashboard|orchestrator)\b/i.test(bare)) {
    return false;
  }
  return /\b(score|index|ratio|scale|criteria|assessment|calculator|sofa|meld|gcs|apache|news2|qsofa|curb-?65|wells|timi|apgar|centor|bode|homa|epworth|glasgow|nihss|chads?2|has-bled|grace|heart score|shock index|gold|rockall|rox)\b/i.test(
    bare,
  );
}

/** Doc / spec / runbook name shape. */
export function isDocumentLikeName(text: string): boolean {
  const bare = text.trim().replace(/^(name|route):\s+/i, '');
  if (bare.startsWith('/')) return false;
  return /\b(specification|specifications|architecture|manual|runbook|reference|readme|stage [a-z]\b|journey map|monitoring v\d|compression|characterized|execution paths|page specifications)\b/i.test(
    bare,
  );
}

/**
 * Runtime soft type hint for inference. Conservative — only high-precision patterns.
 */
export function inferArtifactTypeHintFromText(text: string): string | undefined {
  const bare = text.trim().replace(/^(name|route):\s+/i, '');
  const pathFamily = extractPathFamily(text);
  if (pathFamily === 'calculator') return 'calculator';
  if (pathFamily === 'platform') return 'platform';
  if (pathFamily === 'api-endpoint') return 'api-endpoint';
  if (/^\/products/.test(bare)) return 'platform';
  if (/^\/settings/.test(bare)) return 'route';
  if (/\.service$|dto$/i.test(bare)) return 'backend-service';
  if (/\bprompt\b/i.test(bare) && !pathFamily) return 'prompt';
  if (/registry|disclaimer/i.test(bare) && !pathFamily && !isScoreLikeName(bare)) return 'registry';
  if (/^frontend-api-|reports-|dashboard|status|policies|tracking/i.test(bare.toLowerCase())) {
    return 'api-endpoint';
  }
  if (isScoreLikeName(bare)) return 'calculator';
  if (isDocumentLikeName(bare)) return 'document';
  return undefined;
}

export function formatArtifactRouterInput(
  text: string,
  labelType?: 'name' | 'route',
  artifactType?: string,
): string {
  const kind = labelType ?? inferRouterLabelType(text);
  const trimmed = text.trim().replace(/^(name|route):\s+/i, '');

  // Gold-compatible type prefixes used at train time for high-volume structural classes.
  const structuralTypes = new Set(['platform', 'api-endpoint', 'backend-service']);
  let typeHint = '';
  if (artifactType && structuralTypes.has(artifactType)) {
    typeHint = `${artifactType} | `;
  } else {
    const inferred = inferArtifactTypeHintFromText(`${kind}: ${trimmed}`);
    if (inferred && structuralTypes.has(inferred)) {
      typeHint = `${inferred} | `;
    }
  }

  const extras: string[] = [];

  // Path family only when it agrees with gold (train) or when no gold (inference).
  const pathFamily = extractPathFamily(`${kind}: ${trimmed}`);
  if (pathFamily && (!artifactType || artifactType === pathFamily)) {
    extras.push(`path:${pathFamily}`);
  }

  // Name-shape cues — label-free at inference; gold-gated at train so we do not
  // teach "Calculator Plugin" (tool) as shape:score-like.
  if (isScoreLikeName(trimmed) && (!artifactType || artifactType === 'calculator')) {
    extras.push('shape:score-like');
  }
  if (isDocumentLikeName(trimmed) && (!artifactType || artifactType === 'document')) {
    extras.push('shape:document');
  }

  const suffix = extras.length ? ` | ${extras.join(' | ')}` : '';
  return `${kind}: ${typeHint}${trimmed}${suffix}`;
}

/**
 * Optional post-classifier path prior. Disabled by default — forcing
 * `/tools/calculators/*` → calculator regressed held-out accuracy because the
 * catalog labels some calculator-shaped routes as prompt/tool.
 * Enable only with ARTIFACT_PATH_PRIOR=true for experimental runs.
 */
export function applyRouterPathPrior(
  text: string,
  predicted: string,
  confidence: number,
): { artifactType: string; confidence: number; overridden: boolean } {
  if (process.env.ARTIFACT_PATH_PRIOR !== 'true') {
    return { artifactType: predicted, confidence, overridden: false };
  }
  const family = extractPathFamily(text);
  // Only override low-confidence disagreements to limit catalog-noise damage.
  if (family === 'calculator' && predicted !== 'calculator' && confidence < 0.55) {
    return {
      artifactType: 'calculator',
      confidence: Math.max(confidence, 0.75),
      overridden: true,
    };
  }
  return { artifactType: predicted, confidence, overridden: false };
}
