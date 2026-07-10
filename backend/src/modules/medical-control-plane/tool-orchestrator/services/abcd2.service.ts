/**
 * ABCD2 Score Calculator Service — short-term stroke risk after TIA.
 *
 * Ported from `src/utils/abcd2Calculator.ts` (same point values, risk bands,
 * and 2-day stroke-risk context by score).
 *
 * Reference: Johnston SC, et al. Lancet. 2007;369(9558):283-292.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const ABCD2_STROKE_DISCLAIMER =
  'TIA / stroke risk stratification only. Does not diagnose stroke or TIA and does not recommend specific antithrombotic therapy, admission, or imaging. If acute stroke, crescendo symptoms, or new focal deficit is present, activate emergency stroke pathways immediately — do not delay urgent evaluation to complete scoring.';

const CLINICAL_FEATURE_POINTS: Record<string, number> = {
  other: 0,
  speech_disturbance: 1,
  unilateral_weakness: 2,
};

const DURATION_POINTS: Record<string, number> = {
  under_10: 0,
  ten_to_59: 1,
  sixty_plus: 2,
};

const STROKE_RISK_CONTEXT_BY_SCORE: Record<number, string> = {
  0: 'Approximate 2-day stroke risk ~1% in validation cohorts',
  1: 'Approximate 2-day stroke risk ~1-2%',
  2: 'Approximate 2-day stroke risk ~2%',
  3: 'Approximate 2-day stroke risk ~3%',
  4: 'Approximate 2-day stroke risk ~4%',
  5: 'Approximate 2-day stroke risk ~6%',
  6: 'Approximate 2-day stroke risk ~8%',
  7: 'Approximate 2-day stroke risk ~11% in validation cohorts',
};

const INTERPRETATIONS: Record<string, string> = {
  low: 'Scores of 0-3 fall in the lower short-term stroke-risk stratum after TIA in validation studies. Risk stratification for discussion and follow-up planning only.',
  moderate:
    'Scores of 4-5 fall in the moderate short-term stroke-risk stratum in validation studies. Does not direct admission, imaging timing, or antithrombotic therapy.',
  high: 'Scores of 6-7 fall in the higher short-term stroke-risk stratum in validation studies. Urgent stroke evaluation pathways may already be indicated by presentation — this score does not replace them.',
};

function riskCategoryFromScore(score: number): 'low' | 'moderate' | 'high' | null {
  if (!Number.isFinite(score) || score < 0 || score > 7) return null;
  if (score <= 3) return 'low';
  if (score <= 5) return 'moderate';
  return 'high';
}

@Injectable()
export class Abcd2Service implements ClinicalToolService {
  private readonly logger = new Logger(Abcd2Service.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'abcd2',
      name: 'ABCD2 Score',
      description:
        'Short-term stroke risk stratification after TIA (Age, Blood pressure, Clinical features, Duration, Diabetes)',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Johnston SC, et al. Validation and refinement of predictive models to determine risk of stroke in patients with TIA. Lancet. 2007;369(9558):283-292.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'age60OrOlder',
        type: 'boolean',
        required: false,
        description: 'Age 60 years or older',
      },
      {
        name: 'systolicBpMmHg',
        type: 'number',
        required: true,
        description: 'Systolic blood pressure (mmHg)',
        validation: { min: 0, max: 300 },
      },
      {
        name: 'diastolicBpMmHg',
        type: 'number',
        required: true,
        description: 'Diastolic blood pressure (mmHg)',
        validation: { min: 0, max: 200 },
      },
      {
        name: 'clinicalFeature',
        type: 'string',
        required: true,
        description: 'Clinical features category',
        validation: { options: ['other', 'speech_disturbance', 'unilateral_weakness'] },
      },
      {
        name: 'durationBand',
        type: 'string',
        required: true,
        description: 'Symptom duration',
        validation: { options: ['under_10', 'ten_to_59', 'sixty_plus'] },
      },
      { name: 'diabetes', type: 'boolean', required: false, description: 'History of diabetes' },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const sbp = Number(parameters.systolicBpMmHg);
    const dbp = Number(parameters.diastolicBpMmHg);
    if (!Number.isFinite(sbp) || sbp < 0)
      errors.push('systolicBpMmHg must be a valid non-negative number');
    if (!Number.isFinite(dbp) || dbp < 0)
      errors.push('diastolicBpMmHg must be a valid non-negative number');
    if (CLINICAL_FEATURE_POINTS[parameters.clinicalFeature] === undefined) {
      errors.push('clinicalFeature must be one of: other, speech_disturbance, unilateral_weakness');
    }
    if (DURATION_POINTS[parameters.durationBand] === undefined) {
      errors.push('durationBand must be one of: under_10, ten_to_59, sixty_plus');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating ABCD2 score with parameters: ${JSON.stringify(parameters)}`);

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

    const sbp = Number(parameters.systolicBpMmHg);
    const dbp = Number(parameters.diastolicBpMmHg);
    let score =
      CLINICAL_FEATURE_POINTS[parameters.clinicalFeature] +
      DURATION_POINTS[parameters.durationBand];
    if (parameters.age60OrOlder) score += 1;
    if (sbp >= 140 || dbp >= 90) score += 1;
    if (parameters.diabetes) score += 1;

    const riskCategory = riskCategoryFromScore(score)!;

    return {
      success: true,
      data: {
        score,
        riskCategory,
        strokeRiskContext: STROKE_RISK_CONTEXT_BY_SCORE[score] ?? '—',
      },
      interpretation: INTERPRETATIONS[riskCategory],
      citations: [
        {
          title: 'ABCD2 Score — Original Publication',
          reference: 'Johnston SC, et al. Lancet. 2007;369(9558):283-292.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/17258668/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: ABCD2_STROKE_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      age60OrOlder: true,
      systolicBpMmHg: 150,
      diastolicBpMmHg: 95,
      clinicalFeature: 'unilateral_weakness',
      durationBand: 'sixty_plus',
      diabetes: false,
    };
  }
}
