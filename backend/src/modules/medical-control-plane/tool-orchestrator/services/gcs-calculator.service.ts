/**
 * Glasgow Coma Scale (GCS) Calculator Service
 *
 * Ported from `src/utils/emergencyCriticalCareCalculators.ts`
 * (`calculateGcsScore`/`interpretGcsScore`, same point values and bands).
 *
 * Reference: Teasdale G, Jennett B. Lancet. 1974;2:81-84.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

function interpretGcsScore(score: number) {
  if (score <= 8) {
    return {
      riskCategory: 'severe',
      label: 'Severe impairment range',
      interpretation:
        'GCS 3-8 is commonly categorized as severe traumatic brain injury/marked impaired consciousness context. Escalate urgently when clinically indicated.',
      warnings: [
        'Airway, trauma, tox/metabolic, and neurologic emergencies require immediate clinical evaluation.',
      ],
    };
  }
  if (score <= 12) {
    return {
      riskCategory: 'moderate',
      label: 'Moderate impairment range',
      interpretation:
        'GCS 9-12 is commonly categorized as moderate impairment. Trend serial exams and interpret with cause, sedation, intoxication, and intubation status.',
      warnings: ['A single GCS does not diagnose cause or determine imaging/treatment by itself.'],
    };
  }
  return {
    riskCategory: 'mild',
    label: 'Mild/no impairment range',
    interpretation:
      'GCS 13-15 is commonly categorized as mild impairment/no major depression of consciousness on this scale. It does not rule out serious pathology.',
    warnings: [
      'Normal or near-normal GCS does not exclude intracranial injury or evolving deterioration.',
    ],
  };
}

@Injectable()
export class GcsCalculatorService implements ClinicalToolService {
  private readonly logger = new Logger(GcsCalculatorService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'gcs-calculator',
      name: 'Glasgow Coma Scale',
      description: 'Eye, verbal, and motor response scoring for level of consciousness',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Teasdale G, Jennett B. Assessment of coma and impaired consciousness. Lancet. 1974;2:81-84.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'eye',
        type: 'number',
        required: true,
        description: 'Eye opening (1-4)',
        validation: { min: 1, max: 4 },
      },
      {
        name: 'verbal',
        type: 'number',
        required: true,
        description: 'Verbal response (1-5)',
        validation: { min: 1, max: 5 },
      },
      {
        name: 'motor',
        type: 'number',
        required: true,
        description: 'Motor response (1-6)',
        validation: { min: 1, max: 6 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const bounds: Record<string, [number, number]> = { eye: [1, 4], verbal: [1, 5], motor: [1, 6] };

    for (const [key, [min, max]] of Object.entries(bounds)) {
      const v = Number(parameters[key]);
      if (!Number.isFinite(v) || v < min || v > max) {
        errors.push(`${key} must be a number between ${min} and ${max}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating GCS with parameters: ${JSON.stringify(parameters)}`);

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

    const score = Number(parameters.eye) + Number(parameters.verbal) + Number(parameters.motor);
    const risk = interpretGcsScore(score);

    return {
      success: true,
      data: { score, riskCategory: risk.riskCategory, label: risk.label },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'Glasgow Coma Scale — Original Publication',
          reference: 'Teasdale G, Jennett B. Lancet. 1974;2:81-84.',
        },
      ],
      warnings: [...validation.warnings, ...risk.warnings],
      disclaimer: 'This tool supports clinical assessment and does not replace physician judgment.',
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { eye: 4, verbal: 5, motor: 6 };
  }
}
