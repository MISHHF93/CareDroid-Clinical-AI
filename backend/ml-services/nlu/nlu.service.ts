// TypeScript replacement for model.py + app.py
// Uses @xenova/transformers (HuggingFace Transformers.js) to run DistilBERT inference
// in Node.js — no Python runtime required.
// Install: npm install @xenova/transformers (backend)

import { INTENT_CLASSES, MODEL_CONFIG, type IntentClass } from './nlu.config';

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

// Clinical keywords extracted per intent class for rule-based fallback
const INTENT_KEYWORDS: Record<IntentClass, string[]> = {
  drug_interaction_check: ['drug', 'medication', 'interaction', 'contraindication', 'combine', 'take with'],
  lab_interpretation: ['lab', 'result', 'level', 'value', 'normal', 'abnormal', 'creatinine', 'glucose', 'hemoglobin'],
  sofa_score_calculation: ['sofa', 'score', 'organ', 'failure', 'sepsis', 'icu'],
  clinical_guideline_lookup: ['guideline', 'protocol', 'recommendation', 'evidence', 'treatment'],
  patient_status_update: ['patient', 'status', 'update', 'condition', 'stable', 'critical', 'improving'],
  emergency_alert: ['emergency', 'urgent', 'critical', 'code', 'alert', 'immediate', 'stat'],
  discharge_planning: ['discharge', 'home', 'follow-up', 'plan', 'instructions', 'release'],
  medication_order: ['order', 'prescribe', 'dose', 'mg', 'administer', 'give'],
  diagnosis_support: ['diagnosis', 'differential', 'symptom', 'present', 'assess', 'history'],
  general_clinical_query: ['question', 'what', 'how', 'why', 'when', 'clinical'],
};

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

export class NluService {
  private loaded = false;
  private pipeline: ((text: string | string[]) => Promise<unknown>) | null = null;

  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      // Dynamically import @xenova/transformers to avoid hard dependency at module load time
      const { pipeline } = await import('@xenova/transformers' as string);
      this.pipeline = await (pipeline as (task: string, model: string) => Promise<typeof this.pipeline>)(
        'text-classification',
        MODEL_CONFIG.modelName,
      );
      this.loaded = true;
    } catch {
      // @xenova/transformers not installed or model not available — fall back to rule-based
      this.loaded = false;
    }
  }

  async predict(text: string): Promise<PredictResult> {
    const start = Date.now();

    let intentIdx: number;
    let confidence: number;

    if (this.pipeline) {
      try {
        const output = (await this.pipeline(text)) as Array<{ label: string; score: number }>;
        const top = output[0];
        const labelIdx = Number(top.label.replace('LABEL_', ''));
        intentIdx = labelIdx < INTENT_CLASSES.length ? labelIdx : 0;
        confidence = top.score;
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
      subcategory: null,
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
      status: this.loaded ? 'loaded' : 'unloaded',
      modelName: MODEL_CONFIG.modelName,
      intentClasses: INTENT_CLASSES,
      maxLength: MODEL_CONFIG.maxLength,
    };
  }

  unload(): void {
    this.pipeline = null;
    this.loaded = false;
  }
}

export const nluService = new NluService();
