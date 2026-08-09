/**
 * Plain ESM vitest config (no esbuild needed to load this file).
 * Use when vitest.config.ts fails: Application Control blocking esbuild.exe.
 *
 *   npx vitest run --config vitest.config.mjs <paths>
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parsedMax = Number.parseInt(process.env.VITEST_MAX_WORKERS ?? '', 10);
const maxWorkers = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 1;
const fileParallelism = maxWorkers > 1;
const jsdomNavigationPattern = /Not implemented: navigation to another Document/;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'threads',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    onConsoleLog(log) {
      if (jsdomNavigationPattern.test(log)) {
        return false;
      }
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/backend/**',
      '**/e2e/**',
      'tests/integration/**',
    ],
    maxWorkers,
    fileParallelism,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './lib'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },
});
