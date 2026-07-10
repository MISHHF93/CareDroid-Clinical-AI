/**
 * Alveolar-arterial (A-a) Gradient Calculator Service
 *
 * Ported from `src/utils/pulmonologyCalculators.ts` (`computeAaGradient`),
 * same alveolar gas equation and age-adjusted expected-upper-limit rule.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const PULMONOLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Follow local respiratory, oxygen, ventilator, sepsis, pneumonia, asthma, COPD, and sleep pathways; do not delay urgent care to complete this tool.';

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

@Injectable()
export class AaGradientService implements ClinicalToolService {
  private readonly logger = new Logger(AaGradientService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'aa-gradient',
      name: 'Alveolar-arterial (A-a) Gradient',
      description: 'Age-adjusted A-a oxygen gradient from the alveolar gas equation',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Alveolar gas equation: PAO2 = FiO2 x (Patm - PH2O) - PaCO2/RQ; common age-adjusted upper limit approximates age/4 + 4 mmHg.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'ageYears',
        type: 'number',
        required: true,
        description: 'Age (years)',
        validation: { min: 0, max: 120 },
      },
      {
        name: 'fio2Pct',
        type: 'number',
        required: true,
        description: 'FiO2 (%, 21-100)',
        validation: { min: 21, max: 100 },
      },
      {
        name: 'pao2MmHg',
        type: 'number',
        required: true,
        description: 'PaO2 (mmHg)',
        validation: { min: 20, max: 700 },
      },
      {
        name: 'paco2MmHg',
        type: 'number',
        required: true,
        description: 'PaCO2 (mmHg)',
        validation: { min: 10, max: 120 },
      },
      {
        name: 'atmosphericPressureMmHg',
        type: 'number',
        required: false,
        description: 'Atmospheric pressure (mmHg), defaults to 760',
        validation: { min: 400, max: 800 },
      },
      {
        name: 'respiratoryQuotient',
        type: 'number',
        required: false,
        description: 'Respiratory quotient, defaults to 0.8',
        validation: { min: 0.6, max: 1.2 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const ageYears = Number(parameters.ageYears);
    const fio2Pct = Number(parameters.fio2Pct);
    const pao2MmHg = Number(parameters.pao2MmHg);
    const paco2MmHg = Number(parameters.paco2MmHg);
    const atmosphericPressureMmHg =
      parameters.atmosphericPressureMmHg !== undefined
        ? Number(parameters.atmosphericPressureMmHg)
        : 760;
    const respiratoryQuotient =
      parameters.respiratoryQuotient !== undefined ? Number(parameters.respiratoryQuotient) : 0.8;

    if (!inRange(ageYears, 0, 120)) errors.push('ageYears must be between 0 and 120');
    if (!inRange(fio2Pct, 21, 100)) errors.push('fio2Pct must be between 21 and 100');
    if (!inRange(pao2MmHg, 20, 700)) errors.push('pao2MmHg must be between 20 and 700');
    if (!inRange(paco2MmHg, 10, 120)) errors.push('paco2MmHg must be between 10 and 120');
    if (!inRange(atmosphericPressureMmHg, 400, 800))
      errors.push('atmosphericPressureMmHg must be between 400 and 800');
    if (!inRange(respiratoryQuotient, 0.6, 1.2))
      errors.push('respiratoryQuotient must be between 0.6 and 1.2');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating A-a gradient with parameters: ${JSON.stringify(parameters)}`);

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

    const ageYears = Number(parameters.ageYears);
    const fio2Pct = Number(parameters.fio2Pct);
    const pao2MmHg = Number(parameters.pao2MmHg);
    const paco2MmHg = Number(parameters.paco2MmHg);
    const atmosphericPressureMmHg =
      parameters.atmosphericPressureMmHg !== undefined
        ? Number(parameters.atmosphericPressureMmHg)
        : 760;
    const respiratoryQuotient =
      parameters.respiratoryQuotient !== undefined ? Number(parameters.respiratoryQuotient) : 0.8;

    const alveolarOxygen =
      (fio2Pct / 100) * (atmosphericPressureMmHg - 47) - paco2MmHg / respiratoryQuotient;
    const gradient = alveolarOxygen - pao2MmHg;
    const expectedUpperLimit = ageYears / 4 + 4;
    const elevated = gradient > expectedUpperLimit;

    return {
      success: true,
      data: {
        alveolarOxygen: Number(alveolarOxygen.toFixed(1)),
        gradient: Number(gradient.toFixed(1)),
        expectedUpperLimit: Number(expectedUpperLimit.toFixed(1)),
        elevated,
      },
      interpretation: elevated
        ? 'The calculated A-a gradient is above the age-adjusted expected upper limit. Interpret with ABG quality, FiO2 accuracy, altitude, and clinical context.'
        : 'The calculated A-a gradient is within the age-adjusted expected range for entered assumptions.',
      citations: [
        {
          title: 'Alveolar Gas Equation',
          reference:
            'PAO2 = FiO2 x (Patm - PH2O) - PaCO2/RQ; age-adjusted upper limit approximates age/4 + 4 mmHg.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} A-a gradient does not diagnose PE, shunt, V/Q mismatch, or respiratory failure.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { ageYears: 40, fio2Pct: 21, pao2MmHg: 90, paco2MmHg: 40 };
  }
}
