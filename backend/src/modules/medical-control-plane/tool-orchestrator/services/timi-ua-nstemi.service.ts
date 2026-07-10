/**
 * TIMI Risk Score for UA/NSTEMI Calculator Service
 *
 * Ported from `src/utils/timiUaNstemiCalculator.ts` (same 7 one-point
 * criteria and risk bands).
 *
 * Reference: Antman EM, et al. JAMA. 2000;284(7):835-842.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const CRITERIA = [
  { key: 'age65OrOlder', description: 'Age >= 65 years' },
  {
    key: 'threeOrMoreCadRiskFactors',
    description:
      '>= 3 CAD risk factors (family history, hypertension, hypercholesterolemia, diabetes, current smoker)',
  },
  { key: 'knownCadStenosis50', description: 'Known CAD (prior stenosis >= 50%)' },
  { key: 'aspirinLast7Days', description: 'Aspirin use in the past 7 days' },
  { key: 'severeAngina', description: 'Severe angina (>=2 episodes in 24h, or rest angina)' },
  { key: 'stDeviation', description: 'ST-segment deviation >= 0.5mm on admission ECG' },
  { key: 'elevatedCardiacMarkers', description: 'Elevated cardiac markers (troponin or CK-MB)' },
] as const;

const ACS_DISCLAIMER =
  'For patients with suspected acute coronary syndrome (UA/NSTEMI) only — not for STEMI. This score does not confirm ACS, does not establish a diagnosis, and does not recommend antiplatelet, anticoagulant, or invasive strategy — follow institutional ACS pathways and cardiology consultation.';

function interpretTimi(score: number) {
  if (score >= 5) {
    return {
      riskBand: '5-7 points',
      approximateEventRate:
        'Approximately 26-41% 14-day death, MI, or urgent revascularisation in the original validation cohort',
      interpretation:
        'A TIMI score of 5 or more is associated with a substantially higher rate of adverse events at 14 days in the UA/NSTEMI validation study. Use for risk stratification and documentation; escalate monitoring and specialist review per local ACS protocol.',
    };
  }
  if (score >= 3) {
    return {
      riskBand: '3-4 points',
      approximateEventRate:
        'Approximately 13-20% 14-day death, MI, or urgent revascularisation in the original validation cohort',
      interpretation:
        "Scores of 3-4 fall in an intermediate-risk band in the TIMI UA/NSTEMI cohort. Interpret with serial ECGs, biomarkers, and clinical course; follow your unit's intermediate-risk ACS pathway.",
    };
  }
  return {
    riskBand: '0-2 points',
    approximateEventRate:
      'Approximately 4.7-8.3% 14-day death, MI, or urgent revascularisation in the original validation cohort',
    interpretation:
      'Scores of 0-2 are associated with comparatively lower 14-day event rates in the validation study, but adverse events still occur. Continue ACS evaluation and serial reassessment per protocol.',
  };
}

@Injectable()
export class TimiUaNstemiService implements ClinicalToolService {
  private readonly logger = new Logger(TimiUaNstemiService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'timi-ua-nstemi',
      name: 'TIMI Risk Score (UA/NSTEMI)',
      description: 'Seven-criteria risk score for unstable angina / NSTEMI',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Antman EM, Cohen M, Bernink PJ, et al. The TIMI risk score for unstable angina/non-ST elevation MI. JAMA. 2000;284(7):835-842.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return CRITERIA.map((c) => ({
      name: c.key,
      type: 'boolean',
      required: true,
      description: `${c.description} (1 point if present)`,
    }));
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const c of CRITERIA) {
      if (typeof parameters[c.key] !== 'boolean') {
        errors.push(`${c.key} must be a boolean`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(
      `Calculating TIMI UA/NSTEMI score with parameters: ${JSON.stringify(parameters)}`,
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

    let score = 0;
    const breakdown: Record<string, number> = {};
    for (const c of CRITERIA) {
      const points = parameters[c.key] ? 1 : 0;
      breakdown[c.key] = points;
      score += points;
    }

    const risk = interpretTimi(score);

    return {
      success: true,
      data: {
        score,
        breakdown,
        riskBand: risk.riskBand,
        approximateEventRate: risk.approximateEventRate,
      },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'TIMI Risk Score (UA/NSTEMI) — Original Publication',
          reference: 'Antman EM, et al. JAMA. 2000;284(7):835-842.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/10938172/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: ACS_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      age65OrOlder: false,
      threeOrMoreCadRiskFactors: true,
      knownCadStenosis50: false,
      aspirinLast7Days: true,
      severeAngina: true,
      stDeviation: false,
      elevatedCardiacMarkers: false,
    };
  }
}
