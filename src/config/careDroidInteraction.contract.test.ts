import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARE_DROID_INTERACTION } from './careDroidInteractionModel';

const srcRoot = join(process.cwd(), 'src');

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), 'utf8');
}

describe('careDroid interaction contract', () => {
  it('keeps toast host duration aligned with interaction model', () => {
    const toastHost = readSrc('components/CareDroidToastHost.tsx');
    expect(toastHost).toContain('CARE_DROID_INTERACTION.feedbackDurationMs');
    expect(CARE_DROID_INTERACTION.feedbackDurationMs).toBe(2800);
  });

  it('routes Sonner imports through the canonical feedback service', () => {
    const feedbackService = readSrc('services/careDroidInteractionFeedback.ts');
    expect(feedbackService).toContain("from 'sonner'");

    const directSonnerImports = [
      'components/PatientDetailPanel.tsx',
      'components/QuickIntake.tsx',
      'pages/emergency/ReceptionWorkspace.tsx',
    ];

    for (const relativePath of directSonnerImports) {
      const source = readSrc(relativePath);
      expect(source.includes("from 'sonner'")).toBe(false);
    }
  });
});