import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogSource = readFileSync(join(__dirname, 'ClinicalToolCatalog.tsx'), 'utf8');

describe('ClinicalToolCatalog chat launch wiring', () => {
  it('delegates registry launches to the central launcher without adding a duplicate seed', () => {
    const handler = catalogSource.match(
      /const handleTryInChat = \(sidebarToolId, chatSeed[^)]*\) => \{([\s\S]*?)\n {2}\};/
    )?.[1];
    if (!handler) throw new Error('expected handleTryInChat handler to be found in source');

    expect(handler).toContain('launchCatalogItem(sidebarToolId)');
    const sidebarBranch = handler.match(/if \(sidebarToolId\) \{([\s\S]*?)\n {4}\}/)?.[1];
    expect(sidebarBranch).toContain('return;');
    expect(sidebarBranch).not.toContain('addMessage');
  });
});
