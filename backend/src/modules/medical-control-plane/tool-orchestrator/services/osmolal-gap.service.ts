/**
 * Osmolal Gap Calculator Service
 *
 * Ported from `src/utils/nephrologyCalculators.ts` (`computeOsmolalGap`), same
 * calculated-osmolality formula and severity bands. `src/utils/endocrineMetabolicCalculators.ts`
 * has a similar but incomplete duplicate (no measured-osmolality gap) -- worth
 * consolidating on the frontend in a future pass.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const NEPHROLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Follow local nephrology, AKI, electrolyte, acid-base, dialysis, and critical-care pathways; do not delay urgent evaluation to complete this tool.';

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

@Injectable()
export class OsmolalGapService implements ClinicalToolService {
  private readonly logger = new Logger(OsmolalGapService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'osmolal-gap',
      name: 'Osmolal Gap',
      description: 'Compares measured and calculated serum osmolality',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: ['Calculated osmolality = 2 x Na + glucose/18 + BUN/2.8 + ethanol/3.7.'],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'sodium',
        type: 'number',
        required: true,
        description: 'Serum sodium (mEq/L)',
        validation: { min: 90, max: 190 },
      },
      {
        name: 'glucoseMgDl',
        type: 'number',
        required: true,
        description: 'Serum glucose (mg/dL)',
        validation: { min: 20, max: 2000 },
      },
      {
        name: 'bunMgDl',
        type: 'number',
        required: true,
        description: 'Blood urea nitrogen (mg/dL)',
        validation: { min: 1, max: 300 },
      },
      {
        name: 'measuredOsmolality',
        type: 'number',
        required: true,
        description: 'Measured serum osmolality (mOsm/kg)',
        validation: { min: 200, max: 450 },
      },
      {
        name: 'ethanolMgDl',
        type: 'number',
        required: false,
        description: 'Serum ethanol (mg/dL), defaults to 0',
        validation: { min: 0, max: 600 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const sodium = Number(parameters.sodium);
    const glucoseMgDl = Number(parameters.glucoseMgDl);
    const bunMgDl = Number(parameters.bunMgDl);
    const measuredOsmolality = Number(parameters.measuredOsmolality);
    const ethanolMgDl = parameters.ethanolMgDl !== undefined ? Number(parameters.ethanolMgDl) : 0;

    if (!inRange(sodium, 90, 190)) errors.push('sodium must be between 90 and 190');
    if (!inRange(glucoseMgDl, 20, 2000)) errors.push('glucoseMgDl must be between 20 and 2000');
    if (!inRange(bunMgDl, 1, 300)) errors.push('bunMgDl must be between 1 and 300');
    if (!inRange(measuredOsmolality, 200, 450))
      errors.push('measuredOsmolality must be between 200 and 450');
    if (!inRange(ethanolMgDl, 0, 600)) errors.push('ethanolMgDl must be between 0 and 600');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating osmolal gap with parameters: ${JSON.stringify(parameters)}`);

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

    const sodium = Number(parameters.sodium);
    const glucoseMgDl = Number(parameters.glucoseMgDl);
    const bunMgDl = Number(parameters.bunMgDl);
    const measuredOsmolality = Number(parameters.measuredOsmolality);
    const ethanolMgDl = parameters.ethanolMgDl !== undefined ? Number(parameters.ethanolMgDl) : 0;

    const calculatedOsmolality = Number(
      (2 * sodium + glucoseMgDl / 18 + bunMgDl / 2.8 + ethanolMgDl / 3.7).toFixed(1),
    );
    const osmolalGap = Number((measuredOsmolality - calculatedOsmolality).toFixed(1));
    const severity = osmolalGap > 20 ? 'critical' : osmolalGap > 10 ? 'warning' : 'normal';

    return {
      success: true,
      data: { calculatedOsmolality, osmolalGap, severity },
      interpretation:
        'Osmolal gap compares measured and calculated serum osmolality. Interpret with timing, ethanol, ketones, renal failure, shock, laboratory method, and toxicology pathway context.',
      citations: [
        {
          title: 'Osmolal Gap',
          reference: 'Calculated osmolality = 2 x Na + glucose/18 + BUN/2.8 + ethanol/3.7.',
        },
      ],
      warnings: validation.warnings,
      disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} Does not diagnose toxic alcohol ingestion or recommend antidotes, dialysis, or disposition.`,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return { sodium: 140, glucoseMgDl: 100, bunMgDl: 14, measuredOsmolality: 320 };
  }
}
