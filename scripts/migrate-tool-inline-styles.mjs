import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('src/pages/tools');
const replacements = [
  [
    /<div style=\{\{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' \}\}>/g,
    '<div className="tool-form-actions">',
  ],
  [
    /<div style=\{\{ display: 'flex', gap: '12px', flexWrap: 'wrap' \}\}>/g,
    '<div className="tool-form-actions tool-form-actions--flush">',
  ],
  [
    /<div aria-busy="true" style=\{\{ padding: '48px 20px', textAlign: 'center' \}\}>/g,
    '<div className="tool-loading-state" aria-busy="true">',
  ],
  [
    /<p style=\{\{ color: 'var\(--app-fg-muted\)' \}\}>/g,
    '<p className="tool-loading-state__message">',
  ],
  [
    /<div style=\{\{ padding: '60px 20px', textAlign: 'center', color: 'var\(--app-fg-muted\)' \}\}>/g,
    '<div className="tool-empty-state">',
  ],
  [/ style=\{\{ marginTop: '16px' \}\}/g, ''],
  [
    /<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' \}\}>/g,
    '<div className="tool-form-row-2">',
  ],
  [
    /<div className="calc-spinner" style=\{\{ width: '20px', height: '20px', borderWidth: '2px' \}\}><\/div>/g,
    '<div className="calc-spinner calc-spinner--sm"></div>',
  ],
  [
    /className="calc-input-field"\n(\s+)style=\{\{ marginBottom: '8px' \}\}/g,
    'className="calc-input-field calc-input-field--spaced"\n$1',
  ],
];

for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.jsx'))) {
  const filePath = path.join(dir, file);
  const original = fs.readFileSync(filePath, 'utf8');
  let next = original;
  for (const [pattern, value] of replacements) {
    next = next.replace(pattern, value);
  }
  if (next !== original) {
    fs.writeFileSync(filePath, next);
    console.log(`updated ${file}`);
  }
}
