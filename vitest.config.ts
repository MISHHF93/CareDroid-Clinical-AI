/**
 * The config vitest picks up by default. The configuration itself lives in
 * vitest.shared.mjs, which vitest.config.mjs (the esbuild-free escape hatch)
 * also re-exports — so the two entry points cannot drift apart.
 */
import { defineConfig } from 'vitest/config';
import { vitestSharedConfig } from './vitest.shared.mjs';

export default defineConfig(vitestSharedConfig);
