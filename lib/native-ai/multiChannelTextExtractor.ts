import type { NativeAiSourceState } from './types';

export type MultiChannelTextInput = {
  text: string;
  sourceLabel?: string;
  sourceState?: NativeAiSourceState;
};

export type MultiChannelTextFeatures = {
  globalFeatures: string[];
  localFeatures: string[];
  fusedFeatures: string[];
  globalWeight: number;
  localWeight: number;
  modelId: string;
  modelVersion: string;
  confidence: number;
  sourceState: NativeAiSourceState;
};

const MODEL_ID = 'multi-channel-text';
const MODEL_VERSION = '1.0.0-roberta-mha-cnn-heuristic';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%/-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function ngramMask(tokens: string[], n = 2): string[] {
  const grams: string[] = [];
  for (let index = 0; index < tokens.length - n + 1; index += 1) {
    grams.push(tokens.slice(index, index + n).join('_'));
  }
  return grams;
}

const LOCAL_PATTERNS = [
  { label: 'chest_pain_radiation', pattern: /chest pain.{0,30}(radiat|arm|jaw)/i },
  { label: 'troponin_pending', pattern: /troponin.{0,20}(pending|ordered|elevated)/i },
  { label: 'sepsis_concern', pattern: /(sepsis|lactate|hypotension|fever)/i },
  { label: 'stroke_symptoms', pattern: /(facial droop|slurred|weakness|aphasia)/i },
];

export function extractMultiChannelClinicalTextFeatures(
  input: MultiChannelTextInput,
): MultiChannelTextFeatures {
  const text = String(input.text || '').trim();
  const tokens = tokenize(text);
  const padded = ['<pad>', ...tokens, '<pad>'];
  const ngrams = ngramMask(padded, 2).slice(0, 24);

  const globalFeatures = Array.from(
    new Set([
      tokens.includes('chest') && tokens.includes('pain') ? 'global:chest_pain' : null,
      tokens.includes('shortness') || tokens.includes('breath') || tokens.includes('dyspnea')
        ? 'global:respiratory_distress'
        : null,
      tokens.includes('fever') || tokens.includes('sepsis') ? 'global:infection_signal' : null,
      tokens.length > 40 ? 'global:rich_narrative' : 'global:brief_narrative',
      input.sourceLabel ? `global:source:${input.sourceLabel}` : null,
    ].filter(Boolean) as string[]),
  );

  const localFeatures = LOCAL_PATTERNS.filter((entry) => entry.pattern.test(text)).map(
    (entry) => `local:${entry.label}`,
  );

  const narrativeComplexity = Math.min(1, tokens.length / 60);
  const localDensity = localFeatures.length / Math.max(1, LOCAL_PATTERNS.length);
  const globalWeight = Number((0.45 + narrativeComplexity * 0.25).toFixed(2));
  const localWeight = Number((1 - globalWeight + localDensity * 0.2).toFixed(2));
  const norm = globalWeight + localWeight || 1;

  const fusedFeatures = [
    ...globalFeatures.map((feature) => `${feature}@${(globalWeight / norm).toFixed(2)}`),
    ...localFeatures.map((feature) => `${feature}@${(localWeight / norm).toFixed(2)}`),
    ...ngrams.slice(0, 6).map((gram) => `ngram:${gram}`),
  ];

  return {
    globalFeatures,
    localFeatures,
    fusedFeatures,
    globalWeight: Number((globalWeight / norm).toFixed(2)),
    localWeight: Number((localWeight / norm).toFixed(2)),
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    confidence: Number(Math.min(0.92, 0.55 + localFeatures.length * 0.1 + narrativeComplexity * 0.2).toFixed(2)),
    sourceState: input.sourceState || 'demo',
  };
}