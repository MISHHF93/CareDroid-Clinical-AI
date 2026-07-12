/**
 * PECARN Pediatric Head Injury/CT Decision Rule Service
 *
 * Ported from `src/utils/pecarnHeadCalculator.ts` (`evaluatePecarnHead` +
 * `interpretPecarnHead`), same age-stratified criteria sets.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const PECARN_HEAD_DISCLAIMER =
  'Informational pediatric head injury decision support only. Does not recommend for or against head CT, observation, or discharge. Rule outputs do not override clinical judgment, shared decision-making, or institutional trauma protocols.';
const REFERENCE_LINE =
  'Kuppermann N, et al. Identification of children at very low risk of clinically important brain injuries after head trauma: a prospective cohort study. Lancet. 2009;374(9696):1160-1170.';

@Injectable()
export class PecarnHeadService implements ClinicalToolService {
  private readonly logger = new Logger(PecarnHeadService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'pecarn-head',
      name: 'PECARN Pediatric Head Injury Rule',
      description:
        'Age-stratified risk criteria for clinically important pediatric traumatic brain injury',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [REFERENCE_LINE],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'ageCategory',
        type: 'string',
        required: true,
        description: 'Age category',
        validation: { options: ['under_2', 'two_plus'] },
      },
      {
        name: 'alteredMentalStatus',
        type: 'boolean',
        required: false,
        description: 'GCS <15 or altered mental status',
      },
      {
        name: 'lossOfConsciousness',
        type: 'boolean',
        required: false,
        description: 'Loss of consciousness (under_2 cohort only)',
      },
      {
        name: 'vomiting',
        type: 'boolean',
        required: false,
        description: 'Vomiting (two_plus cohort only)',
      },
      {
        name: 'severeMechanism',
        type: 'boolean',
        required: false,
        description: 'Severe or worsening mechanism of injury',
      },
      {
        name: 'skullFractureSigns',
        type: 'boolean',
        required: false,
        description: 'Palpable/basilar skull fracture signs',
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!['under_2', 'two_plus'].includes(parameters.ageCategory)) {
      errors.push('ageCategory must be "under_2" or "two_plus"');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Evaluating PECARN head rule with parameters: ${JSON.stringify(parameters)}`);

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

    const ageCategory = parameters.ageCategory as 'under_2' | 'two_plus';
    const alteredMentalStatus = Boolean(parameters.alteredMentalStatus);
    const lossOfConsciousness = Boolean(parameters.lossOfConsciousness);
    const vomiting = Boolean(parameters.vomiting);
    const severeMechanism = Boolean(parameters.severeMechanism);
    const skullFractureSigns = Boolean(parameters.skullFractureSigns);

    const triggeredCriteria: string[] = [];

    if (alteredMentalStatus) {
      triggeredCriteria.push('GCS <15 or altered mental status');
    }

    if (ageCategory === 'under_2') {
      if (skullFractureSigns) triggeredCriteria.push('Palpable skull fracture');
      if (severeMechanism) triggeredCriteria.push('Severe or worsening mechanism of injury');
      if (lossOfConsciousness) {
        triggeredCriteria.push('Loss of consciousness (>5 seconds in PECARN <2 years cohort)');
      }
    } else {
      if (skullFractureSigns) triggeredCriteria.push('Signs of basilar skull fracture');
      if (vomiting) triggeredCriteria.push('Vomiting');
      if (severeMechanism) triggeredCriteria.push('Severe or worsening mechanism of injury');
    }

    const ruleCriteriaMet = triggeredCriteria.length > 0;
    const riskStratum = ruleCriteriaMet ? 'higher' : 'lower';
    const ageLabel = ageCategory === 'under_2' ? '<2 years' : '>=2 years';

    const interpretation = ruleCriteriaMet
      ? `For the ${ageLabel} PECARN age group, one or more rule criteria are present (${triggeredCriteria.join('; ')}). In the derivation cohort, such patients were not in the very-low-risk group for clinically important traumatic brain injury. This is informational stratification only -- it does not direct CT, observation, or discharge.`
      : `For the ${ageLabel} PECARN age group, none of the assessed rule criteria are present. In validation, this stratum had a low rate of clinically important TBI, but the miss rate is not zero. Continue clinical assessment per local pediatric trauma protocols.`;

    return {
      success: true,
      data: {
        ageCategory,
        ruleCriteriaMet,
        riskStratum,
        triggeredCriteria,
        riskStratumLabel: ruleCriteriaMet
          ? 'Higher-risk stratum (PECARN criteria present)'
          : 'Lower-risk stratum (no PECARN criteria in this assessment)',
        severity: ruleCriteriaMet ? 'warning' : 'normal',
      },
      interpretation,
      citations: [{ title: 'PECARN Head Injury Rule', reference: REFERENCE_LINE }],
      warnings: validation.warnings,
      disclaimer: PECARN_HEAD_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      ageCategory: 'two_plus',
      alteredMentalStatus: false,
      vomiting: false,
      severeMechanism: false,
      skullFractureSigns: false,
    };
  }
}
