/**
 * NEXUS C-Spine Rule Calculator Service
 *
 * Cervical spine imaging decision support in blunt trauma. Ported from
 * `src/utils/nexusCSpineCalculator.ts` (same 5-criterion low-risk rule).
 *
 * Reference: Hoffman JR, et al. N Engl J Med. 2000;343(2):94-99.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const NEXUS_CSPINE_DISCLAIMER =
  'Trauma imaging decision support only. Does not clear the cervical spine, rule out injury with certainty, or mandate or defer radiography. Does not override clinician judgment or institutional trauma protocols.';

@Injectable()
export class NexusCSpineService implements ClinicalToolService {
  private readonly logger = new Logger(NexusCSpineService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'nexus-cspine',
      name: 'NEXUS C-Spine Rule',
      description:
        'Cervical spine imaging decision support in blunt trauma using 5 low-risk criteria',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Hoffman JR, et al. Validity of a set of clinical criteria to rule out injury to the cervical spine in patients with blunt trauma. N Engl J Med. 2000;343(2):94-99.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'midlineTenderness',
        type: 'boolean',
        required: false,
        description: 'Midline cervical spine tenderness',
      },
      {
        name: 'intoxication',
        type: 'boolean',
        required: false,
        description: 'Evidence of intoxication affecting reliable examination',
      },
      {
        name: 'neurologicDeficit',
        type: 'boolean',
        required: false,
        description: 'Focal neurologic deficit on examination',
      },
      {
        name: 'distractingInjury',
        type: 'boolean',
        required: false,
        description: 'Clinically significant distracting painful injury',
      },
      {
        name: 'normalAlertness',
        type: 'boolean',
        required: false,
        description: 'Normal level of alertness',
      },
    ];
  }

  validate(_parameters: Record<string, any>): ToolValidationResult {
    return { valid: true, errors: [], warnings: [] };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Evaluating NEXUS C-Spine Rule with parameters: ${JSON.stringify(parameters)}`);

    const midlineTenderness = Boolean(parameters.midlineTenderness);
    const intoxication = Boolean(parameters.intoxication);
    const neurologicDeficit = Boolean(parameters.neurologicDeficit);
    const distractingInjury = Boolean(parameters.distractingInjury);
    const normalAlertness = Boolean(parameters.normalAlertness);

    const triggeredCriteria: string[] = [];
    if (midlineTenderness) triggeredCriteria.push('Midline cervical spine tenderness');
    if (intoxication) triggeredCriteria.push('Intoxication');
    if (neurologicDeficit) triggeredCriteria.push('Focal neurologic deficit');
    if (distractingInjury) triggeredCriteria.push('Distracting painful injury');
    if (!normalAlertness) triggeredCriteria.push('Altered alertness');

    const imagingIndicatedByRule = triggeredCriteria.length > 0;
    const lowRiskByRule = !imagingIndicatedByRule;

    const interpretation = imagingIndicatedByRule
      ? `One or more NEXUS criteria are present (${triggeredCriteria.join('; ')}). In the derivation cohort, cervical spine imaging was obtained when criteria were not all absent. This is informational imaging decision support only — it does not direct radiography, CT, or clearance.`
      : 'All five NEXUS criteria are absent in this assessment — the patient meets the low-risk stratum in the validated rule. This does not clear the cervical spine or exclude injury with absolute certainty. Continue clinical judgment and local trauma protocols.';

    return {
      success: true,
      data: {
        midlineTenderness,
        intoxication,
        neurologicDeficit,
        distractingInjury,
        normalAlertness,
        imagingIndicatedByRule,
        lowRiskByRule,
        triggeredCriteria,
      },
      interpretation,
      citations: [
        {
          title: 'NEXUS C-Spine Rule — Original Publication',
          reference: 'Hoffman JR, et al. N Engl J Med. 2000;343(2):94-99.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/10891516/',
        },
      ],
      warnings: [],
      disclaimer: NEXUS_CSPINE_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      midlineTenderness: false,
      intoxication: false,
      neurologicDeficit: false,
      distractingInjury: false,
      normalAlertness: true,
    };
  }
}
