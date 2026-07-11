/**
 * Revised Trauma Score (RTS) Calculator Service
 *
 * Ported from `src/utils/emergencyCriticalCareCalculators.ts`
 * (`computeRevisedTraumaScore` + `interpretRevisedTraumaScore`), same coded
 * component tables and Champion weighting coefficients.
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
  'Clinical decision support only. Follow local trauma-system, resuscitation, and transfer protocols; do not delay urgent evaluation to complete this tool.';
const REFERENCE_LINE = 'Champion HR, et al. J Trauma. 1989;29(5):623-629.';

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function interpretRevisedTraumaScore(weighted: number) {
  if (weighted < 4) {
    return {
      riskCategory: 'critical',
      severity: 'critical' as const,
      label: 'Very low RTS',
      interpretation:
        'Weighted RTS below 4 indicates very severe physiologic derangement in trauma scoring context.',
      warning:
        'Trauma resuscitation and transfer decisions must follow local trauma-system protocols.',
    };
  }
  if (weighted < 6) {
    return {
      riskCategory: 'high',
      severity: 'critical' as const,
      label: 'Low RTS',
      interpretation:
        'Weighted RTS below 6 indicates high physiologic concern and should be interpreted with mechanism and injuries.',
      warning:
        'RTS is not a substitute for primary survey, imaging, or trauma team activation criteria.',
    };
  }
  if (weighted < 7.84) {
    return {
      riskCategory: 'moderate',
      severity: 'warning' as const,
      label: 'Reduced RTS',
      interpretation:
        'Weighted RTS is reduced from the maximum value, indicating at least one abnormal coded physiologic component.',
      warning: 'Serial reassessment is important because trauma physiology can deteriorate.',
    };
  }
  return {
    riskCategory: 'maximal',
    severity: 'normal' as const,
    label: 'Maximum RTS',
    interpretation:
      'Weighted RTS is at the maximum coded value for GCS, systolic BP, and respiratory rate.',
    warning: 'Maximum RTS does not exclude significant injury.',
  };
}

@Injectable()
export class RevisedTraumaScoreService implements ClinicalToolService {
  private readonly logger = new Logger(RevisedTraumaScoreService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'revised-trauma-score',
      name: 'Revised Trauma Score (RTS)',
      description:
        'Weighted physiologic trauma severity score from GCS, systolic BP, and respiratory rate',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [REFERENCE_LINE],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'gcs',
        type: 'number',
        required: true,
        description: 'Glasgow Coma Scale total (3-15)',
        validation: { min: 3, max: 15 },
      },
      {
        name: 'systolicBp',
        type: 'number',
        required: true,
        description: 'Systolic blood pressure (mmHg)',
        validation: { min: 0, max: 300 },
      },
      {
        name: 'respiratoryRate',
        type: 'number',
        required: true,
        description: 'Respiratory rate (breaths/min)',
        validation: { min: 0, max: 80 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const gcs = Number(parameters.gcs);
    const systolicBp = Number(parameters.systolicBp);
    const respiratoryRate = Number(parameters.respiratoryRate);

    if (!inRange(gcs, 3, 15)) errors.push('gcs must be between 3 and 15');
    if (!inRange(systolicBp, 0, 300)) errors.push('systolicBp must be between 0 and 300');
    if (!inRange(respiratoryRate, 0, 80)) errors.push('respiratoryRate must be between 0 and 80');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(
      `Calculating Revised Trauma Score with parameters: ${JSON.stringify(parameters)}`,
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

    const gcs = Number(parameters.gcs);
    const sbp = Number(parameters.systolicBp);
    const rr = Number(parameters.respiratoryRate);

    const gcsCode = gcs >= 13 ? 4 : gcs >= 9 ? 3 : gcs >= 6 ? 2 : gcs >= 4 ? 1 : 0;
    const sbpCode = sbp > 89 ? 4 : sbp >= 76 ? 3 : sbp >= 50 ? 2 : sbp >= 1 ? 1 : 0;
    const rrCode = rr >= 10 && rr <= 29 ? 4 : rr > 29 ? 3 : rr >= 6 ? 2 : rr >= 1 ? 1 : 0;
    const weighted = Number((0.9368 * gcsCode + 0.7326 * sbpCode + 0.2908 * rrCode).toFixed(4));
    const unweighted = gcsCode + sbpCode + rrCode;
    const risk = interpretRevisedTraumaScore(weighted);

    return {
      success: true,
      data: {
        weighted,
        unweighted,
        gcsCode,
        sbpCode,
        rrCode,
        riskCategory: risk.riskCategory,
        severity: risk.severity,
        label: risk.label,
      },
      interpretation: risk.interpretation,
      citations: [{ title: 'Revised Trauma Score', reference: REFERENCE_LINE }],
      warnings: [...validation.warnings, risk.warning],
      disclaimer: `${CRITICAL_CARE_SAFETY_DISCLAIMER} RTS does not replace primary/secondary survey or trauma team activation criteria.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { gcs: 15, systolicBp: 110, respiratoryRate: 18 };
  }
}
