// Node-only companion to artifactIntelligence.ts — reads NLU training data and medical
// knowledge documents from disk. Never import this from browser-rendered code
// (components, pages, client services); it will break the Vite client build the same
// way artifactIntelligence.ts itself used to before these functions were split out.
// artifactIntelligence.ts loads this dynamically (with /* @vite-ignore */) behind a
// `typeof window === 'undefined'` guard so Rollup never has to resolve node:fs for the
// browser bundle, while Node/test contexts still get the real filesystem-backed data.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { getLocalTrainedMlModelRegistry } from './aiModelRegistry.node';

function readJsonlLines(filePath: string) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function loadNluTrainingExamples() {
  const nluDataDir = path.join(process.cwd(), 'backend', 'ml-services', 'nlu', 'data');
  if (!existsSync(nluDataDir)) return [];

  const examples: Array<{
    text: string;
    intent: string;
    subcategory: string | undefined;
    split: string;
    sourceFile: string;
    index: number;
  }> = [];
  // Only index the master corpus — never re-ingest train/val/test splits (circular leak).
  for (const fileName of ['corpus.jsonl']) {
    const split = fileName.replace('.jsonl', '');
    const sourceFile = path.join('backend', 'ml-services', 'nlu', 'data', fileName).split(path.sep).join('/');
    for (const [index, row] of readJsonlLines(path.join(nluDataDir, fileName)).entries()) {
      if (!row.text || !row.intent) continue;
      examples.push({
        text: String(row.text),
        intent: String(row.intent),
        subcategory: row.subcategory ? String(row.subcategory) : undefined,
        split,
        sourceFile,
        index,
      });
    }
  }
  return examples;
}

export function loadMedicalKnowledgeDocuments() {
  const knowledgeDir = path.join(process.cwd(), 'data', 'medical-knowledge');
  if (!existsSync(knowledgeDir)) return [];

  return readdirSync(knowledgeDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const absolute = path.join(knowledgeDir, fileName);
      const body = readFileSync(absolute, 'utf8');
      const relative = path.join('data', 'medical-knowledge', fileName).split(path.sep).join('/');
      const title = path.basename(fileName, '.md').replace(/-/g, ' ');
      return { fileName, relative, body, title };
    });
}

export const nodeArtifactEnrichments = {
  localTrainedMlModels: getLocalTrainedMlModelRegistry,
  nluTrainingExamples: loadNluTrainingExamples,
  medicalKnowledgeDocuments: loadMedicalKnowledgeDocuments,
};
