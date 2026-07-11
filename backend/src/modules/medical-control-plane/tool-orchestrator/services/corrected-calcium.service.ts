/**
 * Corrected Calcium Calculator Service
 *
 * Ported from `src/utils/endocrineMetabolicCalculators.ts` (`computeCorrectedCalcium`),
 * same albumin-correction formula and severity bands.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER =
  'Clinical decision support only. Follow local endocrine, electrolyte, and critical-care pathways; do not delay urgent evaluation to complete this tool.';

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

@Injectable()
export class CorrectedCalciumService implements ClinicalToolService {
  private readonly logger = new Logger(CorrectedCalciumService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'corrected-calcium',
      name: 'Corrected Calcium',
      description: 'Albumin-corrected total calcium',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: ['Corrected calcium (mg/dL) = measured calcium + 0.8 x (4.0 - albumin g/dL).'],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'calciumMgDl',
        type: 'number',
        required: true,
        description: 'Total serum calcium (mg/dL)',
        validation: { min: 4, max: 18 },
      },
      {
        name: 'albuminGDl',
        type: 'number',
        required: true,
        description: 'Serum albumin (g/dL)',
        validation: { min: 1, max: 6 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const calciumMgDl = Number(parameters.calciumMgDl);
    const albuminGDl = Number(parameters.albuminGDl);

    if (!inRange(calciumMgDl, 4, 18)) errors.push('calciumMgDl must be between 4 and 18');
    if (!inRange(albuminGDl, 1, 6)) errors.push('albuminGDl must be between 1 and 6');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating corrected calcium with parameters: ${JSON.stringify(parameters)}`);

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

    const calciumMgDl = Number(parameters.calciumMgDl);
    const albuminGDl = Number(parameters.albuminGDl);

    const correctedCalciumMgDl = Number((calciumMgDl + 0.8 * (4 - albuminGDl)).toFixed(2));
    const correctedCalciumMmolL = Number((correctedCalciumMgDl * 0.2495).toFixed(2));
    const severity =
      correctedCalciumMgDl < 7 || correctedCalciumMgDl > 12
        ? 'critical'
        : correctedCalciumMgDl < 8.5 || correctedCalciumMgDl > 10.5
          ? 'warning'
          : 'normal';

    return {
      success: true,
      data: { correctedCalciumMgDl, correctedCalciumMmolL, severity },
      interpretation:
        'Albumin-corrected calcium approximates total calcium when albumin is abnormal. Ionized calcium is preferred when accuracy is critical, especially in critical illness, acid-base disturbances, or major protein abnormalities.',
      citations: [
        {
          title: 'Corrected Calcium',
          reference: 'Corrected calcium (mg/dL) = measured calcium + 0.8 x (4.0 - albumin g/dL).',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not diagnose calcium disorders and does not recommend calcium, vitamin D, bisphosphonate, calcitonin, or dialysis treatment.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { calciumMgDl: 8.0, albuminGDl: 2.0 };
  }
}
