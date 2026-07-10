import { defineConfig } from 'vitest/config';
import path from 'path';

// Rooted at backend/ so Vite's default node_modules resolution walks up from
// there (finding backend/node_modules first) — this test imports real backend
// TypeScript source, which depends on packages only installed under backend/.
export default defineConfig({
  root: path.resolve(__dirname, 'backend'),
  test: {
    globals: true,
    environment: 'node',
    include: ['../tests/integration/**/*.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
