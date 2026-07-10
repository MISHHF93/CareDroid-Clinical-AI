/**
 * Anion Gap Calculator Service
 *
 * Anion gap = Na - (Cl + HCO3), with optional albumin correction.
 * Ported from `src/utils/nextWaveCalculatorUtils.ts` (same formula and
 * reference-range interpretation).
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const ANION_GAP_DISCLAIMER =
  'Acid-base calculation support. Does not diagnose a specific disorder or replace blood gas, lactate, renal, toxicology, or institutional metabolic-acidosis pathways.';

function interpretAnionGap(gap: number) {
  if (gap > 12) {
    return {
      riskCategory: 'high',
      label: 'High anion gap',
      interpretation:
        'The anion gap is above the common adult reference range. Correlate with pH, lactate, ketones, renal function, toxins, and local acid-base workflows.',
    };
  }
  if (gap < 8) {
    return {
      riskCategory: 'low',
      label: 'Low anion gap',
      interpretation:
        'The anion gap is below the common adult reference range. Consider lab artifact, albumin, paraproteins, and clinical context.',
    };
  }
  return {
    riskCategory: 'normal',
    label: 'Anion gap in common reference range',
    interpretation:
      'The anion gap falls within a common adult reference range. This does not exclude mixed or non-gap acid-base disorders.',
  };
}

@Injectable()
export class AnionGapService implements ClinicalToolService {
  private readonly logger = new Logger(AnionGapService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'anion-gap',
      name: 'Anion Gap Calculator',
      description: 'Serum anion gap with optional albumin correction',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: ['Anion gap = Na - (Cl + HCO3).'],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'sodium',
        type: 'number',
        required: true,
        description: 'Serum sodium (mEq/L)',
        validation: { min: 100, max: 200 },
      },
      {
        name: 'chloride',
        type: 'number',
        required: true,
        description: 'Serum chloride (mEq/L)',
        validation: { min: 50, max: 150 },
      },
      {
        name: 'bicarbonate',
        type: 'number',
        required: true,
        description: 'Serum bicarbonate/CO2 (mEq/L)',
        validation: { min: 0, max: 60 },
      },
      {
        name: 'albumin',
        type: 'number',
        required: false,
        description: 'Serum albumin (g/dL), for corrected anion gap',
        validation: { min: 0, max: 6 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const key of ['sodium', 'chloride', 'bicarbonate']) {
      const v = Number(parameters[key]);
      if (!Number.isFinite(v)) {
        errors.push(`${key} must be a valid number`);
      }
    }

    if (parameters.albumin !== undefined && parameters.albumin !== null) {
      const alb = Number(parameters.albumin);
      if (!Number.isFinite(alb)) {
        errors.push('albumin must be a valid number');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating anion gap with parameters: ${JSON.stringify(parameters)}`);

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

    const na = Number(parameters.sodium);
    const cl = Number(parameters.chloride);
    const hco3 = Number(parameters.bicarbonate);
    const anionGap = Number((na - (cl + hco3)).toFixed(1));

    const alb =
      parameters.albumin !== undefined && parameters.albumin !== null
        ? Number(parameters.albumin)
        : null;
    const correctedAnionGap =
      alb !== null && alb > 0 ? Number((anionGap + 2.5 * (4 - alb)).toFixed(1)) : null;

    const risk = interpretAnionGap(anionGap);

    return {
      success: true,
      data: { anionGap, correctedAnionGap, riskCategory: risk.riskCategory, label: risk.label },
      interpretation: risk.interpretation,
      citations: [{ title: 'Anion Gap', reference: 'Anion gap = Na - (Cl + HCO3).' }],
      warnings: validation.warnings,
      disclaimer: ANION_GAP_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { sodium: 140, chloride: 100, bicarbonate: 24, albumin: 4 };
  }
}
