#!/usr/bin/env node
/**
 * Inventory-only audit: finds CSS "tone modifier" selectors (data-tone=,
 * data-severity=, data-alarm=, or a --critical/--warning/--watch/--urgent/
 * --good/--ok class suffix) that tint a border/background but never extend
 * that same tone to the displayed value text (strong, __value, __amount,
 * __count, __metric-value, etc).
 *
 * This is the mechanized version of how the 4 confirmed Cycle 152 defects
 * (DashboardVisualizations.css, TriageBreachBadge.css,
 * caredroid-design-language.css, button.css) were found by hand. It does
 * NOT fix anything — it produces a reviewable list. Expect false positives
 * (some tiles are intentionally left uncolored, e.g. tone="neutral") and
 * false negatives (the value-color rule can live in a different file than
 * the modifier, which this script doesn't cross-reference). A human must
 * review every row before any of it gets fixed.
 *
 * Usage: node scripts/audit-tone-value-coloring.mjs
 * Output: qa/tone-value-coloring-audit.json (and a console summary)
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(__dirname, '..');
const srcRoot = join(repoRoot, 'src');

const TONE_WORDS = ['critical', 'warning', 'watch', 'urgent', 'good', 'ok', 'healthy', 'attention'];
const VALUE_SUFFIXES = [
  'strong',
  '__value',
  '__amount',
  '__count',
  '__metric-value',
  '> b',
  '> strong',
];

const CLASS_MODIFIER_RE = new RegExp(`\\.[\\w-]+--(?:${TONE_WORDS.join('|')})\\b`, 'g');
const ATTR_MODIFIER_RE = new RegExp(
  `\\[data-(?:tone|severity|alarm)=['"]?(?:${TONE_WORDS.join('|')}|info|ai|ops)['"]?\\]`,
  'g',
);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      walk(full, out);
    } else if (entry.endsWith('.css')) {
      out.push(full);
    }
  }
  return out;
}

/** Split CSS into top-level {selector, body} blocks, one level deep into @media. */
function splitRuleBlocks(css) {
  const blocks = [];
  let depth = 0;
  let selectorStart = 0;
  let braceStart = -1;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      if (depth === 0) {
        braceStart = i;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && braceStart !== -1) {
        const selector = css.slice(selectorStart, braceStart).trim();
        const body = css.slice(braceStart + 1, i);
        if (selector.startsWith('@media') || selector.startsWith('@supports')) {
          blocks.push(...splitRuleBlocks(body));
        } else if (selector && !selector.startsWith('@')) {
          blocks.push({ selector, body });
        }
        selectorStart = i + 1;
        braceStart = -1;
      }
    }
  }
  return blocks;
}

function auditFile(filePath) {
  const css = readFileSync(filePath, 'utf8');
  const blocks = splitRuleBlocks(css);

  const modifierSelectors = new Set();
  for (const block of blocks) {
    const classMatches = block.selector.match(CLASS_MODIFIER_RE) || [];
    const attrMatches = block.selector.match(ATTR_MODIFIER_RE) || [];
    for (const m of [...classMatches, ...attrMatches]) modifierSelectors.add(m);
  }
  if (modifierSelectors.size === 0) return [];

  const findings = [];
  for (const modifier of modifierSelectors) {
    let hasValueColorRule = false;
    for (const block of blocks) {
      const segments = block.selector.split(',').map((s) => s.trim());
      const relevantSegments = segments.filter((s) => s.includes(modifier));
      if (relevantSegments.length === 0) continue;

      const looksLikeValueTarget = relevantSegments.some((segment) => {
        if (VALUE_SUFFIXES.some((suffix) => segment.includes(suffix))) return true;
        // "own element" case: modifier is compounded directly onto the element
        // that carries it (e.g. .cdl-badge[data-tone='critical']) rather than
        // describing a descendant — removing the modifier substring leaves no
        // remaining whitespace (no descendant-combinator content follows it).
        const withoutModifier = segment.split(modifier).join('');
        return !/\s/.test(withoutModifier.trim());
      });

      if (looksLikeValueTarget && /(?<!background-|border-)\bcolor\s*:/.test(block.body)) {
        hasValueColorRule = true;
        break;
      }
    }
    findings.push({ modifier, hasValueColorRule });
  }
  return findings;
}

const cssFiles = walk(srcRoot);
const report = [];
for (const file of cssFiles) {
  const findings = auditFile(file);
  if (findings.length === 0) continue;
  const relPath = relative(repoRoot, file).replace(/\\/g, '/');
  for (const f of findings) {
    report.push({ file: relPath, modifier: f.modifier, hasValueColorRule: f.hasValueColorRule });
  }
}

const flagged = report.filter((r) => !r.hasValueColorRule);
const clean = report.filter((r) => r.hasValueColorRule);

const outDir = join(repoRoot, 'qa');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'tone-value-coloring-audit.json');
writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalCssFilesScanned: cssFiles.length,
      totalModifiersFound: report.length,
      flaggedCount: flagged.length,
      cleanCount: clean.length,
      note: 'Inventory only — human review required before fixing any flagged row. False positives expected (e.g. intentionally-neutral tiles, or a value-color rule living in a different file than the modifier).',
      flagged,
      clean,
    },
    null,
    2,
  ),
);

console.log(`Scanned ${cssFiles.length} CSS files, found ${report.length} tone modifiers.`);
console.log(`  ${clean.length} already recolor their value.`);
console.log(
  `  ${flagged.length} flagged — modifier tints border/background but no value-color rule found in the same file.`,
);
console.log(`Report written to ${relative(repoRoot, outPath)}`);
if (flagged.length) {
  console.log('\nFlagged (file :: modifier):');
  for (const row of flagged) {
    console.log(`  ${row.file} :: ${row.modifier}`);
  }
}
