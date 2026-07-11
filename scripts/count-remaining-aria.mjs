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

const files = walk('src');
const bad = [];
const re = /aria-(checked|pressed|expanded|selected|hidden|disabled)=\{([^}]+)\}/g;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(t))) {
    const expr = m[2];
    if (/['"]true['"]|['"]false['"]/.test(expr)) continue;
    bad.push(`${f}: ${m[0].slice(0, 100)}`);
  }
}
console.log('remaining bare bool ARIA', bad.length);
console.log(bad.slice(0, 40).join('\n'));
