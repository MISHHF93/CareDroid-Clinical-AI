/**
 * Wells PE (Pulmonary Embolism) Calculator Service
 *
 * Seven-criteria fractional-point clinical prediction rule for PE
 * pre-test probability. Ported from `src/utils/wellsPeCalculator.ts`
 * (same criteria weights/interpretation banding).
 *
 * Reference: Wells PS, et al. Thromb Haemost. 2000;83(3):416-420;
 * Wells PS, et al. Ann Intern Med. 2001;135(2):98-107.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const WELLS_PE_CRITERIA = [
  { key: 'clinicalDvtSigns', points: 3, description: 'Clinical signs/symptoms of DVT' },
  { key: 'peMostLikelyDiagnosis', points: 3, description: 'PE is #1 diagnosis or equally likely' },
  { key: 'heartRateOver100', points: 1.5, description: 'Heart rate > 100/min' },
  {
    key: 'immobilizationOrSurgery',
    points: 1.5,
    description: 'Immobilization >=3 days or surgery in the past 4 weeks',
  },
  { key: 'previousDvtOrPe', points: 1.5, description: 'Previous DVT or PE' },
  { key: 'hemoptysis', points: 1, description: 'Hemoptysis' },
  { key: 'malignancy', points: 1, description: 'Active malignancy' },
] as const;

const DIAGNOSTIC_DISCLAIMER =
  'This score estimates pre-test clinical probability only. It does not rule in or rule out pulmonary embolism and must not replace imaging, D-dimer, or institutional PE pathways when indicated.';

function interpretWellsPe(score: number) {
  if (score > 6) {
    return {
      probabilityBand: 'High probability',
      interpretation:
        'A Wells PE score above 6 is associated with a higher likelihood of pulmonary embolism in validation cohorts. Further evaluation (e.g. imaging or pathway-based work-up per local protocol) may be appropriate — this tool does not mandate a specific test or treatment.',
    };
  }
  if (score > 4) {
    return {
      probabilityBand: 'Intermediate probability',
      interpretation:
        'Scores between 4 and 6 fall in an intermediate probability band. Interpret alongside pre-test probability, D-dimer strategy where applicable, and senior review per your PE pathway.',
    };
  }
  return {
    probabilityBand: 'Low probability',
    interpretation:
      'A Wells PE score of 4 or less is associated with lower probability in validation studies, but pulmonary embolism can still be present. Do not exclude PE on this score alone if clinical suspicion remains.',
  };
}

@Injectable()
export class WellsPeService implements ClinicalToolService {
  private readonly logger = new Logger(WellsPeService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'wells-pe',
      name: 'Wells Score for Pulmonary Embolism',
      description:
        'Seven-criteria clinical prediction rule for pulmonary embolism pre-test probability',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        "Wells PS, Anderson DR, Rodger M, et al. Derivation of a simple clinical model to categorize patients' probability of pulmonary embolism. Thromb Haemost. 2000;83(3):416-420.",
        'Wells PS, et al. Excluding pulmonary embolism at the bedside without diagnostic imaging. Ann Intern Med. 2001;135(2):98-107.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return WELLS_PE_CRITERIA.map((c) => ({
      name: c.key,
      type: 'boolean',
      required: true,
      description: `${c.description} (${c.points} points if present)`,
    }));
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const c of WELLS_PE_CRITERIA) {
      if (typeof parameters[c.key] !== 'boolean') {
        errors.push(`${c.key} must be a boolean`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating Wells PE score with parameters: ${JSON.stringify(parameters)}`);

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

    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const c of WELLS_PE_CRITERIA) {
      const points = parameters[c.key] ? c.points : 0;
      breakdown[c.key] = points;
      total += points;
    }
    const score = Math.round(total * 10) / 10;

    const { probabilityBand, interpretation } = interpretWellsPe(score);

    return {
      success: true,
      data: { score, breakdown, probabilityBand },
      interpretation,
      citations: [
        {
          title: 'Wells PE — Original Derivation',
          reference: 'Wells PS, et al. Thromb Haemost. 2000;83(3):416-420.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/10744147/',
        },
        {
          title: 'Wells PE — Simplified Bedside Model',
          reference: 'Wells PS, et al. Ann Intern Med. 2001;135(2):98-107.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/11453709/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: DIAGNOSTIC_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      clinicalDvtSigns: false,
      peMostLikelyDiagnosis: true,
      heartRateOver100: true,
      immobilizationOrSurgery: false,
      previousDvtOrPe: false,
      hemoptysis: false,
      malignancy: false,
    };
  }
}
