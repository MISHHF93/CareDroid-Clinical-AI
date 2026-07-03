// TypeScript replacement for _deprecated-python/utils.py

import { createHash } from 'crypto';

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function truncateText(text: string, maxLength = 2048): string {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
}

export function splitIntoChunks(text: string, chunkSize = 512, overlap = 50): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  const step = Math.max(chunkSize - overlap, 1);

  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export function normalizeText(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(' ').trim();
}
