/**
 * Wells DVT (Deep Vein Thrombosis) Calculator Service
 *
 * Nine-criteria clinical prediction rule for pre-test probability of lower
 * extremity DVT, dichotomized at the modern 2-point cutoff used alongside
 * D-dimer testing in most current pathways.
 *
 * Reference: Wells PS, et al. Lancet. 1997;350(9094):1795-1798;
 * Wells PS, et al. N Engl J Med. 2003;349(13):1227-1235.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const WELLS_DVT_CRITERIA = [
  {
    key: 'activeCancer',
    points: 1,
    description: 'Active cancer (treatment within 6 months or palliative)',
  },
  {
    key: 'paralysisParesisImmobilization',
    points: 1,
    description: 'Paralysis, paresis, or recent plaster immobilization of the lower extremities',
  },
  {
    key: 'recentlyBedriddenOrSurgery',
    points: 1,
    description:
      'Recently bedridden >=3 days, or major surgery within 12 weeks requiring general/regional anesthesia',
  },
  {
    key: 'localizedTenderness',
    points: 1,
    description: 'Localized tenderness along the distribution of the deep venous system',
  },
  { key: 'entireLegSwollen', points: 1, description: 'Entire leg swollen' },
  {
    key: 'calfSwellingOver3cm',
    points: 1,
    description:
      'Calf swelling >=3cm larger than the asymptomatic side (measured 10cm below tibial tuberosity)',
  },
  {
    key: 'pittingEdema',
    points: 1,
    description: 'Pitting edema confined to the symptomatic leg',
  },
  {
    key: 'collateralSuperficialVeins',
    points: 1,
    description: 'Collateral superficial (non-varicose) veins',
  },
  { key: 'previousDvt', points: 1, description: 'Previously documented DVT' },
  {
    key: 'alternativeDiagnosisAsLikely',
    points: -2,
    description: 'An alternative diagnosis is at least as likely as DVT',
  },
] as const;

const DIAGNOSTIC_DISCLAIMER =
  'This score estimates pre-test clinical probability only. It does not rule in or rule out deep vein thrombosis and must not replace compression ultrasound, D-dimer, or institutional DVT pathways when indicated.';

function interpretWellsDvt(score: number) {
  if (score >= 2) {
    return {
      probabilityBand: 'DVT likely',
      interpretation:
        'A score of 2 or more is associated with a higher pre-test probability of DVT in validation cohorts. Compression ultrasound (with or without D-dimer per local pathway) is typically the next step -- this tool does not mandate a specific test or treatment.',
    };
  }
  return {
    probabilityBand: 'DVT unlikely',
    interpretation:
      'A score of 1 or less is associated with lower pre-test probability in validation studies. Many pathways pair this band with a D-dimer to help decide whether imaging can be safely deferred; DVT can still be present, so continue clinical correlation.',
  };
}

@Injectable()
export class WellsDvtService implements ClinicalToolService {
  private readonly logger = new Logger(WellsDvtService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'wells-dvt-calculator',
      name: 'Wells Score for Deep Vein Thrombosis',
      description:
        'Nine-criteria clinical prediction rule for deep vein thrombosis pre-test probability',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Wells PS, Anderson DR, Bormanis J, et al. Value of assessment of pretest probability of deep-vein thrombosis in clinical management. Lancet. 1997;350(9094):1795-1798.',
        'Wells PS, Anderson DR, Rodger M, et al. Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis. N Engl J Med. 2003;349(13):1227-1235.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return WELLS_DVT_CRITERIA.map((c) => ({
      name: c.key,
      type: 'boolean',
      required: true,
      description: `${c.description} (${c.points > 0 ? '+' : ''}${c.points} point${Math.abs(c.points) === 1 ? '' : 's'} if present)`,
    }));
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const c of WELLS_DVT_CRITERIA) {
      if (typeof parameters[c.key] !== 'boolean') {
        errors.push(`${c.key} must be a boolean`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating Wells DVT score with parameters: ${JSON.stringify(parameters)}`);

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

    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const c of WELLS_DVT_CRITERIA) {
      const points = parameters[c.key] ? c.points : 0;
      breakdown[c.key] = points;
      total += points;
    }
    const score = total;

    const { probabilityBand, interpretation } = interpretWellsDvt(score);

    return {
      success: true,
      data: { score, breakdown, probabilityBand },
      interpretation,
      citations: [
        {
          title: 'Wells DVT — Original Derivation',
          reference:
            'Wells PS, et al. Value of assessment of pretest probability of deep-vein thrombosis in clinical management. Lancet. 1997;350(9094):1795-1798.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/9422759/',
        },
        {
          title: 'Wells DVT — D-dimer Pathway Validation',
          reference: 'Wells PS, et al. N Engl J Med. 2003;349(13):1227-1235.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/14507948/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: DIAGNOSTIC_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      activeCancer: false,
      paralysisParesisImmobilization: false,
      recentlyBedriddenOrSurgery: true,
      localizedTenderness: true,
      entireLegSwollen: false,
      calfSwellingOver3cm: false,
      pittingEdema: false,
      collateralSuperficialVeins: false,
      previousDvt: false,
      alternativeDiagnosisAsLikely: false,
    };
  }
}
