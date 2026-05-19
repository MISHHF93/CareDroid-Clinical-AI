import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const parsedMax = Number.parseInt(process.env.VITEST_MAX_WORKERS ?? '', 10);
const maxWorkers = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 1;
const fileParallelism = maxWorkers > 1;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    /** Backend uses Jest (`cd backend && npm test`); exclude Nest specs from this Vite/Vitest project. */
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/backend/**',
      /** Playwright suites — run via `npm run test:e2e:responsive`. */
      '**/e2e/**',
      /** Legacy Jest-style suite; wrong paths and missing chatAPI — rewrite or delete. */
      '**/ChatInterface.test.jsx',
    ],
    /**
     * Default `maxWorkers: 1` avoids Vitest 4 worker startup timeouts on some Windows setups.
     * Parallel: `VITEST_MAX_WORKERS=4 npx vitest run` (PowerShell: `$env:VITEST_MAX_WORKERS=4; npx vitest run`).
     */
    maxWorkers,
    fileParallelism,
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        '**/*.config.{js,ts}',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
