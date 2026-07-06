import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { MANIFEST_PATH, metricsPath, type ClassifierHead } from './paths';

export interface LocalMlModelDescriptor {
  modelId: string;
  name: string;
  purpose: string;
  head: ClassifierHead;
  route: string;
  classifierPath: string;
  metricsPath: string;
  status: 'active' | 'untrained';
  accuracy?: number;
  architecture?: string;
  numClasses?: number;
  targetMode?: string;
}

function resolveRepoRoot(): string {
  const fromCwd = path.resolve(process.cwd());
  if (existsSync(path.join(fromCwd, 'ml-services', 'models'))) return fromCwd;
  return path.resolve(fromCwd, '..');
}

export function loadLocalMlModelDescriptors(repoRoot = resolveRepoRoot()): LocalMlModelDescriptor[] {
  const manifestFile = path.join(repoRoot, 'ml-services', 'models', 'manifest.json');
  const heads: ClassifierHead[] = ['nlu', 'artifact-router'];

  return heads.map((head) => {
    const classifierPath = path.join(repoRoot, 'ml-services', 'models', head, 'classifier.json');
    const metricsFile = path.join(repoRoot, 'ml-services', 'models', head, 'metrics.json');
    const trained = existsSync(classifierPath);
    let metrics: Record<string, unknown> = {};
    if (existsSync(metricsFile)) {
      try {
        metrics = JSON.parse(readFileSync(metricsFile, 'utf8')) as Record<string, unknown>;
      } catch {
        metrics = {};
      }
    }

    const isNlu = head === 'nlu';
    return {
      modelId: isNlu ? 'nlu-intent-classifier' : 'artifact-router',
      name: isNlu ? 'NLU Intent Classifier' : 'Artifact Router',
      purpose: isNlu
        ? 'Maps clinical utterances to 10 governed intent classes for chat and AI Chief routing.'
        : 'Maps utterances to artifact types (calculator, tool, route, …) for unified AI node routing.',
      head,
      route: isNlu ? '/api/nlu/predict' : '/api/ai/node/models/route',
      classifierPath: classifierPath.split(path.sep).join('/'),
      metricsPath: metricsFile.split(path.sep).join('/'),
      status: trained ? 'active' : 'untrained',
      accuracy: typeof metrics.accuracy === 'number' ? metrics.accuracy : undefined,
      architecture: typeof metrics.architecture === 'string' ? metrics.architecture : undefined,
      numClasses: typeof metrics.numClasses === 'number' ? metrics.numClasses : undefined,
      targetMode: typeof metrics.targetMode === 'string' ? metrics.targetMode : undefined,
      manifestPath: existsSync(manifestFile) ? manifestFile.split(path.sep).join('/') : MANIFEST_PATH,
    };
  });
}