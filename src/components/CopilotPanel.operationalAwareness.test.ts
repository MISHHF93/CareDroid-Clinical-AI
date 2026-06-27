import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/components/CopilotPanel.tsx'), 'utf8');

describe('Copilot operational awareness wiring', () => {
  it('feeds central node pressure, queue, reassessment, and alert context into Copilot', () => {
    expect(source).toContain("useCareDroidCentralNode({ screenMode: 'PHYSICIAN_SCREEN' })");
    expect(source).toContain('centralSnapshot.emsPressure');
    expect(source).toContain('centralSnapshot.boardingStatus');
    expect(source).toContain('centralSnapshot.queueHealth');
    expect(source).toContain('centralSnapshot.reassessmentStatus');
    expect(source).toContain('centralSnapshot.operationalAlerts');
    expect(source).toContain('Copilot operational awareness');
  });

  it('keeps multimodal inputs in the active Copilot panel with explicit vision safety boundaries', () => {
    expect(source).toContain('CareDroid multimodal input controls');
    expect(source).toContain('Attach image');
    expect(source).toContain('Voice');
    expect(source).toContain('visionModelConnected: false');
    expect(source).toContain('Do not infer clinical findings from image attachments');
  });

  it('keeps targetable route-backed tool actions in the docked Copilot panel', () => {
    expect(source).toContain('ed-copilot-panel__tool-actions');
    expect(source).toContain('data-copilot-tool-action');
    expect(source).toContain("eventName: 'ed:open-tools'");
    expect(source).toContain("eventName: 'ed:open-calculator'");
  });

  it('guards Copilot clinical summaries against incomplete demo fixture arrays', () => {
    expect(source).toContain('function patientFlags(patient: Patient)');
    expect(source).toContain('function patientVitals(patient: Patient)');
    expect(source).toContain('Array.isArray(centralSnapshot.queueHealth)');
  });
});
