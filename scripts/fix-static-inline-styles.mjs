/**
 * Replace common static style={{ ... }} props with utility classNames.
 * Skips styles that reference JS identifiers (dynamic values).
 *
 * Usage: node scripts/fix-static-inline-styles.mjs src --apply
 */
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

/** Map normalized style body → utility class list */
const MAP = [
  // margin
  [{ marginBottom: 4 }, 'u-mb-4'],
  [{ marginBottom: 6 }, 'u-mb-6'],
  [{ marginBottom: 8 }, 'u-mb-8'],
  [{ marginBottom: 12 }, 'u-mb-12'],
  [{ marginBottom: 16 }, 'u-mb-16'],
  [{ marginBottom: 20 }, 'u-mb-20'],
  [{ marginTop: 4 }, 'u-mt-4'],
  [{ marginTop: 8 }, 'u-mt-8'],
  [{ marginTop: 12 }, 'u-mt-12'],
  [{ marginTop: 16 }, 'u-mt-16'],
  [{ marginTop: 20 }, 'u-mt-20'],
  [{ margin: 0 }, 'u-m-0'],
  [{ margin: '0' }, 'u-m-0'],
  [{ marginLeft: 0 }, 'u-ml-0'],
  [{ marginRight: 8 }, 'u-mr-8'],
  // padding / list
  [{ margin: 0, paddingLeft: 20 }, 'u-list-reset'],
  [{ margin: '0', paddingLeft: 20 }, 'u-list-reset'],
  [{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12 }, 'u-list-tight'],
  [{ margin: '8px 0 0', paddingLeft: 20, fontSize: 12 }, 'u-list-tight'],
  [{ padding: 0 }, 'u-p-0'],
  [{ paddingLeft: 16 }, 'u-pl-16'],
  [{ paddingLeft: 20 }, 'u-pl-20'],
  // text
  [{ textAlign: 'center' }, 'u-ta-center'],
  [{ textAlign: 'left' }, 'u-ta-left'],
  [{ textAlign: 'right' }, 'u-ta-right'],
  [{ fontSize: 11 }, 'u-fs-11'],
  [{ fontSize: '11px' }, 'u-fs-11'],
  [{ fontSize: 12 }, 'u-fs-12'],
  [{ fontSize: '12px' }, 'u-fs-12'],
  [{ fontSize: 13 }, 'u-fs-13'],
  [{ fontSize: '13px' }, 'u-fs-13'],
  [{ fontWeight: 600 }, 'u-fw-600'],
  [{ fontWeight: 700 }, 'u-fw-700'],
  // layout
  [{ display: 'flex' }, 'u-flex'],
  [{ display: 'block' }, 'u-block'],
  [{ display: 'grid' }, 'u-grid'],
  [{ width: '100%' }, 'u-w-full'],
  [{ display: 'flex', flexDirection: 'column' }, 'u-flex-col'],
  [{ display: 'flex', flexDirection: 'column', gap: 4 }, 'u-flex-col u-gap-4'],
  [{ display: 'flex', flexDirection: 'column', gap: 8 }, 'u-flex-col u-gap-8'],
  [{ display: 'flex', flexDirection: 'column', gap: 10 }, 'u-flex-col u-gap-10'],
  [{ display: 'flex', flexWrap: 'wrap' }, 'u-flex-wrap'],
  [{ display: 'flex', flexWrap: 'wrap', gap: 6 }, 'u-flex-wrap u-gap-6'],
  [{ display: 'flex', flexWrap: 'wrap', gap: 8 }, 'u-flex-wrap u-gap-8'],
  [{ display: 'flex', alignItems: 'center' }, 'u-flex-center'],
  [{ display: 'flex', alignItems: 'center', gap: 6 }, 'u-flex-center u-gap-6'],
  [{ display: 'flex', alignItems: 'center', gap: 7 }, 'u-flex-center u-gap-6'],
  [{ display: 'flex', alignItems: 'center', gap: 8 }, 'u-flex-center u-gap-8'],
  [{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, 'u-flex-between'],
  [
    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    'u-flex-between u-gap-12',
  ],
  [{ display: 'inline-flex', alignItems: 'center' }, 'u-inline-flex'],
  [{ display: 'inline-flex', alignItems: 'center', gap: 4 }, 'u-inline-flex u-gap-4'],
  [{ gap: 4 }, 'u-gap-4'],
  [{ gap: 6 }, 'u-gap-6'],
  [{ gap: 8 }, 'u-gap-8'],
  [{ gap: 10 }, 'u-gap-10'],
  [{ gap: 12 }, 'u-gap-12'],
  // combos
  [{ textAlign: 'center', marginBottom: 20 }, 'u-ta-center u-mb-20'],
  [{ marginBottom: 16, textAlign: 'center' }, 'u-mb-16 u-ta-center'],
  [{ marginTop: 8, fontSize: 12 }, 'u-mt-8 u-fs-12'],
  [{ marginTop: 4, paddingLeft: 20, fontSize: 12 }, 'u-mt-4 u-pl-20 u-fs-12'],
  [{ margin: '0 0 8px 0' }, 'u-mb-8'],
  [{ margin: '4px 0 0' }, 'u-mt-4'],
  [{ marginTop: 10 }, 'u-mt-10'],
  [{ marginTop: 0 }, 'u-mt-0'],
  [{ flex: 1 }, 'u-flex-1'],
  [{ display: 'flex', flexDirection: 'column', gap: 5 }, 'u-flex-col-gap-5'],
  [{ display: 'flex', flexDirection: 'column', gap: 6 }, 'u-flex-col-gap-6'],
  [{ display: 'flex', flexDirection: 'column', gap: 12 }, 'u-flex-col-gap-12'],
  [{ display: 'grid', gap: 8 }, 'u-grid-gap-8'],
  [{ display: 'grid', gap: 10 }, 'u-grid-gap-10'],
  [{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }, 'u-grid-2'],
  [{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }, 'u-grid-2-gap-10'],
  [{ display: 'flex', gap: 10, flexWrap: 'wrap' }, 'u-flex-wrap-gap-10'],
  [{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }, 'u-flex-wrap-gap-10-mt-10'],
  [
    {
      position: 'fixed',
      inset: 0,
      zIndex: 300,
      background: 'rgba(0,0,0,0.62)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    'u-modal-scrim',
  ],
  [
    {
      position: 'fixed',
      inset: 0,
      zIndex: 260,
      background: 'rgba(0,0,0,0.66)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    'u-modal-scrim-260',
  ],
  [
    {
      width: 32,
      height: 32,
      borderRadius: 8,
      border: '1px solid #e0f2fe',
      background: 'transparent',
      color: 'var(--medical-ink, #111827)',
      cursor: 'pointer',
    },
    'u-icon-btn-32',
  ],
  [
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: 16,
      borderBottom: '1px solid #e0f2fe',
    },
    'u-panel-header-row',
  ],
  [{ margin: 0, fontSize: 18, fontWeight: 650 }, 'u-title-18'],
  [{ margin: 0, fontSize: 18, fontWeight: 750 }, 'u-title-18-750'],
  [{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }, 'u-stack-14'],
  [{ padding: 10, borderBottom: '1px solid #e0f2fe' }, 'u-pad-10-border-b'],
  [{ padding: 16, borderBottom: '1px solid #e0f2fe' }, 'u-pad-16-border-b'],
  [
    {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 32,
      marginTop: 4,
    },
    'u-mono-32',
  ],
  [{ color: '#10B981', fontSize: 13 }, 'u-ok-13'],
  [{ border: '1px solid #e0f2fe', borderRadius: 12, padding: 14 }, 'u-card-border'],
  [
    {
      fontSize: '11px',
      fontWeight: 600,
      color: 'rgba(255, 255, 255, 0.5)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '6px',
    },
    'u-label-caps',
  ],
  [
    {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 13,
      cursor: 'pointer',
    },
    'u-click-row',
  ],
  [{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }, 'u-muted-13'],
  [
    {
      border: '1px solid #e0f2fe',
      borderRadius: 8,
      background: '#f0f9ff',
      color: 'var(--medical-ink, #111827)',
      padding: 10,
    },
    'u-input-surface',
  ],
  [{ padding: 16 }, 'u-pad-16'],
  [{ marginBottom: '16px' }, 'u-mb-16-str'],
  [{ margin: 0, padding: 0 }, 'u-m-0 u-p-0'],
];

function parseStyleObject(body) {
  // body like: marginBottom: 8, fontSize: 12  OR marginBottom: 8
  const obj = {};
  // split on commas not inside quotes
  const parts = [];
  let cur = '';
  let q = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (q) {
      cur += c;
      if (c === q && body[i - 1] !== '\\') q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      q = c;
      cur += c;
      continue;
    }
    if (c === ',') {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());

  for (const part of parts) {
    const m = part.match(/^([A-Za-z_][\w]*)\s*:\s*(.+)$/);
    if (!m) return null;
    const key = m[1];
    let raw = m[2].trim().replace(/,$/, '');
    // reject JS identifiers / expressions
    if (/^[A-Za-z_$]/.test(raw) && !/^(true|false|null|undefined)$/.test(raw)) {
      // allow pure numbers
      if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
    }
    if (
      raw.includes('(') ||
      raw.includes('?') ||
      raw.includes('+') ||
      raw.includes('MEDICAL') ||
      (raw.includes('var(') && raw.includes('{'))
    ) {
      // var() in strings is ok if quoted
    }
    if (/^[A-Za-z_$][\w.]*$/.test(raw) && !/^(true|false)$/.test(raw)) return null;

    let val;
    if (/^['"`]/.test(raw)) {
      val = raw.slice(1, -1);
    } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
      val = Number(raw);
    } else if (raw === 'true') val = true;
    else if (raw === 'false') val = false;
    else return null;
    obj[key] = val;
  }
  return obj;
}

function normalizeObj(obj) {
  // stable key order for compare
  const keys = Object.keys(obj).sort();
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

function objectsEqual(a, b) {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function findUtility(obj) {
  const n = normalizeObj(obj);
  for (const [pattern, cls] of MAP) {
    if (objectsEqual(normalizeObj(pattern), n)) return cls;
  }
  // also try unsorted pattern match
  for (const [pattern, cls] of MAP) {
    if (objectsEqual(pattern, obj)) return cls;
  }
  return null;
}

function transformV2(src) {
  let count = 0;
  // Process one match at a time from the end to keep indices stable
  const re = /style=\{\{([^{}]+)\}\}/g;
  const matches = [...src.matchAll(re)];
  if (!matches.length) return { out: src, count: 0 };

  let out = src;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const body = m[1];
    const obj = parseStyleObject(body);
    if (!obj) continue;
    const util = findUtility(obj);
    if (!util) continue;

    const start = m.index;
    const end = start + m[0].length;

    // Look backward in the same opening tag for className=
    const before = out.slice(0, start);
    const tagStart = before.lastIndexOf('<');
    if (tagStart < 0) continue;
    const tagChunk = out.slice(tagStart, end);
    // Don't cross into previous tags
    if (tagChunk.includes('>')) {
      // style is after > somehow — skip
      const gt = before.indexOf('>', tagStart);
      if (gt >= 0 && gt < start) continue;
    }

    const openSlice = out.slice(tagStart, start);
    // className may not be immediately before style; search in open tag
    const openTagEnd = out.indexOf('>', end);
    const fullOpen = out.slice(tagStart, openTagEnd === -1 ? end : openTagEnd);
    const anyClass = fullOpen.match(/\sclassName=(("[^"]*")|('[^']*')|(`[^`]*`)|(\{[\s\S]*?\}))/);

    if (anyClass) {
      const attrStart = tagStart + fullOpen.indexOf(anyClass[0]);
      // rebuild className
      let newClassAttr;
      if (anyClass[2]) {
        // "..."
        const inner = anyClass[2].slice(1, -1);
        newClassAttr = `className="${(inner + ' ' + util).replace(/\s+/g, ' ').trim()}"`;
      } else if (anyClass[3]) {
        const inner = anyClass[3].slice(1, -1);
        newClassAttr = `className='${(inner + ' ' + util).replace(/\s+/g, ' ').trim()}'`;
      } else if (anyClass[4]) {
        // template
        const inner = anyClass[4].slice(1, -1);
        newClassAttr = `className={\`${util} ${inner}\`}`;
      } else if (anyClass[5]) {
        const expr = anyClass[5].slice(1, -1).trim();
        newClassAttr = `className={[${JSON.stringify(util)}, ${expr}].filter(Boolean).join(' ')}`;
      } else {
        continue;
      }
      // remove style first (later indices), then replace className
      out = out.slice(0, start) + out.slice(end);
      // className position unchanged if before style
      if (attrStart < start) {
        out =
          out.slice(0, attrStart) + ' ' + newClassAttr + out.slice(attrStart + anyClass[0].length);
      }
      count += 1;
    } else {
      // insert className, remove style
      out = out.slice(0, start) + `className="${util}"` + out.slice(end);
      count += 1;
    }
  }

  return { out, count };
}

const root = process.argv[2] || 'src';
const apply = process.argv.includes('--apply');
const files = walk(root);
let total = 0;
const touched = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const { out, count } = transformV2(src);
  if (!count) continue;
  total += count;
  touched.push({ f, count });
  if (apply) fs.writeFileSync(f, out, 'utf8');
}

console.log(
  JSON.stringify({ apply, total, files: touched.length, touched: touched.slice(0, 40) }, null, 2),
);
