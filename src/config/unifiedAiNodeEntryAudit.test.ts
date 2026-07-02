import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCAN_ROOTS = ['src/components', 'src/pages', 'src/features', 'src/hooks', 'src/store', 'src/services'];

const ALLOWED_AI_CHIEF_IMPORTERS = new Set([
  'src/services/aiChiefOrchestrator.ts',
  'src/services/aiChiefOrchestrator.test.ts',
  'src/services/careDroidUnifiedAiNode.ts',
  'src/services/careDroidAiApi.ts',
  'src/services/alertLifecycleOrchestrator.ts',
]);

const AI_CHIEF_ENTRY_IMPORT =
  /from\s+['"][^'"]*aiChiefOrchestrator['"]|import\s*\(\s*['"][^'"]*aiChiefOrchestrator['"]\s*\)/;

const ALLOWED_RUN_CARE_DROID_AI_IMPORTERS = new Set([
  'src/lib/ai/careDroidAI.ts',
  'src/services/aiChiefOrchestrator.ts',
  'src/services/careDroidAiApi.ts',
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
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('unified AI node entry audit', () => {
  it('requires UI and service callers to use careDroidUnifiedAiNode instead of aiChiefOrchestrator', () => {
    const violations: string[] = [];

    for (const scanRoot of SCAN_ROOTS) {
      const absoluteRoot = path.join(ROOT, scanRoot);
      for (const filePath of listSourceFiles(absoluteRoot)) {
        const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
        if (ALLOWED_AI_CHIEF_IMPORTERS.has(relative)) continue;
        const source = readFileSync(filePath, 'utf8');
        if (AI_CHIEF_ENTRY_IMPORT.test(source)) {
          violations.push(relative);
        }
      }
    }

    expect(violations, `Direct aiChiefOrchestrator imports found:\n${violations.join('\n')}`).toEqual([]);
  });

  it('requires service callers to route structured AI through careDroidUnifiedAiNode instead of runCareDroidAI', () => {
    const violations: string[] = [];

    for (const scanRoot of SCAN_ROOTS) {
      const absoluteRoot = path.join(ROOT, scanRoot);
      for (const filePath of listSourceFiles(absoluteRoot)) {
        const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
        if (ALLOWED_RUN_CARE_DROID_AI_IMPORTERS.has(relative)) continue;
        const source = readFileSync(filePath, 'utf8');
        if (RUN_CARE_DROID_AI_IMPORT.test(source)) {
          violations.push(relative);
        }
      }
    }

    expect(violations, `Direct runCareDroidAI imports found:\n${violations.join('\n')}`).toEqual([]);
  });

  it('documents unified node API surface on the lite entry module', () => {
    const source = readFileSync(path.join(ROOT, 'src/services/careDroidUnifiedAiNode.ts'), 'utf8');
    const requiredExports = [
      'invokeUnifiedAiStructured',
      'invokeUnifiedAiConversational',
      'invokeUnifiedAiRequest',
      'invokeUnifiedAiHandoffBrief',
      'invokeUnifiedAiCopilotQuery',
      'invokeUnifiedAiStructuredByIntent',
    ];
    for (const exportName of requiredExports) {
      expect(source).toContain(`export async function ${exportName}`);
    }
  });
});