import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARE_DROID_INTERACTION } from './careDroidInteractionModel';

const srcRoot = join(process.cwd(), 'src');
const CANONICAL_CONFIRM_MODULE = 'services/careDroidInteractionFeedback.ts';
const CANONICAL_SONNER_MODULES = new Set([
  'components/CareDroidToastHost.tsx',
  CANONICAL_CONFIRM_MODULE,
]);

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), 'utf8');
}

function listSourceFiles(directory = srcRoot): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (
      entry.isFile() &&
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      files.push(relative(srcRoot, fullPath).replace(/\\/g, '/'));
    }
  }
  return files;
}

describe('careDroid interaction contract', () => {
  it('keeps toast host duration aligned with interaction model', () => {
    const toastHost = readSrc('components/CareDroidToastHost.tsx');
    expect(toastHost).toContain('CARE_DROID_INTERACTION.feedbackDurationMs');
    expect(CARE_DROID_INTERACTION.feedbackDurationMs).toBe(2800);
  });

  it('avoids status-to-toast bridge state in reception workspace', () => {
    const receptionWorkspace = readSrc('pages/emergency/ReceptionWorkspace.tsx');
    expect(receptionWorkspace).toContain('showActionSuccess');
    expect(receptionWorkspace).toContain('showActionError');
    expect(receptionWorkspace).not.toContain('const [status, setStatus]');
    expect(receptionWorkspace).not.toContain('const [error, setError]');
    expect(receptionWorkspace).not.toContain('}, [error, status]);');
  });

  it('uses canonical feedback for transient settings saves in EmergencySettings', () => {
    const emergencySettings = readSrc('pages/emergency/EmergencySettings.tsx');
    expect(emergencySettings).toContain('showActionSuccess');
    expect(emergencySettings).toContain('showActionError');
    expect(emergencySettings).not.toContain('const [status, setStatus]');
    expect(emergencySettings).not.toContain('savedFlashTimerRef');
  });

  it('routes Sonner imports through canonical toast surfaces only', () => {
    const offenders = listSourceFiles().filter((relativePath) => {
      const source = readSrc(relativePath);
      return source.includes("from 'sonner'") && !CANONICAL_SONNER_MODULES.has(relativePath);
    });
    expect(offenders).toEqual([]);
  });

  it('routes window.confirm through the canonical confirm fallback only', () => {
    const offenders = listSourceFiles().filter((relativePath) => {
      const source = readSrc(relativePath);
      return source.includes('window.confirm') && relativePath !== CANONICAL_CONFIRM_MODULE;
    });
    expect(offenders).toEqual([]);
  });
});
