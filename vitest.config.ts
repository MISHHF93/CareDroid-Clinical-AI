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
    pool: 'threads',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/backend/**',
      '**/e2e/**',
      '**/features/future-modules/_review/**',
      'src/pages/WorkspaceHome.test.jsx',
      'tests/integration/**',
    ],
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
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.config.{js,ts}',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      '@lib': path.resolve(process.cwd(), './lib'),
    },
  },
});
