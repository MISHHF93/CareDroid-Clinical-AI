import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'src/pages/emergency/EmergencyAnalytics.tsx'),
  'utf8',
);

describe('Emergency Analytics operational awareness wiring', () => {
  it('surfaces central-node awareness cards for leadership review', () => {
    expect(source).toContain('Operational Awareness');
    expect(source).toContain('EMS Pressure');
    expect(source).toContain('Queue Health');
    expect(source).toContain('centralSnapshot.boardingStatus');
    expect(source).toContain('centralSnapshot.reassessmentStatus');
    expect(source).toContain('centralSnapshot.operationalAlerts');
  });
});
