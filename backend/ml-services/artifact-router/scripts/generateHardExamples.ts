import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { formatArtifactRouterInput } from '../../shared/router-input';
import { loadArtifactTrainingCsv, type ArtifactTrainingExample } from '../training/dataset';
import { MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

const ERROR_REPORT = path.join(path.dirname(MODEL_PATHS.testData), 'error_report.json');
const HARD_PATH = path.join(path.dirname(MODEL_PATHS.testData), 'hard_examples.jsonl');

function main(): void {
  if (!existsSync(ERROR_REPORT)) {
    console.error(`Missing ${ERROR_REPORT} — run dumpErrors.ts first`);
    process.exitCode = 1;
    return;
  }

  const errors = JSON.parse(readFileSync(ERROR_REPORT, 'utf8')) as Array<{
    inputText: string;
    labelType: string;
    artifactId: string;
    artifactType: string;
  }>;

  const catalog = loadArtifactTrainingCsv();
  const byArtifact = new Map<string, ArtifactTrainingExample[]>();
  for (const row of catalog) {
    if (!TRAINING_CONFIG.labelTypes.includes(row.labelType)) continue;
    const list = byArtifact.get(row.artifactId) ?? [];
    list.push(row);
    byArtifact.set(row.artifactId, list);
  }

  const hard: ArtifactTrainingExample[] = [];
  const seen = new Set<string>();

  for (const err of errors) {
    const lt = err.labelType === 'route' ? 'route' : 'name';
    const exact = formatArtifactRouterInput(err.inputText, lt as 'name' | 'route', err.artifactType);
    const exactKey = `${exact}::${err.artifactType}`;
    if (!seen.has(exactKey)) {
      seen.add(exactKey);
      for (let i = 0; i < 8; i++) {
        hard.push({
          inputText: exact,
          artifactId: err.artifactId,
          category: err.artifactType,
          artifactType: err.artifactType,
          labelType: lt,
          confidence: 0.99,
        });
      }
    }

    const siblings = byArtifact.get(err.artifactId) ?? [];
    for (const row of siblings) {
      if (!TRAINING_CONFIG.labelTypes.includes(row.labelType)) continue;
      const sLt = row.labelType === 'route' ? 'route' : 'name';
      const text = formatArtifactRouterInput(row.inputText, sLt as 'name' | 'route', row.artifactType);
      const siblingKey = `${text}::${row.artifactType}`;
      if (seen.has(siblingKey)) continue;
      seen.add(siblingKey);
      for (let i = 0; i < 4; i++) {
        hard.push({
          ...row,
          inputText: text,
          confidence: 0.99,
        });
      }
    }
  }

  writeFileSync(HARD_PATH, hard.map((row) => JSON.stringify(row)).join('\n') + '\n');
  console.log(`Wrote ${hard.length} hard examples to ${HARD_PATH}`);
}

if (require.main === module) {
  main();
}