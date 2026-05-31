import { Injectable } from '@nestjs/common';

@Injectable()
export class CompetencyService {
  getCoverage() {
    return {
      sourceStatus: 'demo-local-state',
      competencies: [
        { competency: 'Emergency stabilization', coverage: 88 },
        { competency: 'Medication safety', coverage: 72 },
        { competency: 'Team communication', coverage: 81 },
        { competency: 'Laboratory escalation', coverage: 76 },
        { competency: 'Operations coordination', coverage: 64 },
      ],
    };
  }
}
