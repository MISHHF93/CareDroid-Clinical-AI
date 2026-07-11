/**
 * Fractional Excretion of Sodium (FeNa) Calculator Service
 *
 * Ported from `src/utils/nephrologyCalculators.ts` (`computeFeNa`), same
 * formula and risk bands.
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
export class FenaService implements ClinicalToolService {
  private readonly logger = new Logger(FenaService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'fena',
      name: 'Fractional Excretion of Sodium (FeNa)',
      description: 'Urine electrolyte pattern adjunct in selected AKI contexts',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'FeNa = (urine sodium x serum creatinine) / (serum sodium x urine creatinine) x 100.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'serumSodium',
        type: 'number',
        required: true,
        description: 'Serum sodium (mEq/L)',
        validation: { min: 90, max: 190 },
      },
      {
        name: 'urineSodium',
        type: 'number',
        required: true,
        description: 'Urine sodium (mEq/L)',
        validation: { min: 0, max: 300 },
      },
      {
        name: 'serumCreatinineMgDl',
        type: 'number',
        required: true,
        description: 'Serum creatinine (mg/dL)',
        validation: { min: 0.2, max: 25 },
      },
      {
        name: 'urineCreatinineMgDl',
        type: 'number',
        required: true,
        description: 'Urine creatinine (mg/dL)',
        validation: { min: 1, max: 5000 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const serumSodium = Number(parameters.serumSodium);
    const urineSodium = Number(parameters.urineSodium);
    const serumCreatinineMgDl = Number(parameters.serumCreatinineMgDl);
    const urineCreatinineMgDl = Number(parameters.urineCreatinineMgDl);

    if (!inRange(serumSodium, 90, 190)) errors.push('serumSodium must be between 90 and 190');
    if (!inRange(urineSodium, 0, 300)) errors.push('urineSodium must be between 0 and 300');
    if (!inRange(serumCreatinineMgDl, 0.2, 25))
      errors.push('serumCreatinineMgDl must be between 0.2 and 25');
    if (!inRange(urineCreatinineMgDl, 1, 5000))
      errors.push('urineCreatinineMgDl must be between 1 and 5000');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating FeNa with parameters: ${JSON.stringify(parameters)}`);

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

    const serumSodium = Number(parameters.serumSodium);
    const urineSodium = Number(parameters.urineSodium);
    const serumCreatinineMgDl = Number(parameters.serumCreatinineMgDl);
    const urineCreatinineMgDl = Number(parameters.urineCreatinineMgDl);

    const fractionalExcretionPct = Number(
      ((urineSodium * serumCreatinineMgDl * 100) / (serumSodium * urineCreatinineMgDl)).toFixed(2),
    );
    const riskBand =
      fractionalExcretionPct < 1 ? 'low' : fractionalExcretionPct > 2 ? 'high' : 'intermediate';

    return {
      success: true,
      data: {
        fractionalExcretionPct,
        riskBand,
        severity: riskBand === 'intermediate' ? 'warning' : 'normal',
      },
      interpretation:
        'FeNa is a urine electrolyte pattern adjunct in selected AKI contexts. Diuretics, CKD, contrast exposure, sepsis, rhabdomyolysis, and non-oliguric states can make thresholds unreliable.',
      citations: [
        {
          title: 'FeNa',
          reference:
            'FeNa = (urine sodium x serum creatinine) / (serum sodium x urine creatinine) x 100.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} FeNa does not diagnose AKI etiology and does not recommend fluids, diuretics, or dialysis.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { serumSodium: 140, urineSodium: 20, serumCreatinineMgDl: 2.0, urineCreatinineMgDl: 60 };
  }
}
