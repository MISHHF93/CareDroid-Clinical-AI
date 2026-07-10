import { Injectable } from '@nestjs/common';
import { HUMAN_REVIEW_DISCLAIMER } from '../../../../lib/ai/safetyPolicy';
import type {
  ClinicalCalculatorResultRecord,
  CopilotInteractionRecord,
  RecordClinicalCalculatorDto,
  RecordCopilotInteractionDto,
} from './clinical-decision-support.types';
import type { EmergencyModuleEnvelope } from './emergency-os.types';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function envelope<T>(
  module: string,
  data: T,
  remainingGaps: string[] = [],
): EmergencyModuleEnvelope<T> {
  return {
    module,
    generatedAt: new Date().toISOString(),
    source: 'clinical-decision-support',
    status: remainingGaps.length ? 'placeholder' : 'active',
    data,
    remainingGaps,
  };
}

@Injectable()
export class ClinicalDecisionSupportService {
  private readonly calculatorResults: ClinicalCalculatorResultRecord[] = [];
  private readonly copilotInteractions: CopilotInteractionRecord[] = [];

  recordCalculatorResult(
    dto: RecordClinicalCalculatorDto,
    context: { tenantId?: string; userId?: string } = {},
  ) {
    const record: ClinicalCalculatorResultRecord = {
      id: createId('calc-result'),
      calculatorId: dto.calculatorId,
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      tenantId: context.tenantId,
      userId: context.userId,
      inputs: dto.inputs,
      score: dto.score,
      riskCategory: dto.riskCategory,
      interpretation: dto.interpretation,
      disclaimer: dto.disclaimer,
      referenceLine: dto.referenceLine,
      computedAt: new Date().toISOString(),
    };
    this.calculatorResults.unshift(record);
    if (this.calculatorResults.length > 500) {
      this.calculatorResults.length = 500;
    }
    return envelope('Clinical Calculator Result', record);
  }

  listCalculatorResults(filters: { patientId?: string; calculatorId?: string } = {}) {
    const rows = this.calculatorResults.filter((row) => {
      if (filters.patientId && row.patientId !== filters.patientId) return false;
      if (filters.calculatorId && row.calculatorId !== filters.calculatorId) return false;
      return true;
    });
    return envelope('Clinical Calculator Results', {
      count: rows.length,
      results: rows,
    });
  }

  recordCopilotInteraction(
    dto: RecordCopilotInteractionDto,
    context: { tenantId?: string; userId?: string } = {},
  ) {
    const requiresHumanReview = dto.requiresHumanReview !== false;
    const record: CopilotInteractionRecord = {
      id: createId('copilot-interaction'),
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      tenantId: context.tenantId,
      userId: context.userId,
      userRole: dto.userRole,
      question: dto.question,
      patientContextSummary: dto.patientContextSummary,
      draftGuidance: dto.draftGuidance,
      requiresHumanReview,
      safetyDisclaimer: `${HUMAN_REVIEW_DISCLAIMER} Decision support only — requires clinician review.`,
      safetyCheckPassed: dto.safetyCheckPassed !== false,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedByUserId: null,
    };
    this.copilotInteractions.unshift(record);
    if (this.copilotInteractions.length > 500) {
      this.copilotInteractions.length = 500;
    }
    return envelope('Copilot Interaction', record);
  }

  listCopilotInteractions(filters: { patientId?: string } = {}) {
    const rows = this.copilotInteractions.filter((row) => {
      if (filters.patientId && row.patientId !== filters.patientId) return false;
      return true;
    });
    return envelope('Copilot Interactions', {
      count: rows.length,
      interactions: rows,
      safetyNotice: 'Decision support only — requires clinician review.',
    });
  }
}
