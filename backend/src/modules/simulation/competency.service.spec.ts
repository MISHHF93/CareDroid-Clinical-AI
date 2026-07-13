import { CompetencyService } from './competency.service';

describe('CompetencyService', () => {
  it('returns the complete demo competency coverage profile', () => {
    const service = new CompetencyService();

    expect(service.getCoverage()).toEqual({
      sourceStatus: 'demo-local-state',
      competencies: [
        { competency: 'Emergency stabilization', coverage: 88 },
        { competency: 'Medication safety', coverage: 72 },
        { competency: 'Team communication', coverage: 81 },
        { competency: 'Laboratory escalation', coverage: 76 },
        { competency: 'Operations coordination', coverage: 64 },
      ],
    });
  });
});
