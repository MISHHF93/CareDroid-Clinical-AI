/**
 * Calculated Serum Osmolality Service
 *
 * Ported from `src/utils/endocrineMetabolicCalculators.ts` (`computeSerumOsmolality`),
 * same formula and severity band.
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
export class SerumOsmolalityService implements ClinicalToolService {
  private readonly logger = new Logger(SerumOsmolalityService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'serum-osmolality',
      name: 'Calculated Serum Osmolality',
      description: 'Estimated serum osmolality from sodium, glucose, BUN, and ethanol',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: ['Calculated osmolality = 2 x Na + glucose/18 + BUN/2.8 + ethanol/3.7.'],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'sodium',
        type: 'number',
        required: true,
        description: 'Serum sodium (mEq/L)',
        validation: { min: 90, max: 190 },
      },
      {
        name: 'glucoseMgDl',
        type: 'number',
        required: true,
        description: 'Serum glucose (mg/dL)',
        validation: { min: 20, max: 2000 },
      },
      {
        name: 'bunMgDl',
        type: 'number',
        required: true,
        description: 'Blood urea nitrogen (mg/dL)',
        validation: { min: 1, max: 300 },
      },
      {
        name: 'ethanolMgDl',
        type: 'number',
        required: false,
        description: 'Serum ethanol (mg/dL), defaults to 0',
        validation: { min: 0, max: 600 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const sodium = Number(parameters.sodium);
    const glucoseMgDl = Number(parameters.glucoseMgDl);
    const bunMgDl = Number(parameters.bunMgDl);
    const ethanolMgDl = parameters.ethanolMgDl !== undefined ? Number(parameters.ethanolMgDl) : 0;

    if (!inRange(sodium, 90, 190)) errors.push('sodium must be between 90 and 190');
    if (!inRange(glucoseMgDl, 20, 2000)) errors.push('glucoseMgDl must be between 20 and 2000');
    if (!inRange(bunMgDl, 1, 300)) errors.push('bunMgDl must be between 1 and 300');
    if (!inRange(ethanolMgDl, 0, 600)) errors.push('ethanolMgDl must be between 0 and 600');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating serum osmolality with parameters: ${JSON.stringify(parameters)}`);

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

    const sodium = Number(parameters.sodium);
    const glucoseMgDl = Number(parameters.glucoseMgDl);
    const bunMgDl = Number(parameters.bunMgDl);
    const ethanolMgDl = parameters.ethanolMgDl !== undefined ? Number(parameters.ethanolMgDl) : 0;

    const calculatedOsmolality = Number(
      (2 * sodium + glucoseMgDl / 18 + bunMgDl / 2.8 + ethanolMgDl / 3.7).toFixed(1),
    );
    const severity =
      calculatedOsmolality < 275 || calculatedOsmolality > 320 ? 'warning' : 'normal';

    return {
      success: true,
      data: { calculatedOsmolality, severity },
      interpretation:
        'Calculated serum osmolality estimates osmoles from sodium, glucose, BUN, and optional ethanol. Compare with measured osmolality when available and interpret with tonicity and clinical context.',
      citations: [
        {
          title: 'Calculated Serum Osmolality',
          reference: 'Calculated osmolality = 2 x Na + glucose/18 + BUN/2.8 + ethanol/3.7.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not diagnose hyperosmolar states, DKA, toxic ingestion, or recommend insulin, fluids, dialysis, or disposition.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { sodium: 140, glucoseMgDl: 100, bunMgDl: 14 };
  }
}
