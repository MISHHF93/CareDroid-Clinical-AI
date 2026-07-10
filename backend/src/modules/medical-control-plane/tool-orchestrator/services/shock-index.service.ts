/**
 * Shock Index Calculator Service
 *
 * Shock index = heart rate / systolic blood pressure. Ported from
 * `src/utils/nextWaveCalculatorUtils.ts` (same thresholds/interpretation).
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const SHOCK_INDEX_DISCLAIMER =
  'Hemodynamic screening support only. Does not diagnose shock, determine resuscitation strategy, or replace urgent escalation for unstable patients.';

function interpretShockIndex(value: number) {
  if (value >= 1) {
    return {
      riskCategory: 'critical',
      severity: 'critical',
      label: 'Markedly elevated shock index',
      interpretation:
        'Shock index is 1.0 or higher. Treat this as a hemodynamic warning sign and correlate immediately with perfusion, bleeding/sepsis risk, and local escalation pathways.',
    };
  }
  if (value >= 0.9) {
    return {
      riskCategory: 'elevated',
      severity: 'warning',
      label: 'Elevated shock index',
      interpretation:
        'Shock index is elevated. Review trend, perfusion, volume status, medication effects, and clinical context.',
    };
  }
  return {
    riskCategory: 'not_elevated',
    severity: 'normal',
    label: 'Shock index not elevated',
    interpretation:
      'Shock index is not elevated by common adult screening thresholds. Continue to interpret alongside the full clinical picture.',
  };
}

@Injectable()
export class ShockIndexService implements ClinicalToolService {
  private readonly logger = new Logger(ShockIndexService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'shock-index',
      name: 'Shock Index',
      description:
        'Heart rate divided by systolic blood pressure, a simple hemodynamic screening ratio',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: ['Shock index = heart rate / systolic blood pressure.'],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'heartRate',
        type: 'number',
        required: true,
        description: 'Heart rate (beats/min)',
        validation: { min: 1, max: 300 },
      },
      {
        name: 'systolicBp',
        type: 'number',
        required: true,
        description: 'Systolic blood pressure (mmHg)',
        validation: { min: 1, max: 300 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hr = Number(parameters.heartRate);
    const sbp = Number(parameters.systolicBp);

    if (!Number.isFinite(hr) || hr <= 0) {
      errors.push('heartRate must be a positive number');
    }
    if (!Number.isFinite(sbp) || sbp <= 0) {
      errors.push('systolicBp must be a positive number');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating shock index with parameters: ${JSON.stringify(parameters)}`);

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

    const hr = Number(parameters.heartRate);
    const sbp = Number(parameters.systolicBp);
    const index = Number((hr / sbp).toFixed(2));
    const risk = interpretShockIndex(index);

    return {
      success: true,
      data: { index, riskCategory: risk.riskCategory, label: risk.label },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'Shock Index',
          reference: 'Shock index = heart rate / systolic blood pressure.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: SHOCK_INDEX_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { heartRate: 110, systolicBp: 100 };
  }
}
