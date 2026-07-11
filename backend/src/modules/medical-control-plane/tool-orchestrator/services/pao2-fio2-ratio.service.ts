/**
 * PaO2/FiO2 Ratio Calculator Service
 *
 * Ported from `src/utils/pulmonologyCalculators.ts` (`computePao2Fio2Ratio`),
 * same Berlin Definition ARDS oxygenation thresholds.
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
  severe: 'Severe oxygenation impairment threshold',
  moderate: 'Moderate oxygenation impairment threshold',
  mild: 'Mild oxygenation impairment threshold',
  above_ards_threshold: 'Above ARDS oxygenation threshold',
};

function severityForBand(band: string): 'critical' | 'warning' | 'normal' {
  if (band === 'severe') return 'critical';
  if (band === 'moderate' || band === 'mild') return 'warning';
  return 'normal';
}

@Injectable()
export class Pao2Fio2RatioService implements ClinicalToolService {
  private readonly logger = new Logger(Pao2Fio2RatioService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'pao2-fio2-ratio',
      name: 'PaO2/FiO2 Ratio',
      description: 'Oxygenation ratio against Berlin Definition ARDS thresholds',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Berlin Definition of ARDS oxygenation thresholds: mild 201-300, moderate 101-200, severe <=100 with PEEP/CPAP requirements.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'pao2MmHg',
        type: 'number',
        required: true,
        description: 'PaO2 (mmHg)',
        validation: { min: 20, max: 700 },
      },
      {
        name: 'fio2Pct',
        type: 'number',
        required: true,
        description: 'FiO2 (%, 21-100)',
        validation: { min: 21, max: 100 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const pao2MmHg = Number(parameters.pao2MmHg);
    const fio2Pct = Number(parameters.fio2Pct);

    if (!inRange(pao2MmHg, 20, 700)) errors.push('pao2MmHg must be between 20 and 700');
    if (!inRange(fio2Pct, 21, 100)) errors.push('fio2Pct must be between 21 and 100');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating PaO2/FiO2 ratio with parameters: ${JSON.stringify(parameters)}`);

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

    const pao2MmHg = Number(parameters.pao2MmHg);
    const fio2Pct = Number(parameters.fio2Pct);

    const ratio = pao2MmHg / (fio2Pct / 100);
    const riskBand =
      ratio <= 100
        ? 'severe'
        : ratio <= 200
          ? 'moderate'
          : ratio <= 300
            ? 'mild'
            : 'above_ards_threshold';

    return {
      success: true,
      data: {
        ratio: Number(ratio.toFixed(0)),
        riskBand,
        severity: severityForBand(riskBand),
        label: BAND_LABEL[riskBand],
      },
      interpretation:
        'PaO2/FiO2 ratio summarizes oxygenation relative to inspired oxygen. ARDS diagnosis requires timing, imaging, origin of edema, and PEEP/CPAP context, not this ratio alone.',
      citations: [
        {
          title: 'Berlin Definition of ARDS',
          reference:
            'Oxygenation thresholds: mild 201-300, moderate 101-200, severe <=100 with PEEP/CPAP requirements.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} Does not diagnose ARDS or recommend ventilator settings or escalation.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { pao2MmHg: 90, fio2Pct: 40 };
  }
}
