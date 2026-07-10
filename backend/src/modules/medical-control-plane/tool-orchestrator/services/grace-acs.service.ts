/**
 * GRACE 2.0 ACS Admission Risk Calculator Service
 *
 * Ported from `src/utils/graceAcsCalculator.ts` — same logistic-regression
 * coefficients for the in-hospital and 6-month mortality admission models.
 *
 * Reference: Fox KAA, et al.; GRACE Investigators. BMJ. 2006;332:1091-1100.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const GRACE_MODEL_VERSION = '2.0-admission-logistic';

const KILLIP_NUMERIC: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

const IN_HOSPITAL = {
  intercept: -4.3602,
  age: 0.0529,
  heartRate: 0.0053,
  systolicBp: -0.0147,
  creatinine: 0.2144,
  killip: 0.632,
  cardiacArrest: 1.386,
  stDeviation: 0.389,
  elevatedEnzymes: 0.833,
};

const SIX_MONTH = {
  intercept: -7.7035,
  age: 0.0531,
  heartRate: 0.0087,
  systolicBp: -0.0168,
  creatinine: 0.1823,
  killip: 0.6931,
  cardiacArrest: 1.4586,
  stDeviation: 0.47,
  elevatedEnzymes: 0.8755,
};

function logisticProbability(xb: number): number {
  const expXb = Math.exp(xb);
  return expXb / (1 + expXb);
}

function buildLinearPredictor(inputs: Record<string, any>, model: typeof IN_HOSPITAL): number {
  const killip = KILLIP_NUMERIC[inputs.killipClass];
  const ca = inputs.cardiacArrestAtAdmission ? 1 : 0;
  const st = inputs.stSegmentDeviation ? 1 : 0;
  const enzymes = inputs.elevatedCardiacEnzymes ? 1 : 0;

  return (
    model.intercept +
    model.age * inputs.ageYears +
    model.heartRate * inputs.heartRateBpm +
    model.systolicBp * inputs.systolicBpMmHg +
    model.creatinine * inputs.creatinineMgDl +
    model.killip * killip +
    model.cardiacArrest * ca +
    model.stDeviation * st +
    model.elevatedEnzymes * enzymes
  );
}

function categorizeSixMonthMortalityPct(pct: number): string {
  if (pct < 3) return 'low';
  if (pct <= 8) return 'intermediate';
  return 'high';
}

const SAFETY_DISCLAIMER =
  'GRACE ACS risk stratification supports prognosis discussion in suspected or confirmed ACS. It does not confirm or exclude acute coronary syndrome, does not replace serial ECGs, biomarkers, or imaging, and must not be used alone to withhold or initiate reperfusion, antithrombotic therapy, or invasive strategy. Apply local ACS pathways and clinician judgment.';

@Injectable()
export class GraceAcsService implements ClinicalToolService {
  private readonly logger = new Logger(GraceAcsService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'grace-acs',
      name: 'GRACE ACS Risk Score',
      description: 'GRACE 2.0 admission logistic models for in-hospital and 6-month ACS mortality',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Fox KAA, et al.; GRACE Investigators. Prediction of risk of death and myocardial infarction in the six months after presentation with acute coronary syndrome. BMJ. 2006;332:1091-1100.',
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
        validation: { min: 18, max: 120 },
      },
      {
        name: 'heartRateBpm',
        type: 'number',
        required: true,
        description: 'Heart rate (beats/min)',
        validation: { min: 20, max: 300 },
      },
      {
        name: 'systolicBpMmHg',
        type: 'number',
        required: true,
        description: 'Systolic blood pressure (mmHg)',
        validation: { min: 50, max: 300 },
      },
      {
        name: 'creatinineMgDl',
        type: 'number',
        required: true,
        description: 'Serum creatinine (mg/dL)',
        validation: { min: 0.1, max: 25 },
      },
      {
        name: 'killipClass',
        type: 'string',
        required: true,
        description: 'Killip class',
        validation: { options: ['I', 'II', 'III', 'IV'] },
      },
      {
        name: 'cardiacArrestAtAdmission',
        type: 'boolean',
        required: false,
        description: 'Cardiac arrest at admission',
      },
      {
        name: 'stSegmentDeviation',
        type: 'boolean',
        required: false,
        description: 'ST-segment deviation present',
      },
      {
        name: 'elevatedCardiacEnzymes',
        type: 'boolean',
        required: false,
        description: 'Elevated cardiac enzymes',
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const ageYears = Number(parameters.ageYears);
    if (!Number.isFinite(ageYears) || ageYears < 18 || ageYears > 120)
      errors.push('ageYears must be between 18 and 120');

    const heartRateBpm = Number(parameters.heartRateBpm);
    if (!Number.isFinite(heartRateBpm) || heartRateBpm < 20 || heartRateBpm > 300)
      errors.push('heartRateBpm must be between 20 and 300');

    const systolicBpMmHg = Number(parameters.systolicBpMmHg);
    if (!Number.isFinite(systolicBpMmHg) || systolicBpMmHg < 50 || systolicBpMmHg > 300)
      errors.push('systolicBpMmHg must be between 50 and 300');

    const creatinineMgDl = Number(parameters.creatinineMgDl);
    if (!Number.isFinite(creatinineMgDl) || creatinineMgDl <= 0 || creatinineMgDl > 25)
      errors.push('creatinineMgDl must be a positive value up to 25');

    if (!KILLIP_NUMERIC[parameters.killipClass])
      errors.push('killipClass must be I, II, III, or IV');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating GRACE ACS risk with parameters: ${JSON.stringify(parameters)}`);

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

    const inputs = {
      ageYears: Number(parameters.ageYears),
      heartRateBpm: Number(parameters.heartRateBpm),
      systolicBpMmHg: Number(parameters.systolicBpMmHg),
      creatinineMgDl: Number(parameters.creatinineMgDl),
      killipClass: parameters.killipClass,
      cardiacArrestAtAdmission: Boolean(parameters.cardiacArrestAtAdmission),
      stSegmentDeviation: Boolean(parameters.stSegmentDeviation),
      elevatedCardiacEnzymes: Boolean(parameters.elevatedCardiacEnzymes),
    };

    const inHospitalMortalityPct =
      logisticProbability(buildLinearPredictor(inputs, IN_HOSPITAL)) * 100;
    const sixMonthMortalityPct = logisticProbability(buildLinearPredictor(inputs, SIX_MONTH)) * 100;
    const sixMonthRiskCategory = categorizeSixMonthMortalityPct(sixMonthMortalityPct);

    const categoryLabel =
      sixMonthRiskCategory === 'low'
        ? 'Low estimated risk (6-month mortality < 3%)'
        : sixMonthRiskCategory === 'intermediate'
          ? 'Intermediate estimated risk (6-month mortality 3-8%)'
          : 'High estimated risk (6-month mortality > 8%)';

    return {
      success: true,
      data: {
        modelVersion: GRACE_MODEL_VERSION,
        inHospitalMortalityPct: Number(inHospitalMortalityPct.toFixed(1)),
        sixMonthMortalityPct: Number(sixMonthMortalityPct.toFixed(1)),
        sixMonthRiskCategory,
      },
      interpretation: `Estimated in-hospital mortality ~${inHospitalMortalityPct.toFixed(1)}%; estimated mortality from discharge to 6 months ~${sixMonthMortalityPct.toFixed(1)}% (${categoryLabel.toLowerCase()}). These are population-derived GRACE ACS prognostic estimates for shared decision-making and documentation — not a diagnosis and not a treatment directive.`,
      citations: [
        {
          title: 'GRACE / GRACE 2.0 — Global Registry of Acute Coronary Events',
          reference: 'Fox KAA, et al.; GRACE Investigators. BMJ. 2006;332:1091-1100.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/16554501/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: SAFETY_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      ageYears: 65,
      heartRateBpm: 90,
      systolicBpMmHg: 130,
      creatinineMgDl: 1.1,
      killipClass: 'I',
      cardiacArrestAtAdmission: false,
      stSegmentDeviation: true,
      elevatedCardiacEnzymes: true,
    };
  }
}
