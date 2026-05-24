import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogSource = readFileSync(join(__dirname, 'ClinicalToolCatalog.jsx'), 'utf8');

describe('ClinicalToolCatalog chat launch wiring', () => {
  it('delegates registry launches to the central launcher without adding a duplicate seed', () => {
    const handler = catalogSource.match(
      /const handleTryInChat = \(sidebarToolId, chatSeed\) => \{([\s\S]*?)\n  \};/
    )?.[1];

    expect(handler).toContain('launchCatalogItem(sidebarToolId)');
    expect(handler).toContain("navigate('/assistant')");
    expect(handler).not.toMatch(/launchCatalogItem\(sidebarToolId\);[\s\S]*?addMessage\(chatSeed, 'user'\);/);
  });
});
