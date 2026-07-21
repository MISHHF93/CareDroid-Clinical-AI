import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { formatArtifactRouterInput } from '../../shared/router-input';
import { loadArtifactTrainingCsv, type ArtifactTrainingExample } from '../training/dataset';
import { MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

const ERROR_REPORT = path.join(path.dirname(MODEL_PATHS.testData), 'error_report.json');
const HARD_PATH = path.join(path.dirname(MODEL_PATHS.testData), 'hard_examples.jsonl');

function pushVariants(
  hard: ArtifactTrainingExample[],
  seen: Set<string>,
  base: ArtifactTrainingExample,
  repeats: number,
): void {
  const lt = base.labelType === 'route' ? 'route' : 'name';
  const formatted = formatArtifactRouterInput(base.inputText, lt, base.artifactType);
  const key = `${formatted}::${base.artifactType}`;
  if (seen.has(key)) return;
  seen.add(key);
  for (let i = 0; i < repeats; i++) {
    hard.push({
      ...base,
      inputText: formatted,
      labelType: lt,
      confidence: 0.99,
    });
  }
}

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
    category?: string;
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
    pushVariants(
      hard,
      seen,
      {
        inputText: err.inputText,
        artifactId: err.artifactId,
        category: err.category ?? err.artifactType,
        artifactType: err.artifactType,
        labelType: lt,
        confidence: 0.99,
      },
      // Keep hard-example weight mild — aggressive repeats overfit val and
      // regressed held-out test (95.81% → 94.19% in the two-pass experiment).
      3,
    );

    const siblings = byArtifact.get(err.artifactId) ?? [];
    for (const row of siblings) {
      if (!TRAINING_CONFIG.labelTypes.includes(row.labelType)) continue;
      // Force sibling gold type to the error's expected type so hard examples
      // reinforce the label we failed on, not a raw uncollapsed catalog type.
      pushVariants(
        hard,
        seen,
        {
          ...row,
          artifactType: err.artifactType,
          category: err.artifactType,
        },
        2,
      );
    }
  }

  writeFileSync(HARD_PATH, hard.map((row) => JSON.stringify(row)).join('\n') + '\n');
  console.log(`Wrote ${hard.length} hard examples to ${HARD_PATH}`);
}

if (require.main === module) {
  main();
}
