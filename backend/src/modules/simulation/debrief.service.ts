import { Injectable } from '@nestjs/common';
import { SimulationScenario } from './simulation.types';

@Injectable()
export class DebriefService {
  buildDebrief(scenario: SimulationScenario, selectedActions: string[] = []) {
    const selected = new Set(selectedActions);
    const correctActions = scenario.criticalActions.filter((action) => selected.has(action));
    const missedCriticalActions = scenario.criticalActions.filter(
      (action) => !selected.has(action),
    );
    const safetyScore = Math.max(
      40,
      Math.round((correctActions.length / scenario.criticalActions.length) * 100),
    );

    return {
      whatHappened: `${scenario.title} completed in demo/local state.`,
      whatWentWell: correctActions,
      whatCouldImprove: missedCriticalActions,
      whatToDoNext: [
        'Repeat a related case',
        'Review missed critical actions',
        'Practice concise debrief documentation',
      ],
      summary: `${correctActions.length}/${scenario.criticalActions.length} critical actions selected.`,
      correctActions,
      missedCriticalActions,
      timeToCriticalActionSeconds: 210 + missedCriticalActions.length * 25,
      safetyRisks: missedCriticalActions.length
        ? ['Delayed escalation risk', 'Incomplete closed-loop communication']
        : ['No major demo safety risks flagged'],
      calculatorToolUsage: scenario.requiredTools,
      evidenceNotes: [
        'Clinical calculators and AI hints are decision support only.',
        'Confirm actions with local policy and supervising clinicians.',
      ],
      reflectionPrompts: [
        'What happened?',
        'What went well?',
        'What could improve?',
        'What will you do next?',
      ],
      aiTutorFeedback:
        safetyScore >= 85
          ? 'Strong safety prioritization and debrief structure.'
          : 'Practice earlier critical action recognition and clearer team communication.',
      scores: {
        safetyScore,
        communicationScore: Math.max(50, safetyScore - 4),
        teamworkScore: Math.max(50, safetyScore - 6),
        debriefQualityScore: 78,
      },
    };
  }
}
