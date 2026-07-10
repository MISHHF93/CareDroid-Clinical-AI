/**
 * CHADS2 Score Calculator Service
 *
 * Older AF stroke-risk score. Ported from
 * `src/utils/cardiologyRiskCalculators.ts` (`calculateChads2Score`/
 * `interpretChads2Score`, same point values and bands).
 *
 * Reference: Gage BF, et al. JAMA. 2001;285(22):2864-2870.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const CHADS2_CRITERIA = [
  {
    key: 'congestiveHeartFailure',
    points: 1,
    description: 'Congestive heart failure / LV dysfunction',
  },
  { key: 'hypertension', points: 1, description: 'History of hypertension' },
  { key: 'age75OrOlder', points: 1, description: 'Age >= 75 years' },
  { key: 'diabetes', points: 1, description: 'Diabetes mellitus' },
  { key: 'strokeTia', points: 2, description: 'Prior stroke or TIA' },
] as const;

const DISCLAIMER =
  'CHADS2 is an older AF stroke-risk score. Prefer current guideline frameworks when applicable; this output does not recommend anticoagulation or any medication change.';

function interpretChads2Score(score: number) {
  if (score >= 3) {
    return {
      riskBand: '3-6 points',
      interpretation:
        'Higher CHADS2 scores were associated with greater annual stroke risk in validation cohorts. Use for historical context and documentation, not as a standalone treatment trigger.',
    };
  }
  if (score >= 1) {
    return {
      riskBand: '1-2 points',
      interpretation:
        'A score of 1-2 indicates non-trivial thromboembolic risk in the original CHADS2 framework. Compare with CHA2DS2-VASc and clinical context.',
    };
  }
  return {
    riskBand: '0 points',
    interpretation:
      'A CHADS2 score of 0 was lower risk in the original cohort, but risk is not absent and modern tools may reclassify patients.',
  };
}

@Injectable()
export class Chads2Service implements ClinicalToolService {
  private readonly logger = new Logger(Chads2Service.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'chads2',
      name: 'CHADS2 Score',
      description:
        'Atrial fibrillation stroke-risk score (Congestive heart failure, Hypertension, Age, Diabetes, prior Stroke/TIA)',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Gage BF, Waterman AD, Shannon W, et al. Validation of clinical classification schemes for predicting stroke. JAMA. 2001;285(22):2864-2870.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return CHADS2_CRITERIA.map((c) => ({
      name: c.key,
      type: 'boolean',
      required: false,
      description: `${c.description} (${c.points} point${c.points > 1 ? 's' : ''} if present)`,
    }));
  }

  validate(_parameters: Record<string, any>): ToolValidationResult {
    return { valid: true, errors: [], warnings: [] };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating CHADS2 score with parameters: ${JSON.stringify(parameters)}`);

    let score = 0;
    const breakdown: Record<string, number> = {};
    for (const c of CHADS2_CRITERIA) {
      const points = parameters[c.key] ? c.points : 0;
      breakdown[c.key] = points;
      score += points;
    }

    const risk = interpretChads2Score(score);

    return {
      success: true,
      data: { score, breakdown, riskBand: risk.riskBand },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'CHADS2 — Original Publication',
          reference: 'Gage BF, et al. JAMA. 2001;285(22):2864-2870.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/11401607/',
        },
      ],
      warnings: [],
      disclaimer: DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      congestiveHeartFailure: false,
      hypertension: true,
      age75OrOlder: false,
      diabetes: false,
      strokeTia: false,
    };
  }
}
