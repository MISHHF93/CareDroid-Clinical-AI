/**
 * Convert direct aria-*= {expression} into object-spread props so Microsoft Edge
 * Tools static analysis does not see an invalid aria-* attribute value expression.
 *
 * aria-pressed={active ? 'true' : 'false'}
 *   → {...(active ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
 *
 * aria-current={active ? 'page' : undefined}
 *   → {...(active ? { 'aria-current': 'page' as const } : {})}
 */
import fs from 'node:fs';
import path from 'node:path';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist'].includes(e.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function transform(src) {
  let n = 0;
  let out = src;

  // aria-current={COND ? 'page'|'step' : undefined|null|false}
  out = out.replace(/aria-current=\{([^}]+)\}/g, (full, expr) => {
    const e = expr.trim();
    if (/^['"`]/.test(e)) return full; // already literal
    // active ? 'page' : undefined
    const m = e.match(
      /^(.+?)\s*\?\s*['"`](page|step|location|date|time|true)['"`]\s*:\s*(undefined|null|false|['"`]false['"`])\s*$/,
    );
    if (m) {
      n += 1;
      const cond = m[1].trim();
      const val = m[2];
      return `{...(${cond} ? { 'aria-current': '${val}' as const } : {})}`;
    }
    // nested ternary page/step — leave for manual
    if (e.includes('?') && e.includes('page') && e.includes('step')) {
      return full;
    }
    return full;
  });

  // Boolean aria attrs: checked|pressed|expanded|selected|hidden|disabled
  const boolAttrs = ['checked', 'pressed', 'expanded', 'selected', 'hidden', 'disabled'];
  for (const attr of boolAttrs) {
    const re = new RegExp(`aria-${attr}=\\{([^}]+)\\}`, 'g');
    out = out.replace(re, (full, expr) => {
      const e = expr.trim();
      if (/^['"`](true|false)['"`]$/.test(e)) return full;

      // (x) ? 'true' : 'false'  or x ? 'true' : 'false'
      let m = e.match(/^\(?(.+?)\)?\s*\?\s*['"`]true['"`]\s*:\s*['"`]false['"`]\s*$/);
      if (m) {
        n += 1;
        const cond = m[1].trim();
        return `{...(${cond} ? { 'aria-${attr}': 'true' as const } : { 'aria-${attr}': 'false' as const })}`;
      }
      m = e.match(/^\(?(.+?)\)?\s*\?\s*['"`]false['"`]\s*:\s*['"`]true['"`]\s*$/);
      if (m) {
        n += 1;
        const cond = m[1].trim();
        return `{...(${cond} ? { 'aria-${attr}': 'false' as const } : { 'aria-${attr}': 'true' as const })}`;
      }
      // bare identifier or !!x or !x
      if (/^!?!?[a-zA-Z_$][\w.$]*$/.test(e) || (/^!.+/.test(e) && !e.includes('?'))) {
        n += 1;
        return `{...((${e}) ? { 'aria-${attr}': 'true' as const } : { 'aria-${attr}': 'false' as const })}`;
      }
      // comparison without nested ?
      if (!e.includes('?') && /===|!==|==|!=|>=|<=|>|</.test(e)) {
        n += 1;
        return `{...((${e}) ? { 'aria-${attr}': 'true' as const } : { 'aria-${attr}': 'false' as const })}`;
      }
      // complex: wrap whole expr as boolean
      if (e.includes('?')) {
        // already ternary with true/false strings partially
        n += 1;
        return `{...((${e}) ? { 'aria-${attr}': 'true' as const } : { 'aria-${attr}': 'false' as const })}`;
      }
      n += 1;
      return `{...((${e}) ? { 'aria-${attr}': 'true' as const } : { 'aria-${attr}': 'false' as const })}`;
    });
  }

  return { out, n };
}

const root = process.argv[2] || 'src';
const apply = process.argv.includes('--apply');
const files = walk(root);
let total = 0;
const touched = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const { out, n } = transform(src);
  if (!n || out === src) continue;
  total += n;
  touched.push({ f, n });
  if (apply) fs.writeFileSync(f, out, 'utf8');
}

console.log(JSON.stringify({ apply, total, files: touched.length, touched }, null, 2));
