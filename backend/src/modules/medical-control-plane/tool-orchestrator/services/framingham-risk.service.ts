/**
 * Framingham 10-Year Hard CHD Risk Calculator Service (ATP III point tables)
 *
 * Ported from `src/utils/framinghamRiskCalculator.ts` — same point tables
 * (age, total cholesterol, HDL, SBP, smoking) and risk-from-points lookup.
 *
 * Reference: Wilson PWF, et al. Circulation. 1998;97(18):1837-1847.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const MIN_AGE = 30;
const MAX_AGE = 74;

const RISK_FROM_POINTS: Record<'female' | 'male', Array<{ maxPoints: number; riskPct: number }>> = {
  female: [
    { maxPoints: 8, riskPct: 1 },
    { maxPoints: 12, riskPct: 1 },
    { maxPoints: 13, riskPct: 2 },
    { maxPoints: 14, riskPct: 2 },
    { maxPoints: 15, riskPct: 3 },
    { maxPoints: 16, riskPct: 4 },
    { maxPoints: 17, riskPct: 5 },
    { maxPoints: 18, riskPct: 6 },
    { maxPoints: 19, riskPct: 8 },
    { maxPoints: 20, riskPct: 11 },
    { maxPoints: 21, riskPct: 14 },
    { maxPoints: 22, riskPct: 17 },
    { maxPoints: 23, riskPct: 22 },
    { maxPoints: 24, riskPct: 27 },
    { maxPoints: 99, riskPct: 30 },
  ],
  male: [
    { maxPoints: 4, riskPct: 1 },
    { maxPoints: 5, riskPct: 2 },
    { maxPoints: 6, riskPct: 2 },
    { maxPoints: 7, riskPct: 3 },
    { maxPoints: 8, riskPct: 4 },
    { maxPoints: 9, riskPct: 5 },
    { maxPoints: 10, riskPct: 6 },
    { maxPoints: 11, riskPct: 8 },
    { maxPoints: 12, riskPct: 10 },
    { maxPoints: 13, riskPct: 12 },
    { maxPoints: 14, riskPct: 16 },
    { maxPoints: 15, riskPct: 20 },
    { maxPoints: 16, riskPct: 25 },
    { maxPoints: 99, riskPct: 30 },
  ],
};

function agePoints(age: number, sex: 'male' | 'female'): number {
  if (sex === 'female') {
    if (age <= 39) return 0;
    if (age <= 44) return 3;
    if (age <= 49) return 6;
    if (age <= 54) return 8;
    if (age <= 59) return 10;
    if (age <= 64) return 12;
    if (age <= 69) return 14;
    return 16;
  }
  if (age <= 39) return 0;
  if (age <= 44) return 2;
  if (age <= 49) return 5;
  if (age <= 54) return 6;
  if (age <= 59) return 8;
  if (age <= 64) return 10;
  if (age <= 69) return 11;
  return 13;
}

function totalCholPoints(tc: number, sex: 'male' | 'female'): number {
  if (sex === 'female') {
    if (tc < 160) return 0;
    if (tc <= 199) return 1;
    if (tc <= 239) return 3;
    if (tc <= 279) return 4;
    return 5;
  }
  if (tc < 160) return 0;
  if (tc <= 199) return 1;
  if (tc <= 239) return 2;
  if (tc <= 279) return 3;
  return 4;
}

function hdlPoints(hdl: number): number {
  if (hdl >= 60) return -1;
  if (hdl >= 50) return 0;
  if (hdl >= 40) return 1;
  return 2;
}

function sbpPoints(sbp: number, treated: boolean, sex: 'male' | 'female'): number {
  if (sex === 'female') {
    if (sbp < 120) return treated ? 1 : 0;
    if (sbp <= 129) return treated ? 3 : 1;
    if (sbp <= 139) return treated ? 4 : 2;
    if (sbp <= 159) return treated ? 5 : 3;
    return treated ? 7 : 4;
  }
  if (sbp < 120) return 0;
  if (sbp <= 129) return treated ? 1 : 0;
  if (sbp <= 139) return treated ? 2 : 1;
  if (sbp <= 159) return treated ? 2 : 1;
  return treated ? 3 : 2;
}

function riskFromTotalPoints(points: number, sex: 'male' | 'female'): number {
  const table = RISK_FROM_POINTS[sex];
  for (const row of table) {
    if (points <= row.maxPoints) return row.riskPct;
  }
  return 30;
}

const DISCLAIMER =
  'Framingham hard CHD risk (not full ASCVD PCE). Does not recommend lipid-lowering or antihypertensive therapy — use ACC/AHA guidelines and shared decision-making.';

function interpretFramingham(tenYearRiskPct: number) {
  if (tenYearRiskPct >= 20) {
    return {
      riskBand: '>= 20% 10-year hard CHD risk',
      interpretation:
        '10-year hard CHD risk >=20% in ATP III framing — high-risk category for prevention discussion per historical guidelines.',
    };
  }
  if (tenYearRiskPct >= 10) {
    return {
      riskBand: '10-19% 10-year hard CHD risk',
      interpretation:
        'Intermediate risk band — intensify risk-factor modification discussion per clinician judgment and current guidelines.',
    };
  }
  return {
    riskBand: '< 10% 10-year hard CHD risk',
    interpretation:
      'Lower 10-year hard CHD risk in Framingham point tables — continue lifestyle counselling and periodic reassessment.',
  };
}

@Injectable()
export class FraminghamRiskService implements ClinicalToolService {
  private readonly logger = new Logger(FraminghamRiskService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'framingham-risk',
      name: 'Framingham 10-Year Hard CHD Risk',
      description: 'ATP III point-based 10-year hard coronary heart disease risk estimate',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Wilson PWF, et al. Prediction of coronary heart disease using risk factor categories. Circulation. 1998;97(18):1837-1847.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'ageYears',
        type: 'number',
        required: true,
        description: `Age (years, ${MIN_AGE}-${MAX_AGE})`,
        validation: { min: MIN_AGE, max: MAX_AGE },
      },
      {
        name: 'sex',
        type: 'string',
        required: true,
        description: 'Biological sex',
        validation: { options: ['male', 'female'] },
      },
      {
        name: 'totalCholesterolMgDl',
        type: 'number',
        required: true,
        description: 'Total cholesterol (mg/dL)',
        validation: { min: 100, max: 400 },
      },
      {
        name: 'hdlCholesterolMgDl',
        type: 'number',
        required: true,
        description: 'HDL cholesterol (mg/dL)',
        validation: { min: 20, max: 120 },
      },
      {
        name: 'systolicBpMmHg',
        type: 'number',
        required: true,
        description: 'Systolic blood pressure (mmHg)',
        validation: { min: 80, max: 250 },
      },
      {
        name: 'onHypertensionTreatment',
        type: 'boolean',
        required: false,
        description: 'On antihypertensive treatment',
      },
      { name: 'smoker', type: 'boolean', required: false, description: 'Current smoker' },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const age = Number(parameters.ageYears);
    if (!Number.isFinite(age) || age < MIN_AGE || age > MAX_AGE) {
      errors.push(`ageYears must be ${MIN_AGE}-${MAX_AGE} for this Framingham table`);
    }
    if (parameters.sex !== 'male' && parameters.sex !== 'female')
      errors.push("sex must be 'male' or 'female'");

    const tc = Number(parameters.totalCholesterolMgDl);
    if (!Number.isFinite(tc) || tc < 100 || tc > 400)
      errors.push('totalCholesterolMgDl must be between 100 and 400');

    const hdl = Number(parameters.hdlCholesterolMgDl);
    if (!Number.isFinite(hdl) || hdl < 20 || hdl > 120)
      errors.push('hdlCholesterolMgDl must be between 20 and 120');

    const sbp = Number(parameters.systolicBpMmHg);
    if (!Number.isFinite(sbp) || sbp < 80 || sbp > 250)
      errors.push('systolicBpMmHg must be between 80 and 250');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating Framingham risk with parameters: ${JSON.stringify(parameters)}`);

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
    const sex: 'male' | 'female' = parameters.sex;
    const totalCholesterolMgDl = Number(parameters.totalCholesterolMgDl);
    const hdlCholesterolMgDl = Number(parameters.hdlCholesterolMgDl);
    const systolicBpMmHg = Number(parameters.systolicBpMmHg);
    const onHypertensionTreatment = Boolean(parameters.onHypertensionTreatment);
    const smoker = Boolean(parameters.smoker);

    const breakdown = {
      age: agePoints(ageYears, sex),
      totalCholesterol: totalCholPoints(totalCholesterolMgDl, sex),
      hdl: hdlPoints(hdlCholesterolMgDl),
      systolicBp: sbpPoints(systolicBpMmHg, onHypertensionTreatment, sex),
      smoking: smoker ? 2 : 0,
    };

    const totalPoints =
      breakdown.age +
      breakdown.totalCholesterol +
      breakdown.hdl +
      breakdown.systolicBp +
      breakdown.smoking;
    const tenYearRiskPct = riskFromTotalPoints(totalPoints, sex);
    const risk = interpretFramingham(tenYearRiskPct);

    return {
      success: true,
      data: { totalPoints, breakdown, tenYearRiskPct, riskBand: risk.riskBand },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'Framingham Risk Score — Original Publication',
          reference: 'Wilson PWF, et al. Circulation. 1998;97(18):1837-1847.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/9603539/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      ageYears: 55,
      sex: 'male',
      totalCholesterolMgDl: 213,
      hdlCholesterolMgDl: 50,
      systolicBpMmHg: 130,
      onHypertensionTreatment: false,
      smoker: false,
    };
  }
}
