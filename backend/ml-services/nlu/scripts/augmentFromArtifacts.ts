import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { loadJsonlDataset, writeJsonlDataset, type NluExample } from '../training/dataset';
import { INTENT_CLASSES, type IntentClass } from '../nlu.config';
import { MODEL_PATHS } from '../training/training.config';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ARTIFACT_CATALOG = path.join(REPO_ROOT, 'data', 'artifacts', 'caredroid_artifacts.json');
const CORPUS_PATH = path.join(path.dirname(MODEL_PATHS.trainingData), 'corpus.jsonl');

const INTENT_SET = new Set<string>(INTENT_CLASSES);

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isQualityClinicalUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 12) return false;
  if (/^type:/i.test(trimmed)) return false;
  if (/^how do i use this app/i.test(trimmed)) return false;
  if (/^run the /i.test(trimmed) && trimmed.length < 22) return false;
  if (/^pull up /i.test(trimmed) && trimmed.length < 22) return false;
  return /[a-z]{3,}/i.test(trimmed);
}

function dedupeExamples(examples: NluExample[]): NluExample[] {
  const seen = new Set<string>();
  const result: NluExample[] = [];
  for (const example of examples) {
    const key = `${normalizeText(example.text)}::${example.intent}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(example);
  }
  return result;
}

function examplesFromArtifacts(): NluExample[] {
  if (!existsSync(ARTIFACT_CATALOG)) return [];

  const artifacts = JSON.parse(readFileSync(ARTIFACT_CATALOG, 'utf8')) as Array<Record<string, unknown>>;
  const generated: NluExample[] = [];

  for (const artifact of artifacts) {
    if (artifact.type !== 'nlu-example') continue;
    // Skip split outputs re-captured into the artifact catalog (circular training leak).
    const sourceFile = String(artifact.sourceFile || '');
    if (/train\.jsonl|val\.jsonl|test\.jsonl/.test(sourceFile)) continue;
    const intent = String(artifact.category || '');
    if (!INTENT_SET.has(intent)) continue;
    const text = String(artifact.description || '').trim();
    if (!isQualityClinicalUtterance(text)) continue;
    generated.push({ text, intent: intent as IntentClass });
  }

  return generated;
}

function loadSplitRecoveryExamples(): NluExample[] {
  const splitPaths = [MODEL_PATHS.trainingData, MODEL_PATHS.validationData, MODEL_PATHS.testData];
  const recovered: NluExample[] = [];
  for (const splitPath of splitPaths) {
    if (!existsSync(splitPath)) continue;
    recovered.push(...loadJsonlDataset(splitPath));
  }
  return recovered;
}

function augmentNluCorpusFromArtifacts(): void {
  const fromArtifacts = examplesFromArtifacts();
  const existingCorpus = existsSync(CORPUS_PATH) ? loadJsonlDataset(CORPUS_PATH) : [];
  const recovery =
    fromArtifacts.length === 0 && existingCorpus.length === 0 ? loadSplitRecoveryExamples() : [];
  const merged = dedupeExamples([...existingCorpus, ...fromArtifacts, ...recovery]);

  if (merged.length === 0) {
    console.error('No NLU examples found; refusing to overwrite corpus.');
    return;
  }

  writeJsonlDataset(CORPUS_PATH, merged);

  console.log(`High-quality NLU examples: ${merged.length}`);
  if (recovery.length) console.log(`Recovered ${recovery.length} examples from train/val/test splits`);
  console.log(`Wrote ${CORPUS_PATH}`);
}

if (require.main === module) {
  augmentNluCorpusFromArtifacts();
}

export { augmentNluCorpusFromArtifacts, isQualityClinicalUtterance };