/**
 * The single vitest configuration. Both entry points below re-export it:
 *
 *   vitest.config.ts   — what vitest picks up by default
 *   vitest.config.mjs  — the esbuild-free escape hatch, used with
 *                        `--config vitest.config.mjs` when Application
 *                        Control blocks esbuild.exe
 *
 * They used to be two hand-maintained copies of the same object, and they had
 * already drifted (found 2026-09-05): the .ts carried a `coverage` block the
 * .mjs did not, so running the fallback with `--coverage` silently used v8
 * defaults and different exclusions; and the .ts resolved aliases from
 * `process.cwd()` while the .mjs used its own directory, so the two disagreed
 * whenever vitest was invoked from anywhere but the repo root. A fallback that
 * behaves differently from the config it stands in for is worse than no
 * fallback, because it is reached exactly when nobody can run the real one.
 *
 * This file is plain ESM on purpose — the .mjs entry point must stay loadable
 * without esbuild, so the shared source cannot be TypeScript.
 */
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const parsedMax = Number.parseInt(process.env.VITEST_MAX_WORKERS ?? '', 10);
const maxWorkers = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 1;
const fileParallelism = maxWorkers > 1;
const jsdomNavigationPattern = /Not implemented: navigation to another Document/;

export const vitestSharedConfig = {
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // threads shares one process — forks OOM/hang on heavy route integration tests (Windows).
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.config.{js,ts}',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    // Anchored to this file's directory, not process.cwd(), so the aliases
    // resolve the same way regardless of where vitest was invoked from.
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@lib': path.resolve(rootDir, './lib'),
      '@store': path.resolve(rootDir, './src/store'),
    },
  },
};

export default vitestSharedConfig;
