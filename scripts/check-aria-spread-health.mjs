import fs from 'node:fs';
import path from 'node:path';

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist'].includes(e.name)) continue;
      walk(p, a);
    } else if (/\.(tsx|jsx)$/.test(e.name)) a.push(p);
  }
  return a;
}

const directAria = /aria-(checked|pressed|expanded|selected|hidden|disabled|current)=\{([^}]+)\}/g;
const broken = [];
const remaining = [];

for (const f of walk('src')) {
  const t = fs.readFileSync(f, 'utf8');
  // broken: spread of bare string
  if (/\.\.\.\([^)]*\?\s*['"]page['"]\s*:/.test(t)) broken.push({ f, kind: 'spread-string-page' });
  if (/\.\.\.\([^)]*\?\s*true\s*:/.test(t)) broken.push({ f, kind: 'spread-bare-true' });
  // remaining direct expressions (skip comments by crude check)
  let m;
  while ((m = directAria.exec(t))) {
    const lineStart = t.lastIndexOf('\n', m.index) + 1;
    const line = t.slice(lineStart, t.indexOf('\n', m.index));
    if (line.trim().startsWith('*') || line.trim().startsWith('//') || line.includes('e.g.')) continue;
    const e = m[2].trim();
    if (/^['"`](true|false|page|step)['"`]$/.test(e)) continue;
    remaining.push({ f, full: m[0], line: t.slice(0, m.index).split('\n').length });
  }
}

console.log(JSON.stringify({ broken, remaining, remainingCount: remaining.length }, null, 2));
