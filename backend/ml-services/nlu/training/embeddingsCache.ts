// Disk-cached wrapper around embeddings.ts, for offline training/eval scripts only.
// The same text (train/val/test rows) gets re-embedded across every pipeline step
// (prepare -> train -> dump errors -> merge -> retrain -> evaluate), so caching by
// (model, text) hash turns most of those into cache hits instead of fresh transformer
// inference. Not used by nlu.service.ts / artifact-router.service.ts — those serve
// live requests with unbounded, non-repeating input, where a persisted cache would
// only grow without bound and add disk I/O to the request path.

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { embedText as embedTextUncached } from './embeddings';
import { MODEL_CONFIG } from './training.config';

const CACHE_PATH = process.env.EMBEDDING_CACHE_PATH ?? path.resolve(__dirname, '..', '..', 'embedding-cache.json');
const CACHE_DISABLED = process.env.EMBEDDING_CACHE_DISABLED === 'true';
const SAVE_EVERY = 200;

let cache: Map<string, number[]> | null = null;
let dirtyCount = 0;
let hits = 0;
let misses = 0;
let invalidEntries = 0;

function cacheKey(text: string): string {
  // .trim() only — tokenizers strip leading/trailing whitespace before encoding, so this
  // cannot diverge from what the model actually sees. No case-folding: case can change
  // the actual embedding, so folding it here would risk serving a wrong cached vector.
  return `${MODEL_CONFIG.embeddingModelName}::${createHash('sha1').update(text.trim()).digest('hex')}`;
}

function isValidVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'number' && Number.isFinite(v));
}

function loadCache(): Map<string, number[]> {
  if (cache) return cache;
  cache = new Map();
  if (existsSync(CACHE_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as Record<string, unknown>;
      for (const [key, vector] of Object.entries(raw)) {
        if (isValidVector(vector)) {
          cache.set(key, vector);
        } else {
          invalidEntries += 1;
        }
      }
      if (invalidEntries > 0) {
        console.log(`  [embedding-cache] discarded ${invalidEntries} corrupt entr${invalidEntries === 1 ? 'y' : 'ies'} from ${CACHE_PATH}`);
      }
    } catch {
      console.log(`  [embedding-cache] cache file unreadable, starting fresh: ${CACHE_PATH}`);
    }
  }
  return cache;
}

export function saveEmbeddingCache(): void {
  if (!cache || dirtyCount === 0) return;
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  const obj: Record<string, number[]> = {};
  for (const [key, vector] of cache) obj[key] = vector;
  writeFileSync(CACHE_PATH, JSON.stringify(obj));
  dirtyCount = 0;
}

export function logEmbeddingCacheStats(): void {
  const total = hits + misses;
  if (total === 0) return;
  const hitRate = ((hits / total) * 100).toFixed(1);
  console.log(`  [embedding-cache] ${hits}/${total} hits (${hitRate}%), ${misses} computed, path=${CACHE_PATH}`);
}

process.on('exit', () => {
  saveEmbeddingCache();
  logEmbeddingCacheStats();
});

export async function embedTextCached(text: string): Promise<number[]> {
  if (CACHE_DISABLED) {
    misses += 1;
    return embedTextUncached(text);
  }

  const store = loadCache();
  const key = cacheKey(text);
  const hit = store.get(key);
  if (hit) {
    hits += 1;
    return hit;
  }

  misses += 1;
  const vector = await embedTextUncached(text);
  store.set(key, vector);
  dirtyCount += 1;
  if (dirtyCount >= SAVE_EVERY) saveEmbeddingCache();
  return vector;
}

export async function embedBatchCached(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await embedTextCached(text));
  }
  saveEmbeddingCache();
  logEmbeddingCacheStats();
  return embeddings;
}
