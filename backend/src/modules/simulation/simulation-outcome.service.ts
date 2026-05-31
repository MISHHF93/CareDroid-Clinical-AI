import { Injectable } from '@nestjs/common';
import { SimulationOutcomeDto } from './simulation.types';

@Injectable()
export class SimulationOutcomeService {
  private readonly outcomes: SimulationOutcomeDto[] = [];

  createOutcome(input: {
    runId: string;
    scenarioId: string;
    missedCriticalActions: string[];
    safetyScore: number;
  }) {
    const outcome: SimulationOutcomeDto = {
      runId: input.runId,
      scenarioId: input.scenarioId,
      completionRate: 100,
      timeToCriticalActionSeconds: 210 + input.missedCriticalActions.length * 25,
      missedCriticalActions: input.missedCriticalActions,
      diagnosticAccuracy: Math.max(50, input.safetyScore - 2),
      toolUsageCorrectness: Math.max(50, input.safetyScore - 8),
      communicationScore: Math.max(50, input.safetyScore - 4),
      teamworkScore: Math.max(50, input.safetyScore - 6),
      safetyScore: input.safetyScore,
      debriefQualityScore: 78,
      knowledgePrePostDelta: 18,
      confidencePrePostDelta: 22,
      kirkpatrickLevel: 'Level 2 - Learning',
      sourceStatus: 'demo-local-state',
    };
    this.outcomes.unshift(outcome);
    return outcome;
  }

  getOutcomes() {
    return {
      sourceStatus: 'demo-local-state',
      summary: {
        completionRate: 82,
        averageTimeToCriticalActionSeconds: 214,
        diagnosticAccuracy: 86,
        communicationScore: 84,
        teamworkScore: 81,
        safetyScore: 88,
        debriefQualityScore: 77,
        kirkpatrickLevel: 'Level 2 - Learning',
      },
      outcomes: this.outcomes,
      weakAreas: [
        'Earlier critical lab escalation',
        'Closed-loop role assignment during surge scenarios',
        'Tool selection documentation in debriefs',
      ],
      recommendedPractice: [
        'abnormal-lab-escalation',
        'device-alarm-failure',
        'hospital-bed-surge',
      ],
    };
  }
}
