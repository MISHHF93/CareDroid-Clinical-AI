/**
 * Duke Treadmill Score Calculator Service
 *
 * Ported from `src/utils/cardiologyRiskCalculators.ts`
 * (`computeDukeTreadmillScore`/`interpretDukeTreadmillScore`).
 *
 * Reference: Mark DB, et al. Ann Intern Med. 1987;106(6):793-800.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const DISCLAIMER =
  'Applies to interpretable exercise treadmill testing; not for acute coronary syndrome, unstable symptoms, paced rhythm, LBBB, or uninterpretable ECG. Does not clear patients for discharge or exercise.';

function interpretDukeTreadmillScore(score: number) {
  if (score <= -11) {
    return {
      riskBand: '<= -11',
      interpretation:
        'A Duke treadmill score <= -11 is conventionally categorized as high risk in exercise treadmill prognostic frameworks.',
    };
  }
  if (score < 5) {
    return {
      riskBand: '-10 to +4',
      interpretation:
        'Scores between -10 and +4 are conventionally intermediate risk and require clinical correlation with symptoms, ECG quality, and test adequacy.',
    };
  }
  return {
    riskBand: '>= +5',
    interpretation:
      'Scores >= +5 are conventionally lower risk in validated exercise treadmill cohorts, but do not rule out coronary disease.',
  };
}

@Injectable()
export class DukeTreadmillScoreService implements ClinicalToolService {
  private readonly logger = new Logger(DukeTreadmillScoreService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'duke-treadmill-score',
      name: 'Duke Treadmill Score',
      description:
        'Exercise treadmill test prognostic score from exercise time, ST deviation, and angina',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Mark DB, Hlatky MA, Harrell FE Jr, et al. Exercise treadmill score for predicting prognosis in coronary artery disease. Ann Intern Med. 1987;106(6):793-800.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'exerciseMinutes',
        type: 'number',
        required: true,
        description: 'Total exercise time (minutes)',
        validation: { min: 0, max: 30 },
      },
      {
        name: 'stDeviationMm',
        type: 'number',
        required: true,
        description: 'Maximal ST-segment deviation (mm)',
        validation: { min: 0, max: 10 },
      },
      {
        name: 'anginaIndex',
        type: 'number',
        required: true,
        description: 'Angina index (0=none, 1=nonlimiting, 2=exercise-limiting)',
        validation: { options: ['0', '1', '2'] },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const exerciseMinutes = Number(parameters.exerciseMinutes);
    const stDeviationMm = Number(parameters.stDeviationMm);
    const anginaIndex = Number(parameters.anginaIndex);

    if (!Number.isFinite(exerciseMinutes) || exerciseMinutes < 0 || exerciseMinutes > 30) {
      errors.push('exerciseMinutes must be between 0 and 30');
    }
    if (!Number.isFinite(stDeviationMm) || stDeviationMm < 0 || stDeviationMm > 10) {
      errors.push('stDeviationMm must be between 0 and 10');
    }
    if (![0, 1, 2].includes(anginaIndex)) {
      errors.push('anginaIndex must be 0, 1, or 2');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(
      `Calculating Duke Treadmill Score with parameters: ${JSON.stringify(parameters)}`,
    );

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

    const exerciseMinutes = Number(parameters.exerciseMinutes);
    const stDeviationMm = Number(parameters.stDeviationMm);
    const anginaIndex = Number(parameters.anginaIndex);
    const score = Number((exerciseMinutes - 5 * stDeviationMm - 4 * anginaIndex).toFixed(1));

    const risk = interpretDukeTreadmillScore(score);

    return {
      success: true,
      data: { score, riskBand: risk.riskBand },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'Duke Treadmill Score — Original Publication',
          reference: 'Mark DB, et al. Ann Intern Med. 1987;106(6):793-800.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/3579066/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { exerciseMinutes: 10, stDeviationMm: 1, anginaIndex: 0 };
  }
}
