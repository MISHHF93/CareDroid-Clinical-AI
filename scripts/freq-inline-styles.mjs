import fs from 'node:fs';
import path from 'node:path';

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.claude'].includes(e.name)) continue;
      walk(p, a);
    } else if (/\.(tsx|jsx)$/.test(e.name)) a.push(p);
  }
  return a;
}

function isStaticBody(body) {
  // reject JS identifiers as values (MEDICAL_THEME.x, bg, etc.)
  const withoutStrings = body.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
  const withoutNums = withoutStrings.replace(/:\s*-?\d+(\.\d+)?/g, ':0');
  const withoutBool = withoutNums.replace(/:\s*(true|false)/g, ':0');
  // any remaining : Identifier
  if (/:\s*[A-Za-z_$]/.test(withoutBool)) return false;
  return true;
}

const freq = new Map();
const re = /style=\{\{([^{}]+)\}\}/g;
for (const f of walk('src')) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(t))) {
    const body = m[1].replace(/\s+/g, ' ').trim();
    if (!isStaticBody(body)) continue;
    freq.set(body, (freq.get(body) || 0) + 1);
  }
}

const top = [...freq.entries()].sort((a, b) => b[1] - a[1]);
console.log(
  JSON.stringify(
    {
      staticUnique: freq.size,
      staticTotal: top.reduce((s, [, n]) => s + n, 0),
      top: top.slice(0, 50).map(([k, n]) => ({ n, body: k })),
    },
    null,
    2,
  ),
);
