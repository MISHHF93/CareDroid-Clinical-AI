import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { HUMAN_REVIEW_DISCLAIMER } from '../../../../lib/ai/safetyPolicy';
import { ClinicalCalculatorResultEntity } from './entities/clinical-calculator-result.entity';
import { CopilotInteractionEntity } from './entities/copilot-interaction.entity';
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
export class ClinicalDecisionSupportService implements OnModuleInit {
  private readonly logger = new Logger(ClinicalDecisionSupportService.name);
  private readonly calculatorResults: ClinicalCalculatorResultRecord[] = [];
  private readonly copilotInteractions: CopilotInteractionRecord[] = [];

  constructor(
    @Optional()
    @InjectRepository(ClinicalCalculatorResultEntity)
    private readonly calculatorResultRepository?: Repository<ClinicalCalculatorResultEntity>,
    @Optional()
    @InjectRepository(CopilotInteractionEntity)
    private readonly copilotInteractionRepository?: Repository<CopilotInteractionEntity>,
  ) {}

  /**
   * Load durable calculator results and Copilot interactions from TypeORM so
   * this real clinical decision-support audit trail (safetyCheckPassed,
   * requiresHumanReview, reviewedByUserId) survives a process restart
   * instead of silently disappearing -- previously this service was
   * in-memory only.
   */
  async onModuleInit(): Promise<void> {
    if (this.calculatorResultRepository) {
      try {
        const rows = await this.calculatorResultRepository.find({ order: { createdAt: 'DESC' } });
        for (const row of rows) {
          try {
            this.calculatorResults.push(
              JSON.parse(row.recordJson) as ClinicalCalculatorResultRecord,
            );
          } catch (parseError) {
            this.logger.warn(
              `Failed to parse persisted calculator result ${row.id}: ${parseError}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to rehydrate calculator results from database: ${error}`);
      }
    }

    if (this.copilotInteractionRepository) {
      try {
        const rows = await this.copilotInteractionRepository.find({ order: { createdAt: 'DESC' } });
        for (const row of rows) {
          try {
            this.copilotInteractions.push(JSON.parse(row.recordJson) as CopilotInteractionRecord);
          } catch (parseError) {
            this.logger.warn(
              `Failed to parse persisted Copilot interaction ${row.id}: ${parseError}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to rehydrate Copilot interactions from database: ${error}`);
      }
    }
  }

  private persistCalculatorResultToDatabase(record: ClinicalCalculatorResultRecord): void {
    if (!this.calculatorResultRepository) return;
    const entity = this.calculatorResultRepository.create({
      id: record.id,
      patientId: record.patientId,
      recordJson: JSON.stringify(record),
    });
    this.calculatorResultRepository.save(entity).catch((error) => {
      this.logger.warn(`Failed to persist calculator result ${record.id} to database: ${error}`);
    });
  }

  private persistCopilotInteractionToDatabase(record: CopilotInteractionRecord): void {
    if (!this.copilotInteractionRepository) return;
    const entity = this.copilotInteractionRepository.create({
      id: record.id,
      patientId: record.patientId,
      recordJson: JSON.stringify(record),
    });
    this.copilotInteractionRepository.save(entity).catch((error) => {
      this.logger.warn(`Failed to persist Copilot interaction ${record.id} to database: ${error}`);
    });
  }

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
    this.persistCalculatorResultToDatabase(record);
    return envelope('Clinical Calculator Result', record);
  }

  // BOLA fix: recordCalculatorResult() has always stamped tenantId on every
  // row, but this read path never checked it -- any USE_CALCULATORS-permitted
  // user could list every org's calculator results by omitting patientId, or
  // read another org's patient's results by supplying that patientId. Same
  // own-org-or-legacy-null rule as every other tenant-scoping fix in this
  // codebase: a row with no tenantId (pre-migration/legacy) stays visible,
  // a row with a real, different tenantId does not.
  listCalculatorResults(
    filters: { patientId?: string; calculatorId?: string; organizationId?: string } = {},
  ) {
    const rows = this.calculatorResults.filter((row) => {
      if (filters.patientId && row.patientId !== filters.patientId) return false;
      if (filters.calculatorId && row.calculatorId !== filters.calculatorId) return false;
      if (filters.organizationId && row.tenantId && row.tenantId !== filters.organizationId) {
        return false;
      }
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
    this.persistCopilotInteractionToDatabase(record);
    return envelope('Copilot Interaction', record);
  }

  // Same BOLA fix as listCalculatorResults() above -- these rows carry
  // patientContextSummary/draftGuidance, real PHI-adjacent clinical content,
  // and were readable across every tenant with no filtering at all.
  listCopilotInteractions(filters: { patientId?: string; organizationId?: string } = {}) {
    const rows = this.copilotInteractions.filter((row) => {
      if (filters.patientId && row.patientId !== filters.patientId) return false;
      if (filters.organizationId && row.tenantId && row.tenantId !== filters.organizationId) {
        return false;
      }
      return true;
    });
    return envelope('Copilot Interactions', {
      count: rows.length,
      interactions: rows,
      safetyNotice: 'Decision support only — requires clinician review.',
    });
  }
}
