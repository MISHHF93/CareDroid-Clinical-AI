#!/usr/bin/env node
/**
 * Visual cleanup inventory — lists routes/pages needing PageShell, inline styles,
 * MetricGrid usage, and oversized CSS files.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const SRC = join(ROOT, 'src');

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(path, acc);
      continue;
    }
    acc.push(path);
  }
  return acc;
}

const files = walk(SRC).filter((file) => /\.(tsx|ts|jsx|js|css)$/.test(file));

const inlineStyleFiles = [];
const metricGridFiles = [];
const apiStateBannerFiles = [];
const missingPageShell = [];
const largeCss = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const text = readFileSync(file, 'utf8');

  if (/\.(tsx|ts|jsx|js)$/.test(file)) {
    const inlineCount = (text.match(/style=\{\{/g) || []).length;
    if (inlineCount > 0) {
      inlineStyleFiles.push({ file: rel, count: inlineCount });
    }
    if (text.includes('MetricGrid')) metricGridFiles.push(rel);
    if (text.includes('ApiStateBanner')) apiStateBannerFiles.push(rel);
    if (
      (rel.startsWith('src/pages/') || rel.startsWith('src/components/')) &&
      /Dashboard|CommandCenter|Analytics/i.test(rel) &&
      !text.includes('PageShell') &&
      !text.includes('cd-page-shell')
    ) {
      missingPageShell.push(rel);
    }
  }

  if (file.endsWith('.css')) {
    const lines = text.split('\n').length;
    if (lines > 400) largeCss.push({ file: rel, lines });
  }
}

inlineStyleFiles.sort((a, b) => b.count - a.count);
largeCss.sort((a, b) => b.lines - a.lines);

console.log('# Visual cleanup inventory\n');
console.log(`Scanned ${files.length} files under src/\n`);

console.log('## Inline styles (top 25)');
for (const row of inlineStyleFiles.slice(0, 25)) {
  console.log(`- ${row.file}: ${row.count}`);
}
console.log(`\nTotal files with inline styles: ${inlineStyleFiles.length}\n`);

console.log('## MetricGrid usage');
for (const file of metricGridFiles) console.log(`- ${file}`);
console.log('');

console.log('## ApiStateBanner usage');
for (const file of apiStateBannerFiles) console.log(`- ${file}`);
console.log('');

console.log('## Dashboard-like files without PageShell');
for (const file of missingPageShell.slice(0, 40)) console.log(`- ${file}`);
if (missingPageShell.length > 40) {
  console.log(`- … and ${missingPageShell.length - 40} more`);
}
console.log('');

console.log('## CSS files > 400 lines (top 20)');
for (const row of largeCss.slice(0, 20)) {
  console.log(`- ${row.file}: ${row.lines}`);
}
