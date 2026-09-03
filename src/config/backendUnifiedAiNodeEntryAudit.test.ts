import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const BACKEND_SCAN_ROOT = path.join(ROOT, 'backend/src/modules');

const ALLOWED_BACKEND_RUN_CARE_DROID_AI_IMPORTERS = new Set([
  'backend/src/modules/ai/ai.service.ts',
  'backend/src/modules/emergency-os/administrative-automation-orchestration.lib.ts',
]);

const RUN_CARE_DROID_AI_IMPORT =
  /import\s*\{[^}]*\brunCareDroidAI\b[^}]*\}\s*from\s+['"][^'"]*careDroidAI['"]/;

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (/\.ts$/.test(entry) && !/\.spec\.ts$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('backend unified AI node entry audit', () => {
  it('documents known backend runCareDroidAI importers pending node migration', () => {
    const importers: string[] = [];

    for (const filePath of listSourceFiles(BACKEND_SCAN_ROOT)) {
      const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
      const source = readFileSync(filePath, 'utf8');
      if (RUN_CARE_DROID_AI_IMPORT.test(source)) {
        importers.push(relative);
      }
    }

    expect(importers.sort()).toEqual([...ALLOWED_BACKEND_RUN_CARE_DROID_AI_IMPORTERS].sort());
  });

  it('flags administrative automation lib for future AiService node migration', () => {
    const source = readFileSync(
      path.join(
        ROOT,
        'backend/src/modules/emergency-os/administrative-automation-orchestration.lib.ts',
      ),
      'utf8',
    );
    expect(source).toContain("nodeId: 'CareDroidUnifiedAINode'");
    expect(source).toContain("route: '/api/ai/node'");
  });
});
