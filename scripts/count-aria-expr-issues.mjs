#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'src';
const ATTRS = [
  'checked',
  'pressed',
  'expanded',
  'selected',
  'hidden',
  'disabled',
  'invalid',
  'modal',
  'busy',
  'atomic',
  'multiline',
  'multiselectable',
  'readonly',
  'required',
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      walk(p, acc);
    } else if (/\.(tsx|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function isOk(expr) {
  const e = expr.trim();
  if (/^['"`]/.test(e)) return true;
  if (e === 'true' || e === 'false') return true;
  if (/\?\s*['"`]true['"`]\s*:\s*['"`]false['"`]/.test(e)) return true;
  if (/\?\s*['"`]false['"`]\s*:\s*['"`]true['"`]/.test(e)) return true;
  if (/\?\s*['"`](page|step|location|date|time|true|false)['"`]/.test(e)) return true;
  // aria-hidden={true} style already ok; skip undefined omit patterns partially handled
  return false;
}

let bad = 0;
const byAttr = {};
const files = new Set();
const samples = [];

for (const f of walk(root)) {
  const t = fs.readFileSync(f, 'utf8');
  for (const attr of ATTRS) {
    const re = new RegExp(`aria-${attr}=\\{([^}]+)\\}`, 'g');
    let m;
    while ((m = re.exec(t))) {
      if (isOk(m[1])) continue;
      bad += 1;
      files.add(f);
      byAttr[attr] = (byAttr[attr] || 0) + 1;
      if (samples.length < 20) {
        samples.push(`${f}: aria-${attr}={${m[1].trim().slice(0, 70)}}`);
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      root,
      badExpressions: bad,
      filesWithIssues: files.size,
      byAttr,
      samples,
    },
    null,
    2,
  ),
);
