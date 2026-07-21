import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { embedText } from '../nlu/training/embeddings';
import { loadAnyClassifier, predictFromAny, type AnyClassifierWeights } from '../nlu/training/classifier';
import { resolveClassifierPath } from '../shared/paths';
import {
  applyRouterPathPrior,
  formatArtifactRouterInput,
  inferArtifactTypeHintFromText,
  inferRouterLabelType,
} from '../shared/router-input';
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
      const labelType = inferRouterLabelType(text);
      const typeHint = inferArtifactTypeHintFromText(text);
      const formatted = formatArtifactRouterInput(text, labelType, typeHint);
      const embedding = await embedText(formatted);
      const { labelId, confidence } = predictFromAny(this.classifier, embedding);
      const labelNames = this.classifier.labelToIntent ?? {};
      const raw = labelNames[labelId] ?? 'unknown';
      const prior = applyRouterPathPrior(formatted, raw, confidence);
      return {
        artifactType: prior.artifactType,
        confidence: Math.round(prior.confidence * 1000) / 1000,
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
