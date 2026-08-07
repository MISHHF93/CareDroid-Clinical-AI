#!/usr/bin/env node
/**
 * Writes docs/architecture/platform-inventory.md from the live platform
 * inventory module. Usage: node scripts/write-platform-inventory.mjs
 *
 * Found 2026-08-07: this script already worked, but had never actually
 * been run and its output committed -- the doc it should back
 * (docs/architecture/platform-inventory.md) instead carried a
 * hand-maintained duplicate whose own header claimed "there is no working
 * one-command regeneration path," last touched 2026-06-26. That claim was
 * wrong; this script is that regeneration path. Retargeted here from an
 * earlier, unindexed docs/PLATFORM_INVENTORY.md output path.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryUrl = pathToFileURL(join(root, 'src/data/platformInventory.ts')).href;
const { formatPlatformInventoryMarkdown, getPlatformInventory } = await import(inventoryUrl);

const inv = getPlatformInventory();
const languageSection = `## Source language harmonization

*Audited on **${inv.auditedAt}**.*

| Layer | Location | Format | Status |
|-------|----------|--------|--------|
| Frontend application | \`src/\` | TypeScript (\`.ts\` / \`.tsx\`) | **Canonical**; no native duplicate app |
| Backend API | \`backend/src/\` | TypeScript (NestJS) | **Canonical** |
| Shared engines | \`src/engine/\`, \`src/store/\` | TypeScript | **Canonical** |
| Build / QA scripts | \`scripts/\`, \`e2e/\` | Node (\`.mjs\`) | Tooling only; not product source |
| Service workers | \`public/sw.js\` | JavaScript | Required browser runtime |

\`tsconfig.frontend.json\` sets \`allowJs: false\`; run \`npm run typecheck:frontend\` to verify.

`;

const markdown = `${formatPlatformInventoryMarkdown(inv)}\n\n${languageSection}`;
const outPath = join(root, 'docs', 'architecture', 'platform-inventory.md');
writeFileSync(outPath, markdown, 'utf8');
console.log(`Wrote ${outPath}`);
