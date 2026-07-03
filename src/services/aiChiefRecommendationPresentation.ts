import { CANONICAL_ROUTES } from '../config/routes.config';
import type { AiChiefExplainableRecommendation } from '../config/aiChiefOrchestrationModel';

export type AiChiefCommandActionPresentation = Readonly<{
  id: string;
  label: string;
  count: number;
  reason: string;
  owner: string;
  deadlineLabel: string;
  nextAction: string;
  tone: 'critical' | 'warning' | 'info' | 'success';
  active: boolean;
  route: string;
}>;

export function mapAiChiefRecommendationsToCommandActions(
  recommendations: readonly AiChiefExplainableRecommendation[],
  limit = 4,
): readonly AiChiefCommandActionPresentation[] {
  return Object.freeze(
    recommendations.slice(0, limit).map((recommendation) =>
      Object.freeze({
        id: recommendation.id,
        label: recommendation.action,
        count: Number(recommendation.reasonCodes.find((code) => code.startsWith('count:'))?.split(':')[1] || 1),
        reason: recommendation.rationale,
        owner: recommendation.ownerRole,
        deadlineLabel: recommendation.priority === 'P0' ? '3 min target' : 'Review',
        nextAction: recommendation.rationale,
        tone:
          recommendation.tone === 'critical'
            ? 'critical'
            : recommendation.tone === 'warning'
              ? 'warning'
              : 'info',
        active: true,
        route: recommendation.route || CANONICAL_ROUTES.emergencyCommandCenter,
      }),
    ),
  );
}