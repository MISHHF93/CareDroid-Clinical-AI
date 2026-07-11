/**
 * Fractional Excretion of Urea (FeUrea) Calculator Service
 *
 * Ported from `src/utils/nephrologyCalculators.ts` (`computeFeUrea`), same
 * formula and risk band.
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
export class FeureaService implements ClinicalToolService {
  private readonly logger = new Logger(FeureaService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'feurea',
      name: 'Fractional Excretion of Urea (FeUrea)',
      description: 'AKI pattern adjunct when diuretics limit FeNa interpretation',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'FeUrea = (urine urea nitrogen x serum creatinine) / (BUN x urine creatinine) x 100.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'bunMgDl',
        type: 'number',
        required: true,
        description: 'Blood urea nitrogen (mg/dL)',
        validation: { min: 1, max: 300 },
      },
      {
        name: 'urineUreaNitrogenMgDl',
        type: 'number',
        required: true,
        description: 'Urine urea nitrogen (mg/dL)',
        validation: { min: 1, max: 5000 },
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

    const bunMgDl = Number(parameters.bunMgDl);
    const urineUreaNitrogenMgDl = Number(parameters.urineUreaNitrogenMgDl);
    const serumCreatinineMgDl = Number(parameters.serumCreatinineMgDl);
    const urineCreatinineMgDl = Number(parameters.urineCreatinineMgDl);

    if (!inRange(bunMgDl, 1, 300)) errors.push('bunMgDl must be between 1 and 300');
    if (!inRange(urineUreaNitrogenMgDl, 1, 5000))
      errors.push('urineUreaNitrogenMgDl must be between 1 and 5000');
    if (!inRange(serumCreatinineMgDl, 0.2, 25))
      errors.push('serumCreatinineMgDl must be between 0.2 and 25');
    if (!inRange(urineCreatinineMgDl, 1, 5000))
      errors.push('urineCreatinineMgDl must be between 1 and 5000');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating FeUrea with parameters: ${JSON.stringify(parameters)}`);

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

    const bunMgDl = Number(parameters.bunMgDl);
    const urineUreaNitrogenMgDl = Number(parameters.urineUreaNitrogenMgDl);
    const serumCreatinineMgDl = Number(parameters.serumCreatinineMgDl);
    const urineCreatinineMgDl = Number(parameters.urineCreatinineMgDl);

    const fractionalExcretionPct = Number(
      (
        (urineUreaNitrogenMgDl * serumCreatinineMgDl * 100) /
        (bunMgDl * urineCreatinineMgDl)
      ).toFixed(1),
    );
    const riskBand = fractionalExcretionPct < 35 ? 'low' : 'not_low';

    return {
      success: true,
      data: { fractionalExcretionPct, riskBand, severity: 'normal' },
      interpretation:
        'FeUrea can support AKI pattern review when diuretics limit FeNa interpretation, but performance varies by population and timing.',
      citations: [
        {
          title: 'FeUrea',
          reference:
            'FeUrea = (urine urea nitrogen x serum creatinine) / (BUN x urine creatinine) x 100.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} FeUrea does not diagnose AKI etiology and does not recommend fluids, diuretics, or dialysis.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      bunMgDl: 40,
      urineUreaNitrogenMgDl: 800,
      serumCreatinineMgDl: 2.0,
      urineCreatinineMgDl: 60,
    };
  }
}
