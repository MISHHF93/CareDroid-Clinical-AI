/**
 * APACHE II Calculator Service
 *
 * Takes pre-mapped point values per component (matching the frontend's own
 * contract in `src/utils/emergencyCriticalCareCalculators.ts` — the caller
 * selects the point value for each physiologic range, this service does not
 * re-derive points from raw vitals). Ported logic:
 * `calculateApacheIIScore`/`interpretApacheIIScore`.
 *
 * Reference: Knaus WA, et al. Crit Care Med. 1985;13(10):818-829.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const COMPONENT_KEYS = [
  'temperature',
  'map',
  'heartRate',
  'respiratoryRate',
  'oxygenation',
  'acidBase',
  'sodium',
  'potassium',
  'creatinine',
  'hematocrit',
  'wbc',
  'age',
  'chronicHealth',
] as const;

const COMPONENT_MAX_POINTS: Record<(typeof COMPONENT_KEYS)[number], number> = {
  temperature: 4,
  map: 4,
  heartRate: 4,
  respiratoryRate: 4,
  oxygenation: 4,
  acidBase: 4,
  sodium: 4,
  potassium: 4,
  creatinine: 4,
  hematocrit: 4,
  wbc: 4,
  age: 6,
  chronicHealth: 5,
};

function interpretApacheIIScore(score: number) {
  if (score >= 30) {
    return {
      riskCategory: 'very_high',
      label: 'Very high severity score',
      interpretation:
        'APACHE II score >=30 is a very high severity range. Original mortality prediction is diagnosis-specific and not a standalone bedside disposition rule.',
      warnings: [
        'Do not use APACHE II alone for individual prognosis, code status, ICU triage, or treatment decisions.',
      ],
    };
  }
  if (score >= 20) {
    return {
      riskCategory: 'high',
      label: 'High severity score',
      interpretation:
        'APACHE II score 20-29 indicates substantial acute physiology burden in the original ICU severity system.',
      warnings: ['Interpret with diagnosis, lead-time bias, organ support, and local ICU context.'],
    };
  }
  if (score >= 10) {
    return {
      riskCategory: 'moderate',
      label: 'Moderate severity score',
      interpretation:
        'APACHE II score 10-19 reflects intermediate physiologic severity; trend and context are essential.',
      warnings: ['APACHE II is not a diagnostic test and does not recommend treatment.'],
    };
  }
  return {
    riskCategory: 'lower',
    label: 'Lower severity score',
    interpretation:
      'APACHE II score 0-9 is a lower range in the scoring system, but serious illness may still be present.',
    warnings: ['A low score does not exclude deterioration or need for ICU-level care.'],
  };
}

@Injectable()
export class Apache2CalculatorService implements ClinicalToolService {
  private readonly logger = new Logger(Apache2CalculatorService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'apache2-calculator',
      name: 'APACHE II Score',
      description:
        'Acute Physiology and Chronic Health Evaluation II — 12 pre-scored physiologic components plus GCS, age, and chronic health points',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Knaus WA, et al. APACHE II: a severity of disease classification system. Crit Care Med. 1985;13(10):818-829.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    const componentParams: ToolParameter[] = COMPONENT_KEYS.map((key) => ({
      name: key,
      type: 'number',
      required: true,
      description: `Pre-mapped point value for ${key} (0-${COMPONENT_MAX_POINTS[key]})`,
      validation: { min: 0, max: COMPONENT_MAX_POINTS[key] },
    }));
    return [
      ...componentParams,
      {
        name: 'gcs',
        type: 'number',
        required: true,
        description: 'Glasgow Coma Scale total (3-15)',
        validation: { min: 3, max: 15 },
      },
      {
        name: 'acuteRenalFailure',
        type: 'boolean',
        required: false,
        description: 'Acute renal failure present (doubles the creatinine point contribution)',
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const key of COMPONENT_KEYS) {
      const v = Number(parameters[key]);
      if (!Number.isFinite(v) || v < 0 || v > COMPONENT_MAX_POINTS[key]) {
        errors.push(`${key} must be a number between 0 and ${COMPONENT_MAX_POINTS[key]}`);
      }
    }

    const gcs = Number(parameters.gcs);
    if (!Number.isFinite(gcs) || gcs < 3 || gcs > 15) {
      errors.push('gcs must be a number between 3 and 15');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating APACHE II score with parameters: ${JSON.stringify(parameters)}`);

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

    let selected = 0;
    for (const key of COMPONENT_KEYS) {
      selected += Number(parameters[key]);
    }

    const gcs = Number(parameters.gcs);
    const creatinineBase = Number(parameters.creatinine) || 0;
    const renalAdjustment = parameters.acuteRenalFailure ? creatinineBase : 0;
    const gcsContribution = 15 - gcs;

    const total = selected + renalAdjustment + gcsContribution;
    const acutePhysiology =
      total - (Number(parameters.age) || 0) - (Number(parameters.chronicHealth) || 0);

    const risk = interpretApacheIIScore(total);

    return {
      success: true,
      data: {
        total,
        acutePhysiology,
        gcsContribution,
        renalAdjustment,
        riskCategory: risk.riskCategory,
        label: risk.label,
      },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'APACHE II — Original Publication',
          reference: 'Knaus WA, et al. Crit Care Med. 1985;13(10):818-829.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/3928249/',
        },
      ],
      warnings: [...validation.warnings, ...risk.warnings],
      disclaimer: 'This tool supports clinical assessment and does not replace physician judgment.',
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      temperature: 0,
      map: 0,
      heartRate: 0,
      respiratoryRate: 0,
      oxygenation: 0,
      acidBase: 0,
      sodium: 0,
      potassium: 0,
      creatinine: 0,
      hematocrit: 0,
      wbc: 0,
      age: 2,
      chronicHealth: 0,
      gcs: 15,
      acuteRenalFailure: false,
    };
  }
}
