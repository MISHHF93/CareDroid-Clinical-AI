import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Isolated config for heavy AppRoutes integration tests.
 * Uses fork pool + serial execution to avoid thread-worker OOM on Windows.
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/routing/canonicalRouteTree.redirects.test.tsx'],
      pool: 'forks',
      maxWorkers: 1,
      fileParallelism: false,
      hookTimeout: 120_000,
      testTimeout: 60_000,
      isolate: true,
    },
  }),
);