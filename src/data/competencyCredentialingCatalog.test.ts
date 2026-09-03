import { describe, expect, it } from 'vitest';
import {
  buildCompetencyCredentialingSnapshot,
  COMPETENCY_DOMAINS,
  DEMO_COMPETENCY_RECORDS,
  DEMO_CREDENTIAL_RECORDS,
} from './competencyCredentialingCatalog';

describe('competencyCredentialingCatalog', () => {
  it('tracks simulation, skill, certification, CME, training status, and gaps', () => {
    const snapshot = buildCompetencyCredentialingSnapshot({
      role: 'emergency physician',
      specialty: 'emergency medicine',
    });

    expect(COMPETENCY_DOMAINS).toEqual(
      expect.arrayContaining([
        'Simulation completion',
        'Skill completion',
        'Certifications',
        'CME progress',
        'Training status',
        'Competency gaps',
      ]),
    );
    expect(DEMO_COMPETENCY_RECORDS.some((record) => record.type === 'simulation')).toBe(true);
    expect(DEMO_COMPETENCY_RECORDS.some((record) => record.type === 'skill')).toBe(true);
    expect(DEMO_CREDENTIAL_RECORDS.some((record) => record.status === 'active')).toBe(true);
    expect(snapshot.summary.cmeCreditsEarned).toBeGreaterThan(0);
    expect(snapshot.summary.trainingStatus).toBe('needs-practice');
    expect(snapshot.competencyGaps).toContain('Critical lab escalation speed');
  });

  it('adapts competency gaps by profile role', () => {
    const snapshot = buildCompetencyCredentialingSnapshot({ role: 'biomedical engineer' });
    expect(snapshot.competencyGaps).toContain('Device alarm failure handoff');
  });
});
