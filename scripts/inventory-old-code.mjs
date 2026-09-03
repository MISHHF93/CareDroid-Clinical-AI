import fs from 'node:fs';
import path from 'node:path';

function walk(d, a = [], skip = ['node_modules', 'dist', '.git', '.claude']) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (skip.includes(e.name)) continue;
      walk(p, a, skip);
    } else if (/\.(tsx|jsx|ts)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) {
      a.push(p);
    }
  }
  return a;
}

const files = walk('src');
const ariaExpr = [];
const requires = [];
const styles = [];
const menuitemradio = [];

const ariaRe = /aria-(checked|pressed|expanded|selected|hidden|disabled|current)=\{/g;
const requireRe = /\brequire\s*\(/g;
const styleRe = /style=\{\{/g;

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const aria = [...t.matchAll(ariaRe)];
  if (aria.length) {
    // skip comment-only
    const real = aria.filter((m) => {
      const line = t.slice(t.lastIndexOf('\n', m.index) + 1, t.indexOf('\n', m.index));
      return (
        !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.includes('e.g.')
      );
    });
    if (real.length)
      ariaExpr.push({ f, n: real.length, samples: real.slice(0, 3).map((m) => m[0]) });
  }
  const req = [...t.matchAll(requireRe)];
  if (req.length) requires.push({ f, n: req.length });
  const st = t.match(styleRe);
  if (st?.length) styles.push({ f, n: st.length });
  if (/role=["']menuitemradio["']/.test(t)) menuitemradio.push(f);
}

requires.sort((a, b) => b.n - a.n);
styles.sort((a, b) => b.n - a.n);
ariaExpr.sort((a, b) => b.n - a.n);

console.log(
  JSON.stringify(
    {
      filesScanned: files.length,
      ariaExprFiles: ariaExpr.length,
      ariaExprTotal: ariaExpr.reduce((s, x) => s + x.n, 0),
      ariaExpr,
      requireFiles: requires.length,
      requireTop: requires.slice(0, 25),
      styleFiles: styles.length,
      styleTotal: styles.reduce((s, x) => s + x.n, 0),
      styleTop: styles.slice(0, 20),
      menuitemradio,
    },
    null,
    2,
  ),
);
