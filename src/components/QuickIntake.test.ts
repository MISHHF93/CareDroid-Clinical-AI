import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Source-wiring guard (this codebase's established pattern for components without
// a render-test harness — see ReceptionWorkspace.test.tsx) proving Quick Intake's
// complaint field is wired to the canonical recognizeComplaint() pipeline added in
// the 2026-08-08 terminology-recognition round, not just Reception's own intake panel.

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'QuickIntake.tsx'), 'utf8');

describe('QuickIntake complaint recognition wiring (2026-08-08)', () => {
  it('imports the canonical recognizeComplaint pipeline and terminology gap queue', () => {
    expect(source).toContain("from '../data/clinicalTerminology/recognizeComplaint'");
    expect(source).toContain("from '../services/terminologyGapQueue'");
  });

  it('computes complaintRecognition from the live complaint field', () => {
    expect(source).toContain('recognizeComplaint(complaint)');
  });

  it('only records a terminology gap when no high-risk flag already fired, avoiding duplicate signals', () => {
    const effectStart = source.indexOf('if (detectedComplaintFlags.length) return;');
    const effectEnd = source.indexOf('recordTerminologyGap(complaintRecognition);');
    expect(effectStart).toBeGreaterThan(-1);
    expect(effectEnd).toBeGreaterThan(effectStart);
  });

  it('never overwrites the staff-entered complaint text with the canonical suggestion', () => {
    // The recognition UI must be read-only display, not a value mutation —
    // setComplaint should only ever be called from the textarea's own onChange
    // and the category-chip handler, never from complaintRecognition.
    const recognitionBlockStart = source.indexOf('qi-complaint-recognition');
    const recognitionBlockEnd = source.indexOf('{protocols.length ?');
    const recognitionBlock = source.slice(recognitionBlockStart, recognitionBlockEnd);
    expect(recognitionBlock).not.toContain('setComplaint(');
  });
});
