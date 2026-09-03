import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const drugCheckerCss = readFileSync(join(__dirname, 'DrugChecker.css'), 'utf8');
const labInterpreterCss = readFileSync(join(__dirname, 'LabInterpreter.css'), 'utf8');
const executorFeedbackCss = readFileSync(
  join(__dirname, '../../components/clinical/ClinicalExecutorFeedback.css'),
  'utf8',
);

describe('Clinical tool pages responsive hardening', () => {
  it('keeps DrugChecker inputs and primary actions usable on phones', () => {
    expect(drugCheckerCss).toMatch(/\.drug-checker[\s\S]*overflow-x:\s*clip/);
    expect(drugCheckerCss).toMatch(
      /\.medication-input[\s\S]*min-height:\s*var\(--touch-target-min\)/,
    );
    expect(drugCheckerCss).toMatch(
      /\.btn-check-interactions[\s\S]*min-height:\s*var\(--touch-target-min\)/,
    );
    expect(drugCheckerCss).toMatch(
      /@media \(max-width: 768px\)[\s\S]*\.btn-check-interactions[\s\S]*width:\s*100%/,
    );
  });

  it('keeps LabInterpreter forms stacked, touchable, and table-scrolled locally', () => {
    expect(labInterpreterCss).toMatch(/\.lab-interpreter-content[\s\S]*overflow-x:\s*clip/);
    expect(labInterpreterCss).toMatch(
      /\.lab-input-field[\s\S]*min-height:\s*var\(--touch-target-min\)/,
    );
    expect(labInterpreterCss).toMatch(/\.lab-values-table[\s\S]*min-width:\s*520px/);
    expect(labInterpreterCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.lab-action-buttons[\s\S]*flex-direction:\s*column/,
    );
  });

  it('wraps backend executor failure feedback instead of clipping it', () => {
    expect(executorFeedbackCss).toMatch(/\.clinical-executor-feedback[\s\S]*max-width:\s*100%/);
    expect(executorFeedbackCss).toMatch(
      /\.clinical-executor-feedback[\s\S]*overflow-wrap:\s*anywhere/,
    );
    expect(executorFeedbackCss).toMatch(
      /\.clinical-executor-feedback--loading[\s\S]*flex-wrap:\s*wrap/,
    );
  });
});
