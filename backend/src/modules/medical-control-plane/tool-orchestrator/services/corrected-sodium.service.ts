/**
 * Corrected Sodium Calculator Service
 *
 * Ported from `src/utils/nephrologyCalculators.ts` (`computeCorrectedSodium`),
 * same hyperglycemia water-shift correction formula. This logic is also
 * duplicated in `src/utils/endocrineMetabolicCalculators.ts` (identical
 * formula) -- worth consolidating on the frontend in a future pass.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const NEPHROLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Follow local nephrology, AKI, electrolyte, acid-base, dialysis, and critical-care pathways; do not delay urgent evaluation to complete this tool.';

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

@Injectable()
export class CorrectedSodiumService implements ClinicalToolService {
  private readonly logger = new Logger(CorrectedSodiumService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'corrected-sodium',
      name: 'Corrected Sodium (Hyperglycemia)',
      description: 'Sodium correction for hyperglycemia-related water shift',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Common correction factors add 1.6 or 2.4 mEq/L sodium per 100 mg/dL glucose above 100 mg/dL.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'sodium',
        type: 'number',
        required: true,
        description: 'Measured serum sodium (mEq/L)',
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
        name: 'correctionFactor',
        type: 'string',
        required: false,
        description: 'Correction factor: "1.6" (default) or "2.4" mEq/L per 100 mg/dL glucose',
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const sodium = Number(parameters.sodium);
    const glucoseMgDl = Number(parameters.glucoseMgDl);

    if (!inRange(sodium, 90, 190)) errors.push('sodium must be between 90 and 190');
    if (!inRange(glucoseMgDl, 20, 2000)) errors.push('glucoseMgDl must be between 20 and 2000');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating corrected sodium with parameters: ${JSON.stringify(parameters)}`);

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
    const correctionFactor = String(parameters.correctionFactor) === '2.4' ? 2.4 : 1.6;

    const correctedSodium = Number(
      (sodium + correctionFactor * ((glucoseMgDl - 100) / 100)).toFixed(1),
    );
    const severity =
      correctedSodium < 125 || correctedSodium > 155
        ? 'critical'
        : correctedSodium < 135 || correctedSodium > 145
          ? 'warning'
          : 'normal';

    return {
      success: true,
      data: { correctedSodium, glucoseMgDl: Number(glucoseMgDl.toFixed(1)), severity },
      interpretation:
        'Corrected sodium estimates sodium after accounting for hyperglycemia-related water shift. Use measured osmolality, tonicity, symptoms, and rate of change for clinical decisions.',
      citations: [
        {
          title: 'Corrected Sodium',
          reference:
            'Common correction factors add 1.6 or 2.4 mEq/L sodium per 100 mg/dL glucose above 100 mg/dL.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} Does not recommend hypertonic saline, insulin, free water, or correction rates.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { sodium: 130, glucoseMgDl: 600, correctionFactor: '1.6' };
  }
}
