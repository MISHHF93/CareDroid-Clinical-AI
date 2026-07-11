/**
 * Codemod: Edge Tools / axe static analysis flags JSX boolean expressions on ARIA
 * attributes as invalid values (shows as aria-checked="{expression}").
 *
 * Convert:  aria-pressed={active}
 * To:       aria-pressed={active ? 'true' : 'false'}
 *
 * Skips values that already use string literals or template strings.
 */
import fs from 'node:fs';
import path from 'node:path';

const ATTRS = ['checked', 'pressed', 'expanded', 'selected', 'hidden', 'disabled'];

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      walk(p, acc);
    } else if (/\.(tsx|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function shouldSkipExpr(expr) {
  const e = expr.trim();
  // Already stringish
  if (/^['"`]/.test(e)) return true;
  // Already ternary that returns strings
  if (/\?\s*['"`]true['"`]\s*:\s*['"`]false['"`]/.test(e)) return true;
  if (/\?\s*['"`]false['"`]\s*:\s*['"`]true['"`]/.test(e)) return true;
  // aria-current style page/step values
  if (/\?\s*['"`](page|step|location|date|time|true|false)['"`]/.test(e)) return true;
  return false;
}

function transform(source) {
  let changed = 0;
  let out = source;

  for (const attr of ATTRS) {
    const re = new RegExp(`aria-${attr}=\\{([^}]+)\\}`, 'g');
    out = out.replace(re, (full, expr) => {
      if (shouldSkipExpr(expr)) return full;
      // Don't double-wrap
      if (expr.includes("? 'true'") || expr.includes('? "true"') || expr.includes('? `true`')) {
        return full;
      }
      const trimmed = expr.trim();
      // Prefer parens when expression has ? or : or &&
      const needsParen = /[?:]/.test(trimmed) || /\|\||&&/.test(trimmed);
      const core = needsParen ? `(${trimmed})` : trimmed;
      changed += 1;
      return `aria-${attr}={${core} ? 'true' : 'false'}`;
    });
  }

  // aria-current with bare boolean → 'true'/'false' (not page/step already handled by skip)
  out = out.replace(/aria-current=\{([^}]+)\}/g, (full, expr) => {
    if (shouldSkipExpr(expr)) return full;
    if (expr.includes("? 'true'") || expr.includes('? "true"')) return full;
    // If it's clearly meant as page: aria-current={active ? 'page' : undefined} — skip if has page/step
    if (/page|step|location|date|time|undefined|null/.test(expr) && /\?/.test(expr)) return full;
    const trimmed = expr.trim();
    const needsParen = /[?:]/.test(trimmed) || /\|\||&&/.test(trimmed);
    const core = needsParen ? `(${trimmed})` : trimmed;
    changed += 1;
    return `aria-current={${core} ? 'true' : 'false'}`;
  });

  return { out, changed };
}

const root = process.argv[2] || 'src';
const dry = process.argv.includes('--dry');
const files = walk(root);
let total = 0;
const touched = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const { out, changed } = transform(src);
  if (!changed) continue;
  total += changed;
  touched.push({ file: f, changed });
  if (!dry) fs.writeFileSync(f, out, 'utf8');
}

console.log(
  JSON.stringify(
    {
      dry,
      filesTouched: touched.length,
      replacements: total,
      files: touched,
    },
    null,
    2,
  ),
);
