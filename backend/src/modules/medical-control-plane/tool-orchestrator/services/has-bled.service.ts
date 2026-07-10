/**
 * HAS-BLED Calculator Service
 *
 * Bleeding risk factors in patients considered for anticoagulation.
 * Ported from `src/utils/hasBledCalculator.ts` (same 9 one-point criteria).
 *
 * Reference: Pisters R, et al. Europace. 2010;12(7):923-928;
 * Lip GYH, et al. Eur Heart J. 2010;31(8):1004-1019.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const CRITERIA = [
  { key: 'hypertension', description: 'H - Uncontrolled hypertension (SBP repeatedly > 160 mmHg)' },
  {
    key: 'renalDysfunction',
    description: 'A - Abnormal renal function (dialysis, transplant, or Cr >=2.3 mg/dL)',
  },
  {
    key: 'liverDysfunction',
    description: 'A - Abnormal liver function (cirrhosis or significant chronic hepatic disease)',
  },
  { key: 'strokeHistory', description: 'S - Prior stroke or TIA' },
  { key: 'bleedingHistory', description: 'B - Bleeding tendency / history' },
  {
    key: 'labileInr',
    description: 'L - Labile INR (unstable/supratherapeutic if on a vitamin K antagonist)',
  },
  { key: 'ageOver65', description: 'E - Elderly (age > 65)' },
  {
    key: 'bleedingPredisposingDrugs',
    description: 'D - Drugs predisposing to bleeding (antiplatelets, NSAIDs)',
  },
  { key: 'alcoholUse', description: 'D - Excessive alcohol use' },
] as const;

const DISCLAIMER =
  'Bleeding-risk documentation only. Does not by itself mandate a specific anticoagulation decision.';

@Injectable()
export class HasBledService implements ClinicalToolService {
  private readonly logger = new Logger(HasBledService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'has-bled',
      name: 'HAS-BLED Score',
      description: 'Bleeding risk score for patients considered for anticoagulation',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Pisters R, Lane DA, Nieuwlaat R, de Vos CB, Crijns HJ, Lip GY. Europace. 2010;12(7):923-928.',
        'Lip GYH, et al. Eur Heart J. 2010;31(8):1004-1019.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return CRITERIA.map((c) => ({
      name: c.key,
      type: 'boolean',
      required: true,
      description: `${c.description} (1 point if present)`,
    }));
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const c of CRITERIA) {
      if (typeof parameters[c.key] !== 'boolean') {
        errors.push(`${c.key} must be a boolean`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating HAS-BLED score with parameters: ${JSON.stringify(parameters)}`);

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

    let total = 0;
    const breakdown: Record<string, number> = {};
    for (const c of CRITERIA) {
      const points = parameters[c.key] ? 1 : 0;
      breakdown[c.key] = points;
      total += points;
    }

    const elevated = total >= 3;
    const interpretation = elevated
      ? 'A HAS-BLED score of 3 or more is associated with higher bleeding risk and should prompt closer clinical review and risk-benefit discussion when anticoagulation is being considered. It does not by itself mandate a specific treatment choice.'
      : 'Scores below 3 are often associated with comparatively lower bleeding risk on this scale, but bleeding can still occur and clinical judgment remains essential.';

    return {
      success: true,
      data: { total, breakdown, elevated },
      interpretation,
      citations: [
        {
          title: 'HAS-BLED — Original Publication',
          reference: 'Pisters R, et al. Europace. 2010;12(7):923-928.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/20447945/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      hypertension: true,
      renalDysfunction: false,
      liverDysfunction: false,
      strokeHistory: false,
      bleedingHistory: false,
      labileInr: false,
      ageOver65: true,
      bleedingPredisposingDrugs: false,
      alcoholUse: false,
    };
  }
}
