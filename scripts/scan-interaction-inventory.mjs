/**
 * Static interaction inventory scanner.
 * Run: node scripts/scan-interaction-inventory.mjs
 *
 * Classifies button/link-like JSX controls as LIVE | DISABLED_REASONED | BROKEN | …
 * Outputs qa/interaction-inventory.json
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcRoot = join(root, 'src');
const outPath = join(root, 'qa', 'interaction-inventory.json');

// Import compiled classification via dynamic import of TS is not available in plain node;
// re-implement thin mirror using the same rules (keep in sync with interactionInventoryModel.ts tests).

const INTERACTION_CLASSES = {
  LIVE: 'LIVE',
  DISABLED_REASONED: 'DISABLED_REASONED',
  HIDDEN_FLAG: 'HIDDEN_FLAG',
  BROKEN: 'BROKEN',
  ORPHAN: 'ORPHAN',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
};

function openingTagAttrs(src) {
  // Prefer attributes on the first JSX open tag only — avoid body text like "is currently disabled"
  const match = src.match(
    /<(?:button|Button|IconButton|Link|NavLink|a|div|g|span)\b[\s\S]*?(?:\/?>)/,
  );
  return match ? match[0] : src.slice(0, 500);
}

function classifyInteractionControl(input) {
  const src = input.attributesAndBody;
  // Strip block comments / JSDoc so doc examples are not inventory hits
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const attrs = openingTagAttrs(code);
  const hasClickHandler =
    /\bonClick\s*=/.test(code) ||
    /\bonclick\s*=/.test(code) ||
    /\bonKeyDown\s*=/.test(code) ||
    /\{\s*\.\.\.(props|rest|buttonProps|htmlProps)\s*\}/.test(code);
  const hasSubmitType = /\btype\s*=\s*["']submit["']/.test(attrs) || input.kind === 'submit';
  const hasNavigation =
    /\bto\s*=/.test(attrs) ||
    /\bhref\s*=/.test(attrs) ||
    /\bnavigate\s*\(/.test(code) ||
    input.kind === 'link';
  const isLiterallyDisabled =
    /\bdisabled\s*=\s*\{\s*true\s*\}/.test(attrs) ||
    (/\sdisabled(?:\s|\/|>)/.test(attrs) && !/\bdisabled\s*=\s*\{/.test(attrs));
  const hasDisabledReason =
    /\btitle\s*=|\baria-describedby\s*=|\bdisabledReason\s*=|\bdata-disabled-reason\s*=/.test(
      attrs,
    ) ||
    (isLiterallyDisabled && /\baria-label\s*=/.test(attrs));
  const nameMatch = attrs.match(/\baria-label\s*=\s*["'`]([^"'`]+)["'`]/);
  const accessibleNameHint = nameMatch ? nameMatch[1].trim() : null;

  // Prop-forwarding primitives (handler comes from parent)
  if (
    input.fileHint &&
    /[\\/](ui|primitives)[\\/](button|Button|IconButton|card)\./.test(input.fileHint)
  ) {
    return {
      class: INTERACTION_CLASSES.LIVE,
      reason: 'Prop-forwarding primitive; consumers supply handlers',
      hasClickHandler: true,
      hasSubmitType,
      hasNavigation,
      isDisabled: false,
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

  if (hasClickHandler || hasSubmitType || hasNavigation) {
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

  // Capitalized design-system <Button> is often nested under <Link>; mark for review, not hard BROKEN.
  if (
    input.kind === 'button' &&
    /<Button\b/.test(src) &&
    !/<button\b/i.test(src.split('<Button')[0] + 'x')
  ) {
    return {
      class: INTERACTION_CLASSES.NEEDS_REVIEW,
      reason:
        'Design-system Button without local onClick — verify parent Link/menu wiring at runtime',
      hasClickHandler: false,
      hasSubmitType: false,
      hasNavigation: false,
      isDisabled: false,
      hasDisabledReason: false,
      accessibleNameHint,
    };
  }

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

function extractControlCandidates(source) {
  const lines = source.split(/\r?\n/);
  const results = [];
  const openPatterns = [
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
    // Skip pure comment lines
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    for (const { re, kind } of openPatterns) {
      if (!re.test(line)) continue;
      // Include a few prior lines so role="button" picks up earlier onClick on same element
      const start = Math.max(0, i - 8);
      const window = lines.slice(start, Math.min(lines.length, i + 28)).join('\n');
      const attributesAndBody = window.slice(0, 3200);
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
  return results;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(tsx|jsx)$/.test(name) && !/\.(test|spec)\.(tsx|jsx)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

// Skip test fixtures, pure story files, and bootstrap error HTML strings
const SKIP_PATH_RE = /[\\/](test|__tests__|fixtures|stories)[\\/]/;
const SKIP_FILE_RE = /(^|[\\/])main\.tsx$|\.testShared\.|\.test\.|\.spec\.|Storybook|stories\./;

function main() {
  const files = walk(srcRoot).filter((f) => !SKIP_PATH_RE.test(f) && !SKIP_FILE_RE.test(f));
  const records = [];
  let id = 0;

  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, '/');
    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const candidates = extractControlCandidates(source);
    for (const c of candidates) {
      const classified = classifyInteractionControl({
        kind: c.kind,
        attributesAndBody: c.attributesAndBody,
        fileHint: rel,
      });
      id += 1;
      records.push({
        id: `ctrl-${id}`,
        file: rel,
        line: c.line,
        kind: c.kind,
        snippet: c.snippet,
        accessibleNameHint: classified.accessibleNameHint,
        hasClickHandler: classified.hasClickHandler,
        hasSubmitType: classified.hasSubmitType,
        hasNavigation: classified.hasNavigation,
        isDisabled: classified.isDisabled,
        hasDisabledReason: classified.hasDisabledReason,
        class: classified.class,
        reason: classified.reason,
      });
    }
  }

  const byClass = {};
  for (const rec of records) {
    byClass[rec.class] = (byClass[rec.class] || 0) + 1;
  }

  const broken = records.filter((r) => r.class === INTERACTION_CLASSES.BROKEN);
  // Focus triage on high-traffic ED surfaces first
  const edBroken = broken.filter(
    (r) =>
      /src\/(pages\/emergency|components\/(EMS|ems|whiteboard|Whiteboard|account|Sidebar)|layout|services\/alert)/.test(
        r.file,
      ) || /src\/pages\/ClinicalAlerts/.test(r.file),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    total: records.length,
    byClass,
    brokenCount: broken.length,
    edBrokenCount: edBroken.length,
    edBroken: edBroken.slice(0, 200),
    brokenSample: broken.slice(0, 100),
    note: 'Static classification is conservative. LIVE means a handler binding was found, not that runtime succeeds. Playwright interaction-execution suite validates observable outcomes.',
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Interaction inventory: ${records.length} controls in ${files.length} files`);
  console.log(`By class: ${JSON.stringify(byClass)}`);
  console.log(`BROKEN total: ${broken.length} (ED-focused: ${edBroken.length})`);
  console.log(`Wrote ${relative(root, outPath)}`);

  // Exit non-zero only if ED-critical BROKEN exceeds threshold (Phase 0 allows baseline; tighten later)
  if (edBroken.length > 50) {
    console.error(
      `ED BROKEN controls (${edBroken.length}) exceed triage threshold 50 — investigate.`,
    );
    process.exitCode = 1;
  }
}

main();
