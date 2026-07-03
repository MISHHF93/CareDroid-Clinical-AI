// Produces sentence embeddings via @xenova/transformers (Transformers.js), used
// as the frozen feature extractor that the trainable classifier head sits on
// top of — the Node-native analog of tokenizing + running a text through BERT
// in _deprecated-python/model.py, minus the fine-tuning of BERT's own weights.

import { MODEL_CONFIG } from './training.config';

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import('@xenova/transformers' as string);
      return (await (pipeline as (task: string, model: string) => Promise<unknown>)(
        'feature-extraction',
        MODEL_CONFIG.embeddingModelName,
      )) as FeatureExtractionPipeline;
    })();
  }
  return pipelinePromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await embedText(text));
  }
  return embeddings;
}
