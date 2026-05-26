import { Injectable } from '@nestjs/common';
import {
  IntentClassification,
  PrimaryIntent,
} from '../../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { AiRunEnvelope, ExpertRoutePlan, RetrievalPolicy } from './ai-foundation.types';

@Injectable()
export class AiRoutingEngineService {
  createRoutePlan(
    envelope: AiRunEnvelope,
    classification: IntentClassification | null,
  ): ExpertRoutePlan {
    const primaryIntent = classification?.primaryIntent || PrimaryIntent.GENERAL_QUERY;
    const selectedExpert = this.selectExpert(primaryIntent, classification?.toolId);
    const retrievalPolicy = this.selectRetrievalPolicy(primaryIntent, envelope.capabilityId);
    const allowedToolIds = classification?.toolId
      ? [classification.toolId]
      : envelope.policy.allowedTools;

    return {
      runId: envelope.runId,
      primaryIntent,
      selectedExpert,
      confidence: classification?.confidence ?? 0.5,
      retrievalPolicy,
      toolPlan: {
        allowedToolIds,
        requiredHumanConfirmation:
          primaryIntent === PrimaryIntent.CLINICAL_TOOL || envelope.policy.requiresHumanReview,
      },
      costPlan: {
        preferredModel: 'policy-default',
        maxTokens: 2000,
        allowFallback: true,
      },
      safetyPlan: {
        emergencyEscalation: Boolean(classification?.isEmergency),
        requiresHumanReview: envelope.policy.requiresHumanReview,
        blockedActions: [
          'autonomous_chart_modification',
          'auto_sign_note',
          'order_placement_without_review',
          'patient_outreach_without_confirmation',
        ],
      },
    };
  }

  private selectExpert(primaryIntent: PrimaryIntent, toolId?: string): string {
    if (primaryIntent === PrimaryIntent.EMERGENCY) {
      return 'triage-and-escalation-expert';
    }
    if (primaryIntent === PrimaryIntent.MEDICAL_REFERENCE) {
      return 'guideline-reference-expert';
    }
    if (primaryIntent === PrimaryIntent.CLINICAL_TOOL) {
      if (toolId?.includes('drug')) return 'medication-expert';
      if (toolId?.includes('lab')) return 'lab-expert';
      if (toolId?.includes('calculator') || toolId?.includes('score')) return 'calculator-expert';
      return 'clinical-tool-expert';
    }
    if (primaryIntent === PrimaryIntent.ADMINISTRATIVE) {
      return 'operations-expert';
    }
    return 'general-clinical-assistant';
  }

  private selectRetrievalPolicy(
    primaryIntent: PrimaryIntent,
    capabilityId: string,
  ): RetrievalPolicy {
    if (primaryIntent === PrimaryIntent.MEDICAL_REFERENCE || capabilityId === 'guideline-rag') {
      return 'guideline';
    }
    if (primaryIntent === PrimaryIntent.CLINICAL_TOOL || primaryIntent === PrimaryIntent.EMERGENCY) {
      return 'none';
    }
    return 'reference';
  }
}
