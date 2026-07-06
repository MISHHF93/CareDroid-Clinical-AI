import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { embedText } from '../nlu/training/embeddings';
import { loadAnyClassifier, predictFromAny, type AnyClassifierWeights } from '../nlu/training/classifier';
import { resolveClassifierPath } from '../shared/paths';
import { formatArtifactRouterInput, inferRouterLabelType } from '../shared/router-input';

function inferArtifactTypeHint(text: string): string | undefined {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (inferRouterLabelType(trimmed) === 'route' && /^\/products/.test(trimmed)) return 'platform';
  if (inferRouterLabelType(trimmed) === 'route' && /^\/settings/.test(trimmed)) return 'route';
  if (/\.service$|dto$/i.test(trimmed)) return 'platform';
  if (/registry|types|disclaimer/i.test(trimmed)) return 'platform';
  if (/^frontend-api-|reports-|dashboard|status|policies|tracking/i.test(lower)) return 'api-endpoint';
  if (/\bprompt\b/i.test(trimmed)) return 'prompt';
  return undefined;
}
import { TRAINING_CONFIG } from '../artifact-router/training/training.config';

export interface ArtifactRouteResult {
  artifactType: string;
  confidence: number;
  labelId: number;
  targetMode: string;
  latencyMs: number;
}

export interface ArtifactRouterModelInfo {
  status: 'loaded' | 'unloaded' | 'error';
  targetMode: string;
  numClasses: number;
  embeddingModel: string;
  labelNames: string[];
}

@Injectable()
export class ArtifactRouterService {
  private classifier: AnyClassifierWeights | null = null;
  private attemptedLoad = false;

  async load(): Promise<void> {
    if (this.attemptedLoad) return;
    this.attemptedLoad = true;

    const weightsPath = resolveClassifierPath('artifact-router');
    if (!existsSync(weightsPath)) return;

    try {
      this.classifier = loadAnyClassifier(weightsPath);
      await embedText('warmup');
    } catch {
      this.classifier = null;
    }
  }

  async predict(text: string): Promise<ArtifactRouteResult> {
    const start = Date.now();
    const fallback = {
      artifactType: 'unknown',
      confidence: 0,
      labelId: -1,
      targetMode: TRAINING_CONFIG.targetMode,
      latencyMs: Date.now() - start,
    };

    if (!this.classifier) return fallback;

    try {
      const embedding = await embedText(formatArtifactRouterInput(text, undefined, inferArtifactTypeHint(text)));
      const { labelId, confidence } = predictFromAny(this.classifier, embedding);
      const labelNames = this.classifier.labelToIntent ?? {};
      return {
        artifactType: labelNames[labelId] ?? 'unknown',
        confidence: Math.round(confidence * 1000) / 1000,
        labelId,
        targetMode: TRAINING_CONFIG.targetMode,
        latencyMs: Date.now() - start,
      };
    } catch {
      return fallback;
    }
  }

  getModelInfo(): ArtifactRouterModelInfo {
    const labelMap = this.classifier?.labelToIntent ?? {};
    const labelNames = Object.keys(labelMap)
      .map((key) => Number(key))
      .sort((a, b) => a - b)
      .map((id) => labelMap[id]);

    return {
      status: this.classifier ? 'loaded' : 'unloaded',
      targetMode: TRAINING_CONFIG.targetMode,
      numClasses: labelNames.length,
      embeddingModel: this.classifier?.embeddingModelName ?? 'unloaded',
      labelNames,
    };
  }

  unload(): void {
    this.classifier = null;
    this.attemptedLoad = false;
  }
}