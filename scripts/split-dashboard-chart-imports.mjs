import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(ent.name)) out.push(p);
  }
  return out;
}

const chartNames = new Set(['CategoryBarChart', 'TrendChart', 'DistributionDonutChart']);
const files = walk('src');
let updated = 0;

for (const file of files) {
  if (file.includes('DashboardVisualizations') || file.includes('DashboardCharts')) continue;
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('DashboardVisualizations')) continue;
  if (![...chartNames].some((n) => src.includes(n))) continue;

  const re = /import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]*DashboardVisualizations)\2\s*;?/g;
  const next = src.replace(re, (full, names, quote, fromPath) => {
    const parts = names
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const charts = parts.filter((p) => chartNames.has(p.split(/\s+as\s+/)[0]));
    const rest = parts.filter((p) => !chartNames.has(p.split(/\s+as\s+/)[0]));
    const chartsPath = fromPath.replace('DashboardVisualizations', 'DashboardCharts');
    const lines = [];
    if (rest.length) {
      lines.push(`import { ${rest.join(', ')} } from ${quote}${fromPath}${quote};`);
    }
    if (charts.length) {
      lines.push(`import { ${charts.join(', ')} } from ${quote}${chartsPath}${quote};`);
    }
    return lines.join('\n');
  });

  if (next !== src) {
    fs.writeFileSync(file, next);
    updated += 1;
    console.log('updated', file);
  }
}

console.log('total', updated);
