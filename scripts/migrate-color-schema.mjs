/**
 * One-shot migration: neon greens, legacy danger red, muted-text alias.
 * Run: node scripts/migrate-color-schema.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = join(import.meta.dirname, '..', 'src');
const EXT = new Set(['.css', '.tsx', '.jsx', '.ts', '.js']);

const NEON_REPLACEMENTS = [
  ['rgba(0, 255, 136, 0.05)', 'var(--medical-accent-tint-faint)'],
  ['rgba(0, 255, 136, 0.06)', 'color-mix(in srgb, var(--app-accent-interactive) 6%, transparent)'],
  ['rgba(0, 255, 136, 0.08)', 'var(--medical-accent-tint-subtle)'],
  ['rgba(0, 255, 136, 0.1)', 'var(--medical-accent-tint)'],
  ['rgba(0, 255, 136, 0.11)', 'color-mix(in srgb, var(--app-accent-interactive) 11%, transparent)'],
  ['rgba(0, 255, 136, 0.12)', 'var(--medical-accent-tint-mid)'],
  ['rgba(0, 255, 136, 0.15)', 'var(--medical-accent-tint-strong)'],
  ['rgba(0, 255, 136, 0.18)', 'color-mix(in srgb, var(--app-accent-interactive) 18%, transparent)'],
  ['rgba(0, 255, 136, 0.2)', 'var(--medical-accent-ring)'],
  ['rgba(0, 255, 136, 0.24)', 'color-mix(in srgb, var(--app-accent-interactive) 24%, transparent)'],
  ['rgba(0, 255, 136, 0.25)', 'color-mix(in srgb, var(--app-accent-interactive) 25%, transparent)'],
  ['rgba(0, 255, 136, 0.28)', 'var(--medical-accent-border)'],
  ['rgba(0, 255, 136, 0.3)', 'color-mix(in srgb, var(--app-accent-interactive) 30%, transparent)'],
  ['rgba(0, 255, 136, 0.34)', 'color-mix(in srgb, var(--app-accent-interactive) 34%, transparent)'],
  ['rgba(0, 255, 136, 0.35)', 'var(--medical-accent-ring-strong)'],
  ['rgba(0, 255, 136, 0.36)', 'color-mix(in srgb, var(--app-accent-interactive) 36%, transparent)'],
  ['rgba(0, 255, 136, 0.38)', 'color-mix(in srgb, var(--app-accent-interactive) 38%, transparent)'],
  ['rgba(0, 255, 136, 0.42)', 'var(--medical-accent-ring-bold)'],
  ['rgba(0, 255, 136, 0.44)', 'color-mix(in srgb, var(--app-accent-interactive) 44%, transparent)'],
  ['rgba(0, 255, 136, 0.45)', 'color-mix(in srgb, var(--app-accent-interactive) 45%, transparent)'],
  ['rgba(0, 255, 136, 0.5)', 'color-mix(in srgb, var(--app-accent-interactive) 50%, transparent)'],
  ['rgba(0, 255, 136, 0.55)', 'color-mix(in srgb, var(--app-accent-interactive) 55%, transparent)'],
  ['rgba(0, 255, 136, 0.7)', 'color-mix(in srgb, var(--app-accent-interactive) 70%, transparent)'],
  ['rgba(0, 153, 255, 0.06)', 'color-mix(in srgb, var(--app-accent-interactive) 6%, transparent)'],
  ['rgba(0, 153, 255, 0.08)', 'var(--medical-accent-tint-subtle)'],
  ['rgba(0, 153, 255, 0.1)', 'var(--medical-accent-tint)'],
  ['rgba(0, 255, 255, 0.1)', 'var(--medical-accent-tint)'],
  ['rgba(100, 200, 255, 0.05)', 'var(--medical-accent-tint-faint)'],
  ['rgba(79, 70, 229, 0.15)', 'color-mix(in srgb, var(--semantic-ai-assistance) 15%, transparent)'],
  ['#ff6b6b', 'var(--app-danger)'],
  ['#ff5252', 'var(--app-danger)'],
  ['#8ed8ff', 'var(--medical-accent-soft)'],
  ['#ffb4b4', 'var(--semantic-critical)'],
  ['#ffd59a', 'var(--semantic-attention)'],
  ['rgba(0, 153, 255, 0.28)', 'var(--medical-accent-border)'],
  ['rgba(0, 153, 255, 0.34)', 'var(--medical-accent-ring-strong)'],
  ['rgba(0, 153, 255, 0.35)', 'var(--medical-accent-ring-strong)'],
  ['rgba(0, 153, 255, 0.12)', 'var(--medical-accent-tint-mid)'],
  ['rgba(255, 179, 71, 0.08)', 'color-mix(in srgb, var(--app-warning) 8%, transparent)'],
  ['rgba(255, 179, 71, 0.09)', 'color-mix(in srgb, var(--app-warning) 9%, transparent)'],
  ['rgba(255, 179, 71, 0.1)', 'color-mix(in srgb, var(--app-warning) 10%, transparent)'],
  ['rgba(255, 179, 71, 0.11)', 'color-mix(in srgb, var(--app-warning) 11%, transparent)'],
  ['rgba(255, 179, 71, 0.3)', 'color-mix(in srgb, var(--app-warning) 30%, transparent)'],
  ['rgba(255, 179, 71, 0.32)', 'color-mix(in srgb, var(--app-warning) 32%, transparent)'],
  ['rgba(255, 179, 71, 0.34)', 'color-mix(in srgb, var(--app-warning) 34%, transparent)'],
  ['rgba(255, 179, 71, 0.42)', 'color-mix(in srgb, var(--app-warning) 42%, transparent)'],
  ['rgba(255, 179, 71, 0.46)', 'color-mix(in srgb, var(--app-warning) 46%, transparent)'],
  ['rgba(255, 75, 92, 0.06)', 'color-mix(in srgb, var(--app-danger) 6%, transparent)'],
  ['rgba(255, 75, 92, 0.1)', 'color-mix(in srgb, var(--app-danger) 10%, transparent)'],
  ['rgba(255, 75, 92, 0.36)', 'color-mix(in srgb, var(--app-danger) 36%, transparent)'],
  ['rgba(124, 58, 237, 0.08)', 'color-mix(in srgb, var(--semantic-ai-assistance) 8%, transparent)'],
  ['rgba(255, 165, 2, 0.1)', 'color-mix(in srgb, var(--app-warning) 10%, transparent)'],
  ['rgba(255, 107, 107, 0.05)', 'color-mix(in srgb, var(--app-danger) 5%, transparent)'],
];

const MUTED_REPLACEMENTS = [
  ['var(--muted-text, #9ca3af)', 'var(--app-fg-muted)'],
  ['var(--muted-text)', 'var(--app-fg-muted)'],
  ["color: 'var(--muted-text)'", "color: 'var(--app-fg-muted)'"],
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'node_modules' && name !== 'dist') walk(p, files);
    } else if (EXT.has(extname(name))) {
      files.push(p);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(SRC)) {
  if (file.includes('colorSchema.registry.ts')) continue;
  if (file.includes('.test.') || file.includes('.spec.')) continue;
  let text = readFileSync(file, 'utf8');
  const original = text;
  for (const [from, to] of [...NEON_REPLACEMENTS, ...MUTED_REPLACEMENTS]) {
    text = text.split(from).join(to);
  }
  if (text !== original) {
    writeFileSync(file, text, 'utf8');
    changed += 1;
    console.log('updated:', file.replace(SRC + '\\', '').replace(SRC + '/', ''));
  }
}
console.log(`\n${changed} files updated.`);
