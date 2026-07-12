/**
 * FOUR Score Calculator Service
 *
 * Ported from `src/utils/neurologyCalculators.ts` (`computeFourScore`), same
 * eye/motor/brainstem/respiration component point tables.
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

const COMPONENT_KEYS = ['eye', 'motor', 'brainstem', 'respiration'] as const;
const VALID_POINTS = ['0', '1', '2', '3', '4'];

@Injectable()
export class FourScoreService implements ClinicalToolService {
  private readonly logger = new Logger(FourScoreService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'four-score',
      name: 'FOUR Score',
      description: 'Full Outline of UnResponsiveness coma scale',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Wijdicks EFM, et al. Validation of a new coma scale: The FOUR score. Ann Neurol. 2005.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return COMPONENT_KEYS.map((name) => ({
      name,
      type: 'string' as const,
      required: true,
      description: `${name} component score (0-4)`,
      validation: { options: VALID_POINTS },
    }));
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const key of COMPONENT_KEYS) {
      if (!VALID_POINTS.includes(String(parameters[key]))) {
        errors.push(`Select ${key}.`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating FOUR score with parameters: ${JSON.stringify(parameters)}`);

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

    const eye = Number(parameters.eye);
    const motor = Number(parameters.motor);
    const brainstem = Number(parameters.brainstem);
    const respiration = Number(parameters.respiration);
    const score = eye + motor + brainstem + respiration;
    const severity = score <= 8 ? 'critical' : score <= 12 ? 'warning' : 'normal';

    return {
      success: true,
      data: {
        score,
        label: `FOUR score ${score}/16`,
        severity,
        components: { eye, motor, brainstem, respiration },
      },
      interpretation:
        'FOUR Score documents eye, motor, brainstem reflex, and respiratory pattern findings. Lower scores require urgent bedside context, airway review, and neurocritical-care judgment.',
      citations: [
        {
          title: 'FOUR Score',
          reference:
            'Wijdicks EFM, et al. Validation of a new coma scale: The FOUR score. Ann Neurol. 2005.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: NEUROLOGY_SAFETY_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { eye: '4', motor: '4', brainstem: '4', respiration: '4' };
  }
}
