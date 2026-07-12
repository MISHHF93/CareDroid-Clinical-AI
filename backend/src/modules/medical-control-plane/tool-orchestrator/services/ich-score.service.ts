/**
 * ICH Score Calculator Service
 *
 * Ported from `src/utils/neurologyCalculators.ts` (`computeIchScore`), same
 * component point tables.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const NEUROLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Do not delay emergency stroke activation, neuroimaging, seizure care, airway support, neurosurgical consultation, or local urgent-care pathways to complete this tool.';

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

@Injectable()
export class IchScoreService implements ClinicalToolService {
  private readonly logger = new Logger(IchScoreService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'ich-score',
      name: 'ICH Score',
      description: 'Severity grading for spontaneous intracerebral hemorrhage',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Hemphill JC III, et al. The ICH score: a simple, reliable grading scale for intracerebral hemorrhage. Stroke. 2001.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'age',
        type: 'number',
        required: true,
        description: 'Age (years)',
        validation: { min: 0, max: 120 },
      },
      {
        name: 'gcs',
        type: 'number',
        required: true,
        description: 'Glasgow Coma Scale total (3-15)',
        validation: { min: 3, max: 15 },
      },
      {
        name: 'volumeMl',
        type: 'number',
        required: true,
        description: 'ICH volume (mL)',
        validation: { min: 0, max: 300 },
      },
      {
        name: 'intraventricularHemorrhage',
        type: 'string',
        required: true,
        description: 'Intraventricular hemorrhage present: "yes" or "no"',
        validation: { options: ['yes', 'no'] },
      },
      {
        name: 'infratentorialOrigin',
        type: 'string',
        required: true,
        description: 'Infratentorial origin: "yes" or "no"',
        validation: { options: ['yes', 'no'] },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const age = Number(parameters.age);
    const gcs = Number(parameters.gcs);
    const volumeMl = Number(parameters.volumeMl);

    if (!inRange(age, 0, 120)) errors.push('age must be between 0 and 120');
    if (!inRange(gcs, 3, 15)) errors.push('gcs must be between 3 and 15');
    if (!inRange(volumeMl, 0, 300)) errors.push('volumeMl must be between 0 and 300');
    if (!['yes', 'no'].includes(parameters.intraventricularHemorrhage)) {
      errors.push('intraventricularHemorrhage must be "yes" or "no"');
    }
    if (!['yes', 'no'].includes(parameters.infratentorialOrigin)) {
      errors.push('infratentorialOrigin must be "yes" or "no"');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating ICH score with parameters: ${JSON.stringify(parameters)}`);

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

    const age = Number(parameters.age);
    const gcs = Number(parameters.gcs);
    const volumeMl = Number(parameters.volumeMl);

    const gcsPoints = gcs <= 4 ? 2 : gcs <= 12 ? 1 : 0;
    const volumePoints = volumeMl >= 30 ? 1 : 0;
    const ivhPoints = parameters.intraventricularHemorrhage === 'yes' ? 1 : 0;
    const infratentorialPoints = parameters.infratentorialOrigin === 'yes' ? 1 : 0;
    const agePoints = age >= 80 ? 1 : 0;
    const score = gcsPoints + volumePoints + ivhPoints + infratentorialPoints + agePoints;
    const severity = score >= 4 ? 'critical' : score >= 2 ? 'warning' : 'normal';

    return {
      success: true,
      data: {
        score,
        label: `ICH score ${score}`,
        severity,
        components: { gcsPoints, volumePoints, ivhPoints, infratentorialPoints, agePoints },
      },
      interpretation:
        'ICH Score summarizes severity context for spontaneous intracerebral hemorrhage. It is not a treatment, prognosis guarantee, or transfer decision by itself.',
      citations: [
        {
          title: 'ICH Score',
          reference:
            'Hemphill JC III, et al. The ICH score: a simple, reliable grading scale for intracerebral hemorrhage. Stroke. 2001.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: NEUROLOGY_SAFETY_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      age: 65,
      gcs: 10,
      volumeMl: 20,
      intraventricularHemorrhage: 'no',
      infratentorialOrigin: 'no',
    };
  }
}
