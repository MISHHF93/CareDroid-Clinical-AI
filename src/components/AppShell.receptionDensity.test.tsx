/**
 * Architect Mode Stage E — reception density reduces stacked command chrome.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('AppShell reception density', () => {
  const shellSource = readFileSync(resolve(__dirname, 'AppShell.tsx'), 'utf8');
  const css = readFileSync(resolve(__dirname, 'app-shell.css'), 'utf8');

  it('marks Medical Light theme and density on the shell root', () => {
    expect(shellSource).toMatch(/data-medical-theme=["']light["']/);
    expect(shellSource).toMatch(/data-screen-density=\{screenDensityProfile\.id\}/);
    expect(shellSource).toMatch(/emergency-app-shell--reception-density/);
  });

  it('suppresses journey and session bars for simple-fast (reception) density', () => {
    expect(shellSource).toMatch(/isReceptionSimpleDensity/);
    expect(shellSource).toMatch(
      /!useKioskShell && !isReceptionSimpleDensity \? <HospitalJourneyCommandBar/,
    );
    expect(shellSource).toMatch(
      /!useKioskShell && !isReceptionSimpleDensity \? <SessionChromeBar/,
    );
  });

  it('uses Medical Light page surface tokens in shell CSS', () => {
    expect(css).toMatch(/--ml-surface-page/);
    expect(css).toMatch(/min-width:\s*1920px/);
  });
});
