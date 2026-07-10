/**
 * Reynolds Risk Score Calculator Service (simplified points heuristic)
 *
 * Ported from `src/utils/cardiologyRiskCalculators.ts`
 * (`computeReynoldsRiskHelper`/`interpretReynoldsRiskHelper`) — this is
 * CareDroid's own simplified points summary of Reynolds inputs, not a
 * jurisdiction-approved implementation of the original regression model
 * (the source file itself documents this distinction).
 *
 * Reference: Ridker PM, et al. JAMA. 2007;297(6):611-619; Circulation.
 * 2008;118(22):2243-2251.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const DISCLAIMER =
  'This CareDroid helper summarizes Reynolds Risk Score inputs and approximate risk category. It is not a replacement for a jurisdiction-approved Reynolds calculator and does not recommend statins, aspirin, or blood pressure therapy.';

function interpretReynolds(riskCategory: string) {
  if (riskCategory === 'high') {
    return {
      riskBand: 'High input-burden category',
      interpretation:
        'Multiple Reynolds inputs are in higher-risk ranges, including inflammatory/family-history factors when selected. Use a validated Reynolds implementation for exact percentage risk.',
    };
  }
  if (riskCategory === 'intermediate') {
    return {
      riskBand: 'Intermediate input-burden category',
      interpretation:
        'Inputs suggest an intermediate prevention-risk discussion context after CRP and family history are considered.',
    };
  }
  return {
    riskBand: 'Lower input-burden category',
    interpretation:
      'Inputs fall in a lower Reynolds helper band, though cardiovascular risk is not absent and should be reassessed over time.',
  };
}

@Injectable()
export class ReynoldsRiskScoreService implements ClinicalToolService {
  private readonly logger = new Logger(ReynoldsRiskScoreService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'reynolds-risk-score',
      name: 'Reynolds Risk Score (simplified)',
      description:
        'Simplified points-based summary of Reynolds Risk Score cardiovascular risk inputs',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Ridker PM, Buring JE, Rifai N, Cook NR. Development and validation of improved algorithms for global cardiovascular risk in women and men: the Reynolds Risk Score. JAMA. 2007;297(6):611-619.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'ageYears',
        type: 'number',
        required: true,
        description: 'Age (years, 45-80)',
        validation: { min: 45, max: 80 },
      },
      {
        name: 'sex',
        type: 'string',
        required: true,
        description: 'Biological sex',
        validation: { options: ['male', 'female'] },
      },
      {
        name: 'systolicBpMmHg',
        type: 'number',
        required: true,
        description: 'Systolic blood pressure (mmHg)',
        validation: { min: 80, max: 250 },
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
        name: 'hsCrpMgL',
        type: 'number',
        required: true,
        description: 'High-sensitivity CRP (mg/L)',
        validation: { min: 0.1, max: 50 },
      },
      { name: 'smoker', type: 'boolean', required: false, description: 'Current smoker' },
      {
        name: 'parentalMiBefore60',
        type: 'boolean',
        required: false,
        description: 'Parental MI before age 60',
      },
      { name: 'diabetes', type: 'boolean', required: false, description: 'Diabetes mellitus' },
      {
        name: 'hba1cPct',
        type: 'number',
        required: false,
        description: 'HbA1c (%), required if diabetes is true',
        validation: { min: 4, max: 15 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const age = Number(parameters.ageYears);
    if (!Number.isFinite(age) || age < 45 || age > 80)
      errors.push('ageYears must be between 45 and 80');
    if (parameters.sex !== 'male' && parameters.sex !== 'female')
      errors.push("sex must be 'male' or 'female'");

    const sbp = Number(parameters.systolicBpMmHg);
    if (!Number.isFinite(sbp) || sbp < 80 || sbp > 250)
      errors.push('systolicBpMmHg must be between 80 and 250');

    const tc = Number(parameters.totalCholesterolMgDl);
    if (!Number.isFinite(tc) || tc < 100 || tc > 400)
      errors.push('totalCholesterolMgDl must be between 100 and 400');

    const hdl = Number(parameters.hdlCholesterolMgDl);
    if (!Number.isFinite(hdl) || hdl < 20 || hdl > 120)
      errors.push('hdlCholesterolMgDl must be between 20 and 120');

    const crp = Number(parameters.hsCrpMgL);
    if (!Number.isFinite(crp) || crp < 0.1 || crp > 50)
      errors.push('hsCrpMgL must be between 0.1 and 50');

    if (parameters.diabetes) {
      const hba1c = Number(parameters.hba1cPct);
      if (!Number.isFinite(hba1c) || hba1c < 4 || hba1c > 15)
        errors.push('hba1cPct must be between 4 and 15 when diabetes is true');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(
      `Calculating Reynolds Risk Score with parameters: ${JSON.stringify(parameters)}`,
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

    const ageYears = Number(parameters.ageYears);
    const systolicBpMmHg = Number(parameters.systolicBpMmHg);
    const totalCholesterolMgDl = Number(parameters.totalCholesterolMgDl);
    const hdlCholesterolMgDl = Number(parameters.hdlCholesterolMgDl);
    const hsCrpMgL = Number(parameters.hsCrpMgL);
    const hba1cPct = parameters.diabetes ? Number(parameters.hba1cPct) : 0;
    const sex = parameters.sex;

    const points =
      (ageYears >= 65 ? 3 : ageYears >= 55 ? 2 : 1) +
      (systolicBpMmHg >= 160 ? 3 : systolicBpMmHg >= 140 ? 2 : systolicBpMmHg >= 120 ? 1 : 0) +
      (totalCholesterolMgDl / Math.max(hdlCholesterolMgDl, 1) >= 6
        ? 2
        : totalCholesterolMgDl / hdlCholesterolMgDl >= 4
          ? 1
          : 0) +
      (hsCrpMgL >= 3 ? 2 : hsCrpMgL >= 1 ? 1 : 0) +
      (parameters.smoker ? 2 : 0) +
      (parameters.parentalMiBefore60 ? 1 : 0) +
      (parameters.diabetes ? (hba1cPct >= 7 ? 2 : 1) : 0) +
      (sex === 'male' ? 1 : 0);

    const riskCategory = points >= 10 ? 'high' : points >= 6 ? 'intermediate' : 'low';
    const risk = interpretReynolds(riskCategory);

    return {
      success: true,
      data: { points, riskCategory, riskBand: risk.riskBand },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'Reynolds Risk Score — Original Publication',
          reference: 'Ridker PM, et al. JAMA. 2007;297(6):611-619.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/17299196/',
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
      sex: 'female',
      systolicBpMmHg: 130,
      totalCholesterolMgDl: 200,
      hdlCholesterolMgDl: 50,
      hsCrpMgL: 1.5,
      smoker: false,
      parentalMiBefore60: false,
      diabetes: false,
    };
  }
}
