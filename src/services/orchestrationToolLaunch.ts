import type { ToolRecommendation } from '../../lib/patient-orchestration';
import { CANONICAL_ROUTES } from '../config/routes.config';

export type OrchestrationLaunchDetail = {
  patientId: string;
  recommendation: ToolRecommendation;
};

function buildToolsPath(patientId: string, open?: string, filter = 'clinical-tools') {
  const params = new URLSearchParams({
    source: 'orchestration',
    filter,
    patientId,
  });
  if (open) {
    params.set('open', open);
    params.set('q', open);
  }
  return `${CANONICAL_ROUTES.emergencyTools}?${params.toString()}`;
}

export function launchOrchestrationRecommendation({
  patientId,
  recommendation,
}: OrchestrationLaunchDetail): void {
  const registryId = recommendation.registryId || recommendation.toolId;

  switch (recommendation.launchKind) {
    case 'calculator':
      window.dispatchEvent(
        new CustomEvent('ed:open-calculator', {
          detail: { calculatorId: registryId, patientId },
        }),
      );
      break;
    case 'tool':
    case 'protocol':
      window.dispatchEvent(
        new CustomEvent('ed:open-tools', {
          detail: {
            source: 'orchestration',
            filter: recommendation.category,
            patientId,
            open: registryId,
            q: registryId,
          },
        }),
      );
      break;
    case 'copilot':
      window.dispatchEvent(
        new CustomEvent('ed:copilot-prefill', {
          detail: {
            message: `Review ${recommendation.label} for patient ${patientId}. ${recommendation.reason}. Staff confirmation required.`,
            patientId,
          },
        }),
      );
      break;
    case 'checklist':
    case 'workflow':
      window.history.pushState(null, '', buildToolsPath(patientId, registryId, 'clinical-tools'));
      window.dispatchEvent(new PopStateEvent('popstate'));
      break;
    default:
      window.dispatchEvent(
        new CustomEvent('ed:open-tools', {
          detail: { source: 'orchestration', filter: 'all', patientId, open: registryId },
        }),
      );
  }
}

export function launchOrchestrationMoreTools(patientId: string, query = '') {
  const path = buildToolsPath(patientId, query || undefined, 'all');
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}