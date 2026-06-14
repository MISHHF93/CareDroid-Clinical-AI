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
});
