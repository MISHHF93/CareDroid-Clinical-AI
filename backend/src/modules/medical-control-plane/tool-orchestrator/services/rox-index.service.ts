/**
 * ROX Index Calculator Service
 *
 * Ported from `src/utils/pulmonologyCalculators.ts` (`computeRoxIndex`), same
 * formula and risk bands.
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

const BAND_LABEL: Record<string, string> = {
  reassuring: 'Higher ROX index context',
  indeterminate: 'Intermediate ROX index context',
  concerning: 'Lower ROX index context',
};

@Injectable()
export class RoxIndexService implements ClinicalToolService {
  private readonly logger = new Logger(RoxIndexService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'rox-index',
      name: 'ROX Index',
      description: 'High-flow nasal cannula monitoring adjunct',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Roca O, et al. ROX index to predict outcome of high-flow nasal cannula in pneumonia and acute hypoxemic respiratory failure cohorts.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'spo2Pct',
        type: 'number',
        required: true,
        description: 'SpO2 (%)',
        validation: { min: 50, max: 100 },
      },
      {
        name: 'fio2Pct',
        type: 'number',
        required: true,
        description: 'FiO2 (%, 21-100)',
        validation: { min: 21, max: 100 },
      },
      {
        name: 'respiratoryRate',
        type: 'number',
        required: true,
        description: 'Respiratory rate (breaths/min)',
        validation: { min: 4, max: 80 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const spo2Pct = Number(parameters.spo2Pct);
    const fio2Pct = Number(parameters.fio2Pct);
    const respiratoryRate = Number(parameters.respiratoryRate);

    if (!inRange(spo2Pct, 50, 100)) errors.push('spo2Pct must be between 50 and 100');
    if (!inRange(fio2Pct, 21, 100)) errors.push('fio2Pct must be between 21 and 100');
    if (!inRange(respiratoryRate, 4, 80)) errors.push('respiratoryRate must be between 4 and 80');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating ROX index with parameters: ${JSON.stringify(parameters)}`);

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

    const spo2Pct = Number(parameters.spo2Pct);
    const fio2Pct = Number(parameters.fio2Pct);
    const respiratoryRate = Number(parameters.respiratoryRate);

    const rox = spo2Pct / (fio2Pct / 100) / respiratoryRate;
    const riskBand = rox >= 4.88 ? 'reassuring' : rox >= 3.85 ? 'indeterminate' : 'concerning';

    return {
      success: true,
      data: {
        roxIndex: Number(rox.toFixed(2)),
        riskBand,
        severity:
          riskBand === 'concerning'
            ? 'critical'
            : riskBand === 'indeterminate'
              ? 'warning'
              : 'normal',
        label: BAND_LABEL[riskBand],
      },
      interpretation:
        'ROX index is commonly used as a high-flow nasal cannula monitoring adjunct. Use serial trends and bedside assessment; a single value is not a disposition decision.',
      citations: [
        {
          title: 'ROX Index',
          reference:
            'Roca O, et al. ROX index to predict outcome of high-flow nasal cannula in pneumonia and acute hypoxemic respiratory failure cohorts.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} Does not determine intubation, NIV, ICU admission, or oxygen device changes.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { spo2Pct: 95, fio2Pct: 40, respiratoryRate: 22 };
  }
}
