#!/usr/bin/env node
/**
 * Cross-format source dirt scanner for CareDroid frontend.
 * Covers .tsx/.jsx/.html/.css under src/ (+ root index.html).
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2);
const targets = roots.length ? roots : ['src', 'index.html'];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  if (fs.statSync(dir).isFile()) {
    acc.push(dir);
    return acc;
  }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'qa', '.claude'].includes(e.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx|jsx|html|css)$/i.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const files = targets.flatMap((t) => walk(t));
const byExt = {};
for (const f of files) {
  const e = path.extname(f).toLowerCase() || '(none)';
  byExt[e] = (byExt[e] || 0) + 1;
}

const ARIA_BOOL = [
  'checked', 'pressed', 'expanded', 'selected', 'hidden', 'disabled', 'invalid',
  'modal', 'busy', 'atomic', 'multiline', 'multiselectable', 'readonly', 'required',
];

function isStaticAriaBool(expr) {
  const e = expr.trim();
  if (/^['"`]true['"`]$|^['"`]false['"`]$/.test(e)) return true;
  if (e === 'true' || e === 'false') return true;
  if (/\?\s*['"`]true['"`]\s*:\s*['"`]false['"`]/.test(e)) return true;
  if (/\?\s*['"`]false['"`]\s*:\s*['"`]true['"`]/.test(e)) return true;
  return false;
}

function isStaticRole(expr) {
  return /^['"`][a-z0-9]+(?:-[a-z0-9]+)*['"`]$/i.test(expr.trim());
}

const issues = {
  ariaBoolExpr: [],
  ariaRoleExpr: [],
  ariaInComments: [],
  inlineStyle: [],
  mainJsxEntry: [],
  bomFiles: [],
  emptyFiles: [],
  brokenCssUrls: [],
  htmlScriptExt: [],
};

let inlineStyleTotal = 0;

for (const f of files) {
  const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
  const buf = fs.readFileSync(f);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    issues.bomFiles.push(rel);
  }
  if (buf.length === 0) issues.emptyFiles.push(rel);

  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/);
  const isTsx = /\.(tsx|jsx)$/i.test(f);
  const isHtml = /\.html$/i.test(f);
  const isCss = /\.css$/i.test(f);

  if (isHtml) {
    if (/src=["']\/src\/main\.jsx["']/.test(text)) {
      issues.mainJsxEntry.push(rel);
    }
    const scripts = [...text.matchAll(/src=["']([^"']+\.jsx?)["']/g)];
    for (const m of scripts) {
      if (m[1].includes('main.jsx')) {
        issues.htmlScriptExt.push({ file: rel, src: m[1] });
      }
    }
  }

  if (isCss) {
    // empty rules or url() to missing - lightweight
    if (/url\(\s*['"]?\s*['"]?\s*\)/.test(text)) {
      issues.brokenCssUrls.push(rel);
    }
  }

  if (isTsx || isHtml) {
    lines.forEach((line, idx) => {
      const n = idx + 1;
      const trim = line.trim();
      // comment false-positives that Edge Tools scrapes
      if (
        (trim.startsWith('//') || trim.startsWith('*') || trim.startsWith('/*')) &&
        (/aria-\w+=\{expression\}/i.test(line) || /role=\{expression\}/i.test(line))
      ) {
        issues.ariaInComments.push({ file: rel, line: n, text: trim.slice(0, 120) });
      }
      if (trim.startsWith('//') || trim.startsWith('*') || trim.startsWith('/*')) return;

      for (const attr of ARIA_BOOL) {
        const re = new RegExp(`aria-${attr}=\\{([^}]+)\\}`, 'g');
        let m;
        while ((m = re.exec(line))) {
          if (isStaticAriaBool(m[1])) continue;
          issues.ariaBoolExpr.push({
            file: rel,
            line: n,
            attr: `aria-${attr}`,
            expr: m[1].trim().slice(0, 80),
          });
        }
      }

      const roleRe = /(?:^|[\s(<])role=\{([^}]+)\}/g;
      let rm;
      while ((rm = roleRe.exec(line))) {
        const at = rm.index + (rm[0].startsWith('role') ? 0 : 1);
        const before = line.slice(Math.max(0, at - 5), at);
        if (before.endsWith('data-')) continue;
        if (isStaticRole(rm[1])) continue;
        if (/RoleBadge|RoleGate/.test(line) && !/<(div|span|section|article|p|button|nav)\b/i.test(line)) {
          continue;
        }
        issues.ariaRoleExpr.push({
          file: rel,
          line: n,
          expr: rm[1].trim().slice(0, 80),
        });
      }

      const styles = line.match(/style=\{\{/g);
      if (styles) {
        inlineStyleTotal += styles.length;
        if (issues.inlineStyle.length < 40) {
          issues.inlineStyle.push({ file: rel, line: n, count: styles.length });
        }
      }
    });
  }
}

const summary = {
  filesScanned: files.length,
  byExt,
  counts: {
    ariaBoolExpr: issues.ariaBoolExpr.length,
    ariaRoleExpr: issues.ariaRoleExpr.length,
    ariaInComments: issues.ariaInComments.length,
    inlineStyleOccurrences: inlineStyleTotal,
    inlineStyleSampleFiles: issues.inlineStyle.length,
    mainJsxEntry: issues.mainJsxEntry.length,
    bomFiles: issues.bomFiles.length,
    emptyFiles: issues.emptyFiles.length,
    brokenCssUrls: issues.brokenCssUrls.length,
  },
  issues: {
    ariaBoolExpr: issues.ariaBoolExpr.slice(0, 30),
    ariaRoleExpr: issues.ariaRoleExpr.slice(0, 30),
    ariaInComments: issues.ariaInComments.slice(0, 20),
    mainJsxEntry: issues.mainJsxEntry,
    bomFiles: issues.bomFiles.slice(0, 20),
    emptyFiles: issues.emptyFiles,
    brokenCssUrls: issues.brokenCssUrls.slice(0, 20),
    inlineStyleTop: issues.inlineStyle.slice(0, 20),
  },
};

console.log(JSON.stringify(summary, null, 2));
fs.writeFileSync('source-dirt-report.json', JSON.stringify(summary, null, 2));
