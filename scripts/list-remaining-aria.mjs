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

const re = /aria-(checked|pressed|expanded|selected|hidden|disabled|current)=\{([^}]+)\}/g;
const rows = [];
for (const f of walk('src')) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  const hits = [];
  while ((m = re.exec(t))) {
    const e = m[2].trim();
    if (/^['"`](true|false|page|step|location|date|time)['"`]$/.test(e)) continue;
    hits.push({ line: t.slice(0, m.index).split('\n').length, full: m[0] });
  }
  if (hits.length) rows.push({ f, hits });
}
rows.sort((a, b) => b.hits.length - a.hits.length);
console.log('files', rows.length, 'hits', rows.reduce((s, r) => s + r.hits.length, 0));
for (const r of rows) {
  console.log(`\n${r.hits.length}  ${r.f}`);
  for (const h of r.hits) console.log(`  L${h.line}: ${h.full}`);
}
