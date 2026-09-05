/**
 * Plain ESM vitest config (no esbuild needed to load this file).
 * Use when vitest.config.ts fails: Application Control blocking esbuild.exe.
 *
 *   npx vitest run --config vitest.config.mjs <paths>
 *
 * The configuration itself lives in vitest.shared.mjs, which vitest.config.ts
 * also re-exports — so this fallback cannot drift away from the real config.
 */
import { defineConfig } from 'vitest/config';
import { vitestSharedConfig } from './vitest.shared.mjs';

export default defineConfig(vitestSharedConfig);
