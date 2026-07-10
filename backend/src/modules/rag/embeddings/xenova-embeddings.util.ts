type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

const DEFAULT_MODEL = 'Xenova/all-mpnet-base-v2';

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
let activeModel = DEFAULT_MODEL;

export function resolveXenovaModel(modelName?: string): string {
  const normalized = String(modelName || '').trim();
  if (!normalized) return DEFAULT_MODEL;
  if (normalized.startsWith('Xenova/')) return normalized;
  if (normalized.includes('mpnet') || normalized.includes('minilm')) {
    return `Xenova/${normalized.replace(/^xenova\//i, '')}`;
  }
  return DEFAULT_MODEL;
}

export async function embedTextWithXenova(
  text: string,
  modelName = DEFAULT_MODEL,
): Promise<number[]> {
  const model = resolveXenovaModel(modelName);
  if (model !== activeModel) {
    activeModel = model;
    pipelinePromise = null;
  }

  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import('@xenova/transformers' as string);
      return (await (pipeline as (task: string, model: string) => Promise<unknown>)(
        'feature-extraction',
        model,
      )) as FeatureExtractionPipeline;
    })();
  }

  const extractor = await pipelinePromise;
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
