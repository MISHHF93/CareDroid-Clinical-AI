import { Injectable } from '@nestjs/common';

// Xenova sentence embeddings + trained MLP/linear head (see training/classifier.ts).
// Falls back to keyword rules when classifier.json has not been produced yet.

import { existsSync } from 'fs';
import { INTENT_CLASSES, INTENT_KEYWORDS, MODEL_CONFIG, type IntentClass } from './nlu.config';
import { embedText } from './training/embeddings';
import {
  loadAnyClassifier,
  predictFromAny,
  classifierWeightsPath,
  type AnyClassifierWeights,
} from './training/classifier';
import { MODEL_PATHS } from './training/training.config';
import { detectSubcategory } from './training/subcategory';

export interface PredictResult {
  intent: IntentClass;
  confidence: number;
  labelId: number;
  subcategory: string | null;
  keyTerms: string[];
  latencyMs: number;
}

export interface BatchPredictResult {
  results: PredictResult[];
  processingTimeMs: number;
  batchSize: number;
}

export interface ModelInfo {
  status: 'loaded' | 'unloaded' | 'error';
  modelName: string;
  intentClasses: readonly string[];
  maxLength: number;
}

function extractKeyTerms(text: string): string[] {
  const lower = text.toLowerCase();
  const allKeywords = Object.values(INTENT_KEYWORDS).flat();
  return [...new Set(allKeywords.filter((kw) => lower.includes(kw)))].slice(0, 5);
}

function ruleBasedPredict(text: string): { intentIdx: number; confidence: number } {
  const lower = text.toLowerCase();
  const scores = INTENT_CLASSES.map((intent, idx) => {
    const keywords = INTENT_KEYWORDS[intent];
    const matches = keywords.filter((kw) => lower.includes(kw)).length;
    return { idx, score: matches / Math.max(keywords.length, 1) };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  return {
    intentIdx: best.score > 0 ? best.idx : INTENT_CLASSES.indexOf('general_clinical_query'),
    confidence: best.score > 0 ? Math.min(0.5 + best.score * 0.4, 0.95) : 0.45,
  };
}

@Injectable()
export class NluService {
  private classifier: AnyClassifierWeights | null = null;
  private attemptedLoad = false;

  async load(): Promise<void> {
    if (this.attemptedLoad) return;
    this.attemptedLoad = true;

    const weightsPath = classifierWeightsPath(MODEL_PATHS.bestModelDir);
    if (!existsSync(weightsPath)) {
      // No trained classifier yet — run `npm run nlu:train` (backend/ml-services/nlu). Rule-based fallback until then.
      return;
    }

    try {
      this.classifier = loadAnyClassifier(weightsPath);
      await embedText('warmup'); // pre-load the embedding pipeline so the first real predict() isn't slow
    } catch {
      this.classifier = null;
    }
  }

  async predict(text: string): Promise<PredictResult> {
    const start = Date.now();

    let intentIdx: number;
    let confidence: number;

    if (this.classifier) {
      try {
        const embedding = await embedText(text);
        const result = predictFromAny(this.classifier, embedding);
        intentIdx = result.labelId;
        confidence = result.confidence;
      } catch {
        const rb = ruleBasedPredict(text);
        intentIdx = rb.intentIdx;
        confidence = rb.confidence;
      }
    } else {
      const rb = ruleBasedPredict(text);
      intentIdx = rb.intentIdx;
      confidence = rb.confidence;
    }

    const intent = INTENT_CLASSES[intentIdx];

    return {
      intent,
      confidence: Math.round(confidence * 1000) / 1000,
      labelId: intentIdx,
      subcategory: detectSubcategory(text, intent),
      keyTerms: extractKeyTerms(text),
      latencyMs: Date.now() - start,
    };
  }

  async predictBatch(texts: string[]): Promise<BatchPredictResult> {
    const start = Date.now();
    const results = await Promise.all(texts.map((t) => this.predict(t)));
    return {
      results,
      processingTimeMs: Date.now() - start,
      batchSize: texts.length,
    };
  }

  getModelInfo(): ModelInfo {
    return {
      status: this.classifier ? 'loaded' : 'unloaded',
      modelName: this.classifier ? this.classifier.embeddingModelName : MODEL_CONFIG.modelName,
      intentClasses: INTENT_CLASSES,
      maxLength: MODEL_CONFIG.maxLength,
    };
  }

  unload(): void {
    this.classifier = null;
    this.attemptedLoad = false;
  }
}
