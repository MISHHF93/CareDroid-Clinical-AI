/**
 * CareDroid interaction inventory classification model.
 * Used by static scanner tests and documentation.
 */

export const INTERACTION_CLASSES = Object.freeze({
  LIVE: 'LIVE',
  DISABLED_REASONED: 'DISABLED_REASONED',
  HIDDEN_FLAG: 'HIDDEN_FLAG',
  BROKEN: 'BROKEN',
  ORPHAN: 'ORPHAN',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
} as const);

export type InteractionClass = (typeof INTERACTION_CLASSES)[keyof typeof INTERACTION_CLASSES];

export type InteractionControlKind =
  | 'button'
  | 'submit'
  | 'link'
  | 'role-button'
  | 'menu-item'
  | 'icon-button'
  | 'clickable-div';

export type InteractionControlRecord = Readonly<{
  id: string;
  file: string;
  line: number;
  kind: InteractionControlKind;
  snippet: string;
  accessibleNameHint: string | null;
  hasClickHandler: boolean;
  hasSubmitType: boolean;
  hasNavigation: boolean;
  isDisabled: boolean;
  hasDisabledReason: boolean;
  class: InteractionClass;
  reason: string;
}>;

export type InteractionInventorySummary = Readonly<{
  generatedAt: string;
  total: number;
  byClass: Readonly<Record<string, number>>;
  broken: readonly InteractionControlRecord[];
  disabledWithoutReason: readonly InteractionControlRecord[];
  filesScanned: number;
}>;

const HANDLER_RE =
  /\bonClick\s*=|\bonSubmit\s*=|\bto\s*=|\bhref\s*=|\bnavigate\s*\(|\bdispatch\s*\(|\buseMutation\b|\btype\s*=\s*["']submit["']/;
const DISABLED_REASON_RE =
  /\btitle\s*=|\baria-describedby\s*=|\baria-label\s*=|\bdisabledReason\s*=|\bdata-disabled-reason\s*=/;

export type ClassifyControlInput = Readonly<{
  kind: InteractionControlKind;
  attributesAndBody: string;
  isUnmountedFile?: boolean;
}>;

/**
 * Classify a single control fragment from static analysis.
 * Runtime Playwright harness refines LIVE vs silent-failure BROKEN.
 */
export function classifyInteractionControl(input: ClassifyControlInput): {
  class: InteractionClass;
  reason: string;
  hasClickHandler: boolean;
  hasSubmitType: boolean;
  hasNavigation: boolean;
  isDisabled: boolean;
  hasDisabledReason: boolean;
  accessibleNameHint: string | null;
} {
  const src = input.attributesAndBody;
  const hasClickHandler = /\bonClick\s*=/.test(src);
  const hasSubmitType = /\btype\s*=\s*["']submit["']/.test(src) || input.kind === 'submit';
  const hasNavigation =
    /\bto\s*=/.test(src) ||
    /\bhref\s*=/.test(src) ||
    /\bnavigate\s*\(/.test(src) ||
    input.kind === 'link';
  const isLiterallyDisabled =
    /\bdisabled\s*=\s*\{\s*true\s*\}/.test(src) ||
    (/\sdisabled(?:\s|>|\/)/.test(src) && !/\bdisabled\s*=\s*\{/.test(src));
  const hasDisabledReason = DISABLED_REASON_RE.test(src);
  const nameMatch = src.match(/\baria-label\s*=\s*["'`]([^"'`]+)["'`]/);
  const accessibleNameHint = nameMatch ? nameMatch[1].trim() : null;

  if (input.isUnmountedFile) {
    return {
      class: INTERACTION_CLASSES.ORPHAN,
      reason: 'Control lives in unmounted / quarantined surface',
      hasClickHandler,
      hasSubmitType,
      hasNavigation,
      isDisabled: isLiterallyDisabled,
      hasDisabledReason,
      accessibleNameHint,
    };
  }

  if (isLiterallyDisabled) {
    if (hasDisabledReason || accessibleNameHint) {
      return {
        class: INTERACTION_CLASSES.DISABLED_REASONED,
        reason: 'Control is disabled with accessible explanation',
        hasClickHandler,
        hasSubmitType,
        hasNavigation,
        isDisabled: true,
        hasDisabledReason: true,
        accessibleNameHint,
      };
    }
    return {
      class: INTERACTION_CLASSES.BROKEN,
      reason: 'Control is always disabled without title/aria-describedby/disabledReason',
      hasClickHandler,
      hasSubmitType,
      hasNavigation,
      isDisabled: true,
      hasDisabledReason: false,
      accessibleNameHint,
    };
  }

  if (hasClickHandler || hasSubmitType || hasNavigation || HANDLER_RE.test(src)) {
    return {
      class: INTERACTION_CLASSES.LIVE,
      reason: 'Static analysis found handler, navigation, or submit binding',
      hasClickHandler,
      hasSubmitType,
      hasNavigation,
      isDisabled: false,
      hasDisabledReason,
      accessibleNameHint,
    };
  }

  // Buttons without any wiring are broken (decorative)
  if (
    input.kind === 'button' ||
    input.kind === 'role-button' ||
    input.kind === 'icon-button' ||
    input.kind === 'menu-item' ||
    input.kind === 'clickable-div'
  ) {
    return {
      class: INTERACTION_CLASSES.BROKEN,
      reason: 'Interactive control has no onClick/onSubmit/navigation binding',
      hasClickHandler: false,
      hasSubmitType: false,
      hasNavigation: false,
      isDisabled: false,
      hasDisabledReason: false,
      accessibleNameHint,
    };
  }

  return {
    class: INTERACTION_CLASSES.NEEDS_REVIEW,
    reason: 'Could not statically determine execution path',
    hasClickHandler,
    hasSubmitType,
    hasNavigation,
    isDisabled: false,
    hasDisabledReason,
    accessibleNameHint,
  };
}

/**
 * Extract button-like JSX openings from a source file for static inventory.
 * Heuristic (not full AST) — intentionally conservative for CI speed.
 */
export function extractControlCandidates(
  source: string,
  filePath: string,
): Array<{
  line: number;
  kind: InteractionControlKind;
  attributesAndBody: string;
  snippet: string;
}> {
  const lines = source.split(/\r?\n/);
  const results: Array<{
    line: number;
    kind: InteractionControlKind;
    attributesAndBody: string;
    snippet: string;
  }> = [];

  const openPatterns: Array<{ re: RegExp; kind: InteractionControlKind }> = [
    { re: /<button\b/i, kind: 'button' },
    { re: /<Button\b/, kind: 'button' },
    { re: /<IconButton\b/, kind: 'icon-button' },
    { re: /<Link\b/, kind: 'link' },
    { re: /<NavLink\b/, kind: 'link' },
    { re: /role\s*=\s*["']button["']/, kind: 'role-button' },
    { re: /role\s*=\s*["']menuitem["']/, kind: 'menu-item' },
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const { re, kind } of openPatterns) {
      if (!re.test(line)) continue;
      // Collect a window of following lines for multi-line JSX props
      const window = lines.slice(i, Math.min(lines.length, i + 12)).join('\n');
      // Stop at next major open tag of same class if very long
      const attributesAndBody = window.slice(0, 1200);
      results.push({
        line: i + 1,
        kind:
          kind === 'button' && /type\s*=\s*["']submit["']/.test(attributesAndBody)
            ? 'submit'
            : kind,
        attributesAndBody,
        snippet: line.trim().slice(0, 160),
      });
      break;
    }
  }

  return results.map((r) => ({ ...r, file: filePath }) as typeof r);
}

export function summarizeInteractionRecords(
  records: readonly InteractionControlRecord[],
  filesScanned: number,
): InteractionInventorySummary {
  const byClass: Record<string, number> = {};
  for (const rec of records) {
    byClass[rec.class] = (byClass[rec.class] || 0) + 1;
  }
  return Object.freeze({
    generatedAt: new Date().toISOString(),
    total: records.length,
    byClass: Object.freeze(byClass),
    broken: Object.freeze(records.filter((r) => r.class === INTERACTION_CLASSES.BROKEN)),
    disabledWithoutReason: Object.freeze(
      records.filter(
        (r) =>
          r.isDisabled &&
          !r.hasDisabledReason &&
          r.class !== INTERACTION_CLASSES.DISABLED_REASONED,
      ),
    ),
    filesScanned,
  });
}

/** Known intentional disabled controls (must still expose accessible reason in UI). */
export const INTENTIONAL_DISABLED_CONTROLS = Object.freeze([
  Object.freeze({
    id: 'whiteboard-new-order',
    label: 'New Order',
    reason: 'Order entry API is not mounted; control stays disabled until backend order endpoint ships.',
    surfaces: Object.freeze(['/emergency/whiteboard']),
  }),
  Object.freeze({
    id: 'moh-data-lookup',
    label: 'MoH data lookup',
    reason: 'No real MoH integration tool is registered; must not appear as a functional control.',
    surfaces: Object.freeze([] as string[]),
  }),
]);
