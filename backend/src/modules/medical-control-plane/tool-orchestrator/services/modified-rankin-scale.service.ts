/**
 * Modified Rankin Scale Calculator Service
 *
 * Ported from `src/utils/neurologyCalculators.ts` (`computeModifiedRankinScale`),
 * same 0-6 level-to-severity mapping.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const NEUROLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Do not delay emergency stroke activation, neuroimaging, seizure care, airway support, neurosurgical consultation, or local urgent-care pathways to complete this tool.';

const VALID_SCORES = ['0', '1', '2', '3', '4', '5', '6'];

@Injectable()
export class ModifiedRankinScaleService implements ClinicalToolService {
  private readonly logger = new Logger(ModifiedRankinScaleService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'modified-rankin-scale',
      name: 'Modified Rankin Scale',
      description: 'Global disability outcome scale after stroke or neurologic illness',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Rankin J. Cerebral vascular accidents in patients over the age of 60. Scott Med J. 1957.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'score',
        type: 'string',
        required: true,
        description: 'Modified Rankin Scale level (0-6)',
        validation: { options: VALID_SCORES },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!VALID_SCORES.includes(String(parameters.score))) {
      errors.push('score must be one of 0, 1, 2, 3, 4, 5, 6');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(
      `Calculating Modified Rankin Scale with parameters: ${JSON.stringify(parameters)}`,
    );

    const validation = this.validate(parameters);
    if (!validation.valid) {
      return {
        success: false,
        data: {},
        errors: validation.errors,
        warnings: validation.warnings,
        timestamp: new Date(),
      };
    }

    const score = Number(parameters.score);
    const severity = score >= 4 ? 'critical' : score >= 2 ? 'warning' : 'normal';

    return {
      success: true,
      data: { score, label: `mRS ${score}`, severity },
      interpretation:
        'Modified Rankin Scale summarizes global disability after stroke or neurologic illness. It is an outcome description, not an acute treatment or disposition recommendation.',
      citations: [
        {
          title: 'Modified Rankin Scale',
          reference:
            'Rankin J. Cerebral vascular accidents in patients over the age of 60. Scott Med J. 1957.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: NEUROLOGY_SAFETY_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { score: '1' };
  }
}
