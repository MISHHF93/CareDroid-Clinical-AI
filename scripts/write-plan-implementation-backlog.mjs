import { promises as fs } from 'node:fs';
import path from 'node:path';

const DOCS_DIR = path.resolve('docs');
const OUTPUT_PATH = path.join(DOCS_DIR, 'plan-implementation-backlog.md');

const PHASE_PATTERN = /^(?:#{2,6}\s+)?(?:[-*]\s+)?(?:\d+\.\s+)?phase\s+\d+\s*:\s+.+$/gim;

const normalizePhaseLine = (line) => line.replace(/^#{2,6}\s+/, '').replace(/^[-*]\s+/, '').trim();

const toTitle = (file) =>
  file
    .replace(/\.md$/i, '')
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');

const main = async () => {
  const files = (await fs.readdir(DOCS_DIR))
    .filter((entry) => entry.endsWith('.md'))
    .filter((entry) => entry !== path.basename(OUTPUT_PATH))
    .sort((a, b) => a.localeCompare(b));

  const records = [];

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');
    const matches = content.match(PHASE_PATTERN) ?? [];
    if (matches.length === 0) continue;

    records.push({
      file,
      title: toTitle(file),
      phases: matches.map((entry) => normalizePhaseLine(entry)),
    });
  }

  const lines = [];
  lines.push('# Plan Implementation Backlog');
  lines.push('');
  lines.push('Auto-generated from markdown plans in `docs/`.');
  lines.push('');
  lines.push(`Generated on: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Coverage');
  lines.push('');
  lines.push(`- Documents scanned: ${files.length}`);
  lines.push(`- Documents with implementation phases: ${records.length}`);
  lines.push(`- Total phase entries: ${records.reduce((sum, record) => sum + record.phases.length, 0)}`);
  lines.push('');

  for (const record of records) {
    lines.push(`## ${record.title}`);
    lines.push('');
    lines.push(`Source: \`${record.file}\``);
    lines.push('');
    record.phases.forEach((phase) => lines.push(`- [ ] ${phase}`));
    lines.push('');
  }

  await fs.writeFile(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH} with ${records.length} plan documents.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
