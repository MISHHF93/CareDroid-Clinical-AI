import fs from 'node:fs';
import path from 'node:path';

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

const root = process.argv[2] || 'src';
const files = walk(root);

// Edge Tools / axe static analysis treats JSX boolean expressions as invalid ARIA values.
const ariaBoolRe =
  /aria-(checked|pressed|expanded|selected|hidden|disabled|current)=\{(?!['"`])([^}]+)\}/g;

const roleRe = {
  menuitemradio: /role=["']menuitemradio["']/g,
  menuitem: /role=["']menuitem["']/g,
  menuitemcheckbox: /role=["']menuitemcheckbox["']/g,
};

const counts = {
  ariaBoolExpr: 0,
  byAttr: {},
  roles: {},
};
const fileHits = [];

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  let fileCount = 0;
  const attrs = {};

  for (const m of t.matchAll(ariaBoolRe)) {
    counts.ariaBoolExpr += 1;
    fileCount += 1;
    const attr = m[1];
    counts.byAttr[attr] = (counts.byAttr[attr] || 0) + 1;
    attrs[attr] = (attrs[attr] || 0) + 1;
  }

  for (const [role, re] of Object.entries(roleRe)) {
    const matches = [...t.matchAll(re)];
    if (matches.length) {
      counts.roles[role] = (counts.roles[role] || 0) + matches.length;
      fileCount += matches.length;
    }
  }

  if (fileCount) {
    fileHits.push({ file: f, count: fileCount, attrs });
  }
}

fileHits.sort((a, b) => b.count - a.count);

console.log(
  JSON.stringify(
    {
      filesScanned: files.length,
      filesWithHits: fileHits.length,
      totalHits: fileHits.reduce((s, x) => s + x.count, 0),
      counts,
      topFiles: fileHits.slice(0, 40),
    },
    null,
    2,
  ),
);
