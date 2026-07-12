/**
 * Hunt-Hess Scale Calculator Service
 *
 * Ported from `src/utils/neurologyCalculators.ts` (`computeHuntHessScale`),
 * same grade-to-severity mapping.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const NEUROLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Do not delay emergency stroke activation, neuroimaging, seizure care, airway support, neurosurgical consultation, or local urgent-care pathways to complete this tool.';

const GRADE_LABELS: Readonly<Record<string, string>> = {
  '1': 'Grade I: asymptomatic or mild headache/nuchal rigidity',
  '2': 'Grade II: moderate-severe headache, nuchal rigidity, no deficit except cranial nerve palsy',
  '3': 'Grade III: drowsiness, confusion, or mild focal deficit',
  '4': 'Grade IV: stupor, moderate-severe hemiparesis, early decerebrate rigidity',
  '5': 'Grade V: deep coma, decerebrate rigidity, moribund appearance',
};

@Injectable()
export class HuntHessScaleService implements ClinicalToolService {
  private readonly logger = new Logger(HuntHessScaleService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'hunt-hess-scale',
      name: 'Hunt-Hess Scale',
      description: 'Clinical severity grading for aneurysmal subarachnoid hemorrhage',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Hunt WE, Hess RM. Surgical risk as related to time of intervention in the repair of intracranial aneurysms. J Neurosurg. 1968.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'grade',
        type: 'string',
        required: true,
        description: 'Hunt-Hess clinical grade (1-5)',
        validation: { options: ['1', '2', '3', '4', '5'] },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Object.prototype.hasOwnProperty.call(GRADE_LABELS, String(parameters.grade))) {
      errors.push('grade must be one of 1, 2, 3, 4, 5');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating Hunt-Hess scale with parameters: ${JSON.stringify(parameters)}`);

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

    const grade = Number(parameters.grade);
    const severity = grade >= 4 ? 'critical' : grade === 3 ? 'warning' : 'normal';

    return {
      success: true,
      data: { grade, label: `Hunt-Hess grade ${grade}`, severity },
      interpretation:
        'Hunt-Hess summarizes clinical severity in aneurysmal subarachnoid hemorrhage. Use with aneurysm status, neurologic exam, airway/hemodynamics, hydrocephalus, and neurosurgical pathway context.',
      citations: [
        {
          title: 'Hunt-Hess Scale',
          reference:
            'Hunt WE, Hess RM. Surgical risk as related to time of intervention in the repair of intracranial aneurysms. J Neurosurg. 1968.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: NEUROLOGY_SAFETY_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { grade: '3' };
  }
}
