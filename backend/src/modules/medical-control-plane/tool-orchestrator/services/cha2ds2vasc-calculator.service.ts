/**
 * CHA2DS2-VASc Calculator Service (simplified) — stroke risk stratum only;
 * no anticoagulation directives.
 *
 * Ported from the frontend's inline `CHA2DS2VAScCalculator` component in
 * `src/pages/tools/Calculators.tsx` (same scoring/interpretation logic).
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

function scoreAndInterpret(parameters: Record<string, any>) {
  let score = 0;
  if (parameters.chf) score += 1;
  if (parameters.hypertension) score += 1;

  const age = Number(parameters.age);
  if (age >= 75) score += 2;
  else if (age >= 65) score += 1;

  if (parameters.diabetes) score += 1;
  if (parameters.stroke) score += 2;
  if (parameters.vascular) score += 1;
  if (parameters.sex === 'female') score += 1;

  let interpretation: string;
  let severity: string;
  let recommendation: string;

  if (score === 0) {
    interpretation = 'Low estimated stroke risk stratum (score 0)';
    severity = 'normal';
    recommendation =
      'Discuss stroke risk with guidelines and shared decision-making — this tool does not recommend for or against anticoagulation.';
  } else if (score === 1) {
    interpretation = 'Intermediate estimated stroke risk stratum (score 1)';
    severity = 'normal';
    recommendation =
      'Discuss stroke and bleeding risk with guidelines — does not direct anticoagulant initiation or cessation.';
  } else if (score === 2) {
    interpretation = 'Moderate estimated stroke risk stratum (score 2)';
    severity = 'warning';
    recommendation =
      'Higher stroke-risk stratum for discussion with guidelines — not a directive to start or stop anticoagulation.';
  } else {
    interpretation = 'High estimated stroke risk stratum (score >=3)';
    severity = 'critical';
    recommendation =
      'Higher stroke-risk stratum for discussion with guidelines and bleeding-risk assessment (e.g. HAS-BLED) — not a directive to start or stop therapy.';
  }

  return { score, interpretation, severity, recommendation };
}

@Injectable()
export class Cha2ds2VascCalculatorService implements ClinicalToolService {
  private readonly logger = new Logger(Cha2ds2VascCalculatorService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'cha2ds2vasc-calculator',
      name: 'CHA2DS2-VASc Calculator',
      description:
        'Simplified stroke risk stratification for atrial fibrillation — stroke risk stratum only, no anticoagulation directive',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Lip GY, et al. Refining clinical risk stratification for predicting stroke and thromboembolism in atrial fibrillation using a novel risk factor-based approach. Chest. 2010;137(2):263-72.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'chf',
        type: 'boolean',
        required: false,
        description: 'Congestive heart failure / LV dysfunction',
      },
      {
        name: 'hypertension',
        type: 'boolean',
        required: false,
        description: 'History of hypertension',
      },
      {
        name: 'age',
        type: 'number',
        required: true,
        description: 'Patient age in years',
        validation: { min: 0, max: 120 },
      },
      { name: 'diabetes', type: 'boolean', required: false, description: 'Diabetes mellitus' },
      {
        name: 'stroke',
        type: 'boolean',
        required: false,
        description: 'Prior stroke, TIA, or thromboembolism',
      },
      {
        name: 'vascular',
        type: 'boolean',
        required: false,
        description: 'Vascular disease (prior MI, PAD, aortic plaque)',
      },
      {
        name: 'sex',
        type: 'string',
        required: true,
        description: 'Biological sex',
        validation: { options: ['male', 'female'] },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const age = Number(parameters.age);
    if (parameters.age === undefined || parameters.age === null || !Number.isFinite(age)) {
      errors.push('age must be a valid number');
    } else if (age < 0 || age > 120) {
      warnings.push('age is outside the usual validated range (0-120)');
    }

    if (parameters.sex !== 'male' && parameters.sex !== 'female') {
      errors.push("sex must be 'male' or 'female'");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(
      `Calculating CHA2DS2-VASc score with parameters: ${JSON.stringify(parameters)}`,
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

    const { score, interpretation, severity, recommendation } = scoreAndInterpret(parameters);

    return {
      success: true,
      data: { score, severity, recommendation },
      interpretation,
      citations: [
        {
          title: 'CHA2DS2-VASc — Original Publication',
          reference: 'Lip GY, et al. Chest. 2010;137(2):263-72.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/19762550/',
        },
      ],
      warnings: validation.warnings,
      disclaimer:
        'Clinical decision support only. Stroke risk stratum only — does not recommend for or against anticoagulation.',
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      chf: false,
      hypertension: true,
      age: 68,
      diabetes: false,
      stroke: false,
      vascular: false,
      sex: 'female',
    };
  }
}
