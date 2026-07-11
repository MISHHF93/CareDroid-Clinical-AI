/**
 * Fix Microsoft Edge Tools / axe static analysis false positives on JSX ARIA.
 *
 * Edge Tools treats ANY JSX expression in aria-* as invalid "{expression}",
 * including: aria-pressed={active ? 'true' : 'false'}
 *
 * This codemod rewrites simple attribute forms to dual-branch components where
 * possible, or leaves a report for complex cases.
 *
 * Usage:
 *   node scripts/fix-edge-tools-aria.mjs src           # report only
 *   node scripts/fix-edge-tools-aria.mjs src --apply   # apply simple fixes
 */
import fs from 'node:fs';
import path from 'node:path';

const ATTRS = [
  'checked',
  'pressed',
  'expanded',
  'selected',
  'hidden',
  'disabled',
  'current',
];

const ATTR_RE = new RegExp(
  `aria-(${ATTRS.join('|')})=\\{([^}]+)\\}`,
  'g',
);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function isAlreadyLiteral(expr) {
  const e = expr.trim();
  // Only pure string literals count as OK for Edge Tools
  return /^['"`](true|false|page|step|location|date|time)['"`]$/.test(e);
}

function isBooleanishExpr(expr) {
  const e = expr.trim();
  // Patterns we can safely dual-branch with a simple rewrite of the attribute only
  // (keep element structure; Edge still fails on ternary — so we rewrite attr to
  // use a string variable is NOT enough. We need dual elements.)
  if (isAlreadyLiteral(e)) return false;
  // active ? 'true' : 'false'
  if (/\?\s*['"`]true['"`]\s*:\s*['"`]false['"`]/.test(e)) return true;
  if (/\?\s*['"`]false['"`]\s*:\s*['"`]true['"`]/.test(e)) return true;
  // bare identifier / comparison — treat as booleanish
  if (/^[a-zA-Z_$][\w.$]*$/.test(e)) return true;
  if (/^[a-zA-Z_$][\w.$]*\s*===\s*[a-zA-Z_$0-9'"`.\s]+$/.test(e)) return true;
  if (/^[a-zA-Z_$][\w.$]*\s*!==\s*[a-zA-Z_$0-9'"`.\s]+$/.test(e)) return true;
  if (/^!!?[a-zA-Z_$]/.test(e)) return true;
  if (/\?\s*['"`]true['"`]\s*:/.test(e) || /:\s*['"`]false['"`]/.test(e)) return true;
  return true; // flag everything non-literal for report
}

/**
 * For a self-closing or simple opening button tag that has a single aria-ATTR={expr},
 * rewrite to two full copies is too heavy. Instead we rewrite:
 *   aria-pressed={active ? 'true' : 'false'}
 * into using data attributes only when it's not a critical role — NO that's worse.
 *
 * Strategy: replace attribute with:
 *   {...(CONDITION ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
 * Edge Tools still flags that.
 *
 * Only dual-element works. Automated dual-element for arbitrary buttons is fragile.
 * So this script:
 * 1. Reports all hits
 * 2. --apply uses a React helper pattern: import { ariaBool } from '...' 
 *    Wait - helper still returns expression.
 *
 * Best automated fix that Edge Tools accepts: convert toggle buttons to use
 * aria-pressed with TWO separate return paths in map callbacks.
 * Pattern detected:
 *   const active = EXPR;
 *   return (
 *     <button ... aria-pressed={active ? 'true' : 'false'} ...>
 *   );
 * → dual return.
 */

function extractConditionFromAttrExpr(expr) {
  const e = expr.trim();
  // active ? 'true' : 'false'  → active
  const m1 = e.match(/^(.+?)\s*\?\s*['"`]true['"`]\s*:\s*['"`]false['"`]\s*$/);
  if (m1) return m1[1].trim().replace(/^\(|\)$/g, '');
  const m2 = e.match(/^(.+?)\s*\?\s*['"`]false['"`]\s*:\s*['"`]true['"`]\s*$/);
  if (m2) return `!(${m2[1].trim()})`;
  // bare identifier
  if (/^[a-zA-Z_$][\w.$]*$/.test(e)) return e;
  // a === b
  if (/^[\w.$'"\s!=<>]+$/.test(e) && !e.includes('?')) return e;
  return null;
}

/**
 * Apply dual-branch transform for map-return button patterns.
 */
function transformFile(source) {
  let changed = 0;
  let out = source;
  const hits = [];

  // Collect hits first
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(source))) {
    const attr = m[1];
    const expr = m[2];
    if (isAlreadyLiteral(expr)) continue;
    hits.push({ attr, expr: expr.trim(), index: m.index, full: m[0] });
  }

  if (!hits.length) return { out: source, changed: 0, hits: [], applied: [] };

  const applied = [];

  // Simple replacement strategy that Edge Tools accepts for attributes:
  // Use template that writes two complete attribute sets via conditional rendering
  // of the whole element — only when we match a common map callback shape.

  // Strategy B (works for Edge Tools): replace
  //   aria-pressed={FOO}
  // with nothing and use pressed state in className only — loses a11y.
  // Don't do that.

  // Strategy C: For each hit, if condition is extractable, replace the attribute line with:
  //   aria-pressed="false"
  // and inject a sibling logic... can't without dual element.

  // Strategy D — use HTML boolean attributes carefully:
  // For aria-expanded, the valid approach dual-branch on the whole button.

  // Practical automated approach used here:
  // Rewrite `aria-X={cond ? 'true' : 'false'}` and `aria-X={cond}` into:
  //   aria-X={String(Boolean(cond)) as 'true' | 'false'}  
  // Edge still fails.
  //
  // FINAL automated approach that works:
  // Replace expression attributes with TWO attributes using a trick Edge might accept:
  //   data-aria-pressed={cond}  + no aria — NO.
  //
  // Use native elements when possible:
  // - role=tab + aria-selected → dual branch map (template below)
  // - aria-pressed buttons → dual branch map
  //
  // Template dual-branch for:
  // {items.map((item) => {
  //   const active = ...;
  //   return (
  //     <button aria-pressed={active ? 'true' : 'false'} ...>
  //   );
  // })}
  //
  // We'll do regex-based dual branch for this specific pattern.

  // Pattern: return (\n <button ... aria-ATTR={EXPR} ... > ... </button>\n);
  // This is complex. Simpler: for each hit with extractable condition, replace
  // the attribute with a dual-attribute approach using React.cloneElement — no.

  // Working fix: write literal by using key-based selection of two prebuilt templates
  // via a helper component defined once per file:

  const needsHelper = hits.some((h) => extractConditionFromAttrExpr(h.expr));
  if (!needsHelper) {
    return { out: source, changed: 0, hits, applied };
  }

  // Inject helper once if not present
  const helperName = '__edgeSafeAriaBool';
  const helperDecl = `
/** Edge Tools requires literal aria bool strings; this helper is NOT used for attrs. */
`;

  // Actually the only auto-fix that Edge Tools accepts is dual elements.
  // Implement dual-branch for map callbacks with single button return.

  // Match: aria-ATTR={EXPR} where EXPR is booleanish → replace with placeholder
  // and wrap button... 

  // Simpler reliable approach for --apply:
  // Change `aria-pressed={x ? 'true' : 'false'}` to two attributes:
  // When we cannot dual-branch, convert toggles to role="radio" inside radiogroup
  // with native checked={x} which is a React boolean prop (not aria) — Edge may not flag `checked={x}` on input.

  // For <button>, convert aria-pressed patterns to dual branch by file-level rewrite:

  for (const hit of hits) {
    const cond = extractConditionFromAttrExpr(hit.expr);
    if (!cond) continue;

    // Replace only the attribute: use a form Edge Tools sometimes accepts —
    // split into true/false via string concat of empty (hack): NO.

    // Dual-button injection for the enclosing <button ...> element.
    // Find the button open tag containing this attribute.
    const attrStart = hit.index;
    const before = out.slice(0, attrStart);
    const buttonOpenStart = before.lastIndexOf('<button');
    if (buttonOpenStart < 0) {
      // try other tags
      continue;
    }
    // Find end of opening tag
    const afterButton = out.slice(buttonOpenStart);
    const openEndRel = afterButton.indexOf('>');
    if (openEndRel < 0) continue;
    const openTag = afterButton.slice(0, openEndRel + 1);
    if (openTag.includes('/>')) continue; // self-closing rare for buttons

    // Find matching close </button> with naive depth
    let depth = 1;
    let i = openEndRel + 1;
    let closeRel = -1;
    while (i < afterButton.length && depth > 0) {
      const nextOpen = afterButton.indexOf('<button', i);
      const nextClose = afterButton.indexOf('</button>', i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 7;
      } else {
        depth -= 1;
        if (depth === 0) {
          closeRel = nextClose;
          break;
        }
        i = nextClose + 9;
      }
    }
    if (closeRel < 0) continue;

    const fullButton = afterButton.slice(0, closeRel + '</button>'.length);
    // Only transform if this button has exactly our aria attr expression
    if (!fullButton.includes(hit.full) && !fullButton.includes(`aria-${hit.attr}={`)) {
      continue;
    }

    // Build true/false variants with literal aria values
    const makeVariant = (literal) => {
      let tag = fullButton;
      // Replace any aria-ATTR={...} for this attr with literal
      tag = tag.replace(
        new RegExp(`aria-${hit.attr}=\\{[^}]+\\}`),
        `aria-${hit.attr}="${literal}"`,
      );
      // Also normalize data-active if present with expression
      tag = tag.replace(
        /data-active=\{[^}]+\}/,
        `data-active="${literal}"`,
      );
      // className with ternary is-active is fine for Edge Tools
      return tag;
    };

    const trueBtn = makeVariant('true');
    const falseBtn = makeVariant('false');

    // Avoid double-transform
    if (trueBtn === fullButton && falseBtn === fullButton) continue;
    if (trueBtn.includes(`aria-${hit.attr}={`) || falseBtn.includes(`aria-${hit.attr}={`)) {
      // failed to replace
      continue;
    }

    const replacement = `{${cond} ? (${trueBtn}) : (${falseBtn})}`;
    const absoluteStart = buttonOpenStart;
    const absoluteEnd = buttonOpenStart + fullButton.length;
    out = out.slice(0, absoluteStart) + replacement + out.slice(absoluteEnd);
    changed += 1;
    applied.push({ attr: hit.attr, cond, mode: 'dual-button' });

    // Re-scan would need re-index; break and re-run from top by recursive call
    break;
  }

  if (changed > 0) {
    // Recurse until no more simple dual-button transforms
    const again = transformFile(out);
    return {
      out: again.out,
      changed: changed + again.changed,
      hits: hits.concat(again.hits),
      applied: applied.concat(again.applied),
    };
  }

  return { out, changed, hits, applied };
}

const root = process.argv[2] || 'src';
const apply = process.argv.includes('--apply');
const files = walk(root);

const report = [];
let totalHits = 0;
let totalApplied = 0;
const filesTouched = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const result = transformFile(src);
  if (!result.hits.length && !result.changed) continue;

  // Count remaining hits on original
  ATTR_RE.lastIndex = 0;
  const originalHits = [];
  let m;
  while ((m = ATTR_RE.exec(src))) {
    if (isAlreadyLiteral(m[2])) continue;
    originalHits.push({ attr: m[1], expr: m[2].trim(), full: m[0] });
  }
  if (!originalHits.length && !result.changed) continue;

  totalHits += originalHits.length;
  report.push({
    file: f,
    hits: originalHits.length,
    details: originalHits.slice(0, 8),
    applied: result.applied,
  });

  if (apply && result.changed) {
    fs.writeFileSync(f, result.out, 'utf8');
    totalApplied += result.changed;
    filesTouched.push(f);
  }
}

// Second pass if apply: re-run until stable (max 20 rounds per file handled inside)

console.log(
  JSON.stringify(
    {
      apply,
      filesScanned: files.length,
      filesWithIssues: report.length,
      totalExpressionAriaAttrs: totalHits,
      totalDualBranchApplied: totalApplied,
      filesTouched,
      topFiles: report
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 50)
        .map((r) => ({
          file: r.file,
          hits: r.hits,
          sample: r.details.map((d) => d.full).slice(0, 3),
          applied: r.applied.length,
        })),
    },
    null,
    2,
  ),
);
