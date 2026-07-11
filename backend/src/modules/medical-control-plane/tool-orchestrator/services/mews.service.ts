/**
 * Modified Early Warning Score (MEWS) Calculator Service
 *
 * Ported from `src/utils/emergencyCriticalCareCalculators.ts`
 * (`computeMewsBreakdown` + `sumMewsScore` + `interpretMewsScore`), same
 * per-parameter point bands and total-score risk categories.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const CRITICAL_CARE_SAFETY_DISCLAIMER =
  'Clinical decision support only. Follow local early-warning, sepsis, and deterioration-escalation pathways; do not delay urgent evaluation to complete this tool.';

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function interpretMewsScore(score: number) {
  if (score >= 5) {
    return {
      riskCategory: 'high',
      severity: 'critical' as const,
      label: 'High MEWS range',
      interpretation:
        'MEWS >=5 is commonly treated as a high early-warning range requiring urgent clinical review per local escalation policy.',
    };
  }
  if (score >= 3) {
    return {
      riskCategory: 'medium',
      severity: 'warning' as const,
      label: 'Moderate MEWS range',
      interpretation:
        'MEWS 3-4 suggests increased deterioration concern and should prompt reassessment and escalation according to local policy.',
    };
  }
  return {
    riskCategory: 'low',
    severity: 'normal' as const,
    label: 'Lower MEWS range',
    interpretation:
      'MEWS 0-2 is a lower early-warning range, but trend and clinical context remain essential.',
  };
}

@Injectable()
export class MewsService implements ClinicalToolService {
  private readonly logger = new Logger(MewsService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'mews',
      name: 'Modified Early Warning Score (MEWS)',
      description: 'Bedside early-warning score for clinical deterioration',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: ['Subbe CP, et al. QJM. 2001;94(10):521-526.'],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'respiratoryRate',
        type: 'number',
        required: true,
        description: 'Respiratory rate (breaths/min)',
        validation: { min: 0, max: 80 },
      },
      {
        name: 'heartRate',
        type: 'number',
        required: true,
        description: 'Heart rate (bpm)',
        validation: { min: 20, max: 250 },
      },
      {
        name: 'systolicBp',
        type: 'number',
        required: true,
        description: 'Systolic blood pressure (mmHg)',
        validation: { min: 40, max: 300 },
      },
      {
        name: 'temperature',
        type: 'number',
        required: true,
        description: 'Temperature (C)',
        validation: { min: 30, max: 43 },
      },
      {
        name: 'avpu',
        type: 'number',
        required: true,
        description: 'AVPU consciousness level points: 0=Alert, 1=Voice, 2=Pain, 3=Unresponsive',
        validation: { min: 0, max: 3 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const respiratoryRate = Number(parameters.respiratoryRate);
    const heartRate = Number(parameters.heartRate);
    const systolicBp = Number(parameters.systolicBp);
    const temperature = Number(parameters.temperature);
    const avpu = Number(parameters.avpu);

    if (!inRange(respiratoryRate, 0, 80)) errors.push('respiratoryRate must be between 0 and 80');
    if (!inRange(heartRate, 20, 250)) errors.push('heartRate must be between 20 and 250');
    if (!inRange(systolicBp, 40, 300)) errors.push('systolicBp must be between 40 and 300');
    if (!inRange(temperature, 30, 43)) errors.push('temperature must be between 30 and 43');
    if (!inRange(avpu, 0, 3)) errors.push('avpu must be one of 0, 1, 2, 3');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating MEWS with parameters: ${JSON.stringify(parameters)}`);

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

    const rr = Number(parameters.respiratoryRate);
    const hr = Number(parameters.heartRate);
    const sbp = Number(parameters.systolicBp);
    const temp = Number(parameters.temperature);
    const avpu = Number(parameters.avpu);

    const breakdown = {
      respiratoryRate: rr <= 8 || rr >= 30 ? 3 : rr >= 21 ? 2 : rr >= 15 ? 1 : 0,
      heartRate: hr <= 40 || hr >= 130 ? 3 : hr >= 111 ? 2 : hr <= 50 || hr >= 101 ? 1 : 0,
      systolicBp: sbp <= 70 ? 3 : sbp <= 80 || sbp >= 200 ? 2 : sbp <= 100 ? 1 : 0,
      temperature: temp < 35 || temp >= 38.5 ? 2 : 0,
      avpu,
    };
    const totalScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    const risk = interpretMewsScore(totalScore);

    return {
      success: true,
      data: {
        totalScore,
        breakdown,
        riskCategory: risk.riskCategory,
        severity: risk.severity,
        label: risk.label,
      },
      interpretation: risk.interpretation,
      citations: [{ title: 'MEWS', reference: 'Subbe CP, et al. QJM. 2001;94(10):521-526.' }],
      warnings: [
        ...validation.warnings,
        'MEWS does not diagnose sepsis, shock, respiratory failure, or any specific condition.',
        'Single abnormal vital signs may still require urgent action even if total score is lower.',
      ],
      disclaimer: `${CRITICAL_CARE_SAFETY_DISCLAIMER} A low MEWS does not rule out serious illness or impending deterioration.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { respiratoryRate: 22, heartRate: 115, systolicBp: 95, temperature: 38.7, avpu: 1 };
  }
}
