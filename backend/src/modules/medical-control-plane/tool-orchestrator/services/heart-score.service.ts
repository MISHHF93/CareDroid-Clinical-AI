/**
 * HEART Score Calculator Service
 *
 * Chest pain risk stratification in the emergency department.
 * Ported from the frontend's `src/utils/heartScoreCalculator.ts` (same
 * scoring/interpretation logic, kept in sync intentionally).
 *
 * Reference: Six AJ, et al. Chest. 2008;134(6):1157-1164.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const HEART_DIMENSIONS = ['history', 'ecg', 'age', 'riskFactors', 'troponin'] as const;

const HEART_SCORE_DISCLAIMER =
  'Clinical decision support only. Does not diagnose acute coronary syndrome, rule out myocardial infarction, or recommend treatment, disposition, observation duration, or invasive strategy.';

type HeartRiskCategory = 'low' | 'intermediate' | 'high';

function heartRiskCategoryFromScore(score: number): HeartRiskCategory | null {
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  if (score >= 7) return 'high';
  if (score >= 4) return 'intermediate';
  return 'low';
}

function interpretHeartScore(score: number) {
  const riskCategory = heartRiskCategoryFromScore(score);
  if (!riskCategory) return null;

  if (riskCategory === 'high') {
    return {
      riskCategory,
      riskCategoryLabel: 'High risk',
      riskBand: '7-10 points',
      maceContext: 'Approximate MACE ~50-65% at 6 weeks in validation cohorts',
      interpretation:
        'Scores of 7-10 fall in the high-risk stratum in validation studies. This output stratifies short-term cardiac risk only — it does not diagnose acute coronary syndrome.',
    };
  }
  if (riskCategory === 'intermediate') {
    return {
      riskCategory,
      riskCategoryLabel: 'Intermediate risk',
      riskBand: '4-6 points',
      maceContext: 'Approximate MACE ~12-17% at 6 weeks in validation cohorts',
      interpretation:
        'Scores of 4-6 fall in the intermediate-risk stratum in validation studies. Risk stratification only — does not direct testing, disposition, or therapy.',
    };
  }
  return {
    riskCategory,
    riskCategoryLabel: 'Low risk',
    riskBand: '0-3 points',
    maceContext: 'Approximate MACE ~0.9-1.7% at 6 weeks in validation cohorts',
    interpretation:
      'Scores of 0-3 fall in the low-risk stratum in validation studies. Risk stratification only — does not direct testing, disposition, or therapy.',
  };
}

@Injectable()
export class HeartScoreService implements ClinicalToolService {
  private readonly logger = new Logger(HeartScoreService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'heart-score',
      name: 'HEART Score',
      description:
        'Chest pain risk stratification score combining History, ECG, Age, Risk factors, and Troponin',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Six AJ, et al. Chest pain in the emergency room: value of the HEART score. Chest. 2008;134(6):1157-1164.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    const descriptions: Record<(typeof HEART_DIMENSIONS)[number], string> = {
      history:
        'Suspiciousness of chest pain history for ACS (0=slightly, 1=moderately, 2=highly suspicious)',
      ecg: 'Admission ECG findings (0=normal, 1=non-specific repolarisation disturbance, 2=significant ST deviation)',
      age: 'Patient age band (0=<45 years, 1=45-64 years, 2=>=65 years)',
      riskFactors:
        'CAD risk factor count (0=none, 1=1-2 risk factors, 2=>=3 risk factors or known atherosclerotic disease)',
      troponin: 'Initial troponin vs. local ULN (0=<=normal, 1=1-3x ULN, 2=>3x ULN)',
    };
    return HEART_DIMENSIONS.map((key) => ({
      name: key,
      type: 'number',
      required: true,
      description: descriptions[key],
      validation: { min: 0, max: 2 },
    }));
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const key of HEART_DIMENSIONS) {
      const v = Number(parameters[key]);
      if (!Number.isFinite(v) || v < 0 || v > 2) {
        errors.push(`${key} must be a score of 0, 1, or 2`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating HEART score with parameters: ${JSON.stringify(parameters)}`);

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

    let totalScore = 0;
    for (const key of HEART_DIMENSIONS) {
      totalScore += Number(parameters[key]);
    }

    const risk = interpretHeartScore(totalScore);

    return {
      success: true,
      data: {
        totalScore,
        riskCategory: risk?.riskCategory,
        riskCategoryLabel: risk?.riskCategoryLabel,
        riskBand: risk?.riskBand,
        maceContext: risk?.maceContext,
      },
      interpretation: risk?.interpretation,
      citations: [
        {
          title: 'HEART Score - Original Publication',
          reference: 'Six AJ, et al. Chest. 2008;134(6):1157-1164.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/19017577/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: HEART_SCORE_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { history: 2, ecg: 1, age: 2, riskFactors: 2, troponin: 1 };
  }
}
