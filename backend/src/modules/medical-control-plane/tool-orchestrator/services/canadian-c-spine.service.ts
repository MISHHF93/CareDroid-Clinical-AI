/**
 * Canadian C-Spine Rule (CCR) Calculator Service
 *
 * Imaging decision support in alert, stable blunt trauma. Ported from
 * `src/utils/canadianCSpineCalculator.ts` (same 3-tier branch logic:
 * high-risk factors -> low-risk criteria -> range-of-motion check).
 *
 * Reference: Stiell IG, et al. JAMA. 2001;286(15):1841-1848.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const HIGH_RISK_KEYS = ['age65OrOlder', 'dangerousMechanism', 'paresthesiasInExtremities'] as const;
const LOW_RISK_KEYS = [
  'simpleRearEndMvc',
  'sittingInEd',
  'ambulatoryAtAnyTime',
  'delayedNeckPainOnset',
  'noMidlineCervicalTenderness',
  'noDistractingPainfulInjury',
] as const;

const SAFETY_DISCLAIMER =
  'The Canadian C-Spine Rule supports imaging decisions in alert, stable blunt trauma patients. It does not clear the cervical spine, does not rule out clinically important injury with certainty, and must not be applied to unstable patients. Do not delay primary trauma survey, resuscitation, or urgently indicated imaging to complete this assessment.';

const BRANCH_INTERPRETATION: Record<string, string> = {
  'high-risk':
    'At least one high-risk factor is present — cervical spine imaging is indicated by the Canadian C-Spine Rule.',
  'not-all-low-risk':
    'Not all low-risk criteria are met — cervical spine imaging is indicated by the Canadian C-Spine Rule.',
  'rom-fail':
    'All low-risk criteria are met but the patient cannot actively rotate the neck 45 degrees left and right — imaging is indicated by the rule.',
  'rom-pass':
    'All low-risk criteria are met and active rotation 45 degrees left and right is possible — imaging is not indicated by the Canadian C-Spine Rule (continue clinical assessment per local protocol).',
};

@Injectable()
export class CanadianCSpineService implements ClinicalToolService {
  private readonly logger = new Logger(CanadianCSpineService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'canadian-c-spine',
      name: 'Canadian C-Spine Rule',
      description: 'Cervical spine imaging decision support in alert, stable blunt trauma patients',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Stiell IG, et al. The Canadian C-spine rule for radiography in alert and stable trauma patients. JAMA. 2001;286(15):1841-1848.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    const highRisk: ToolParameter[] = HIGH_RISK_KEYS.map((key) => ({
      name: key,
      type: 'boolean',
      required: false,
      description: `High-risk factor: ${key}`,
    }));
    const lowRisk: ToolParameter[] = LOW_RISK_KEYS.map((key) => ({
      name: key,
      type: 'boolean',
      required: false,
      description: `Low-risk criterion: ${key}`,
    }));
    return [
      ...highRisk,
      ...lowRisk,
      {
        name: 'activeRotationLeft45',
        type: 'boolean',
        required: false,
        description: 'Can actively rotate neck 45 degrees left',
      },
      {
        name: 'activeRotationRight45',
        type: 'boolean',
        required: false,
        description: 'Can actively rotate neck 45 degrees right',
      },
    ];
  }

  validate(_parameters: Record<string, any>): ToolValidationResult {
    // All inputs are optional booleans (absent = false) — no required-field
    // validation beyond the contract-level type checks the orchestrator
    // already performs.
    return { valid: true, errors: [], warnings: [] };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(
      `Evaluating Canadian C-Spine Rule with parameters: ${JSON.stringify(parameters)}`,
    );

    const highRiskFactors: Record<string, boolean> = {};
    for (const key of HIGH_RISK_KEYS) highRiskFactors[key] = Boolean(parameters[key]);
    const anyHighRisk = HIGH_RISK_KEYS.some((key) => highRiskFactors[key]);

    const lowRiskFactors: Record<string, boolean> = {};
    for (const key of LOW_RISK_KEYS) lowRiskFactors[key] = Boolean(parameters[key]);
    const allLowRisk = LOW_RISK_KEYS.every((key) => lowRiskFactors[key]);

    let branch: string;
    let imagingIndicatedByRule: boolean;
    let romAssessed = false;

    if (anyHighRisk) {
      branch = 'high-risk';
      imagingIndicatedByRule = true;
    } else if (!allLowRisk) {
      branch = 'not-all-low-risk';
      imagingIndicatedByRule = true;
    } else {
      const romPass =
        Boolean(parameters.activeRotationLeft45) && Boolean(parameters.activeRotationRight45);
      branch = romPass ? 'rom-pass' : 'rom-fail';
      imagingIndicatedByRule = !romPass;
      romAssessed = true;
    }

    return {
      success: true,
      data: {
        imagingIndicatedByRule,
        branch,
        romAssessed,
        highRiskFactors,
        lowRiskFactors,
      },
      interpretation: BRANCH_INTERPRETATION[branch],
      citations: [
        {
          title: 'Canadian C-Spine Rule — Original Publication',
          reference: 'Stiell IG, et al. JAMA. 2001;286(15):1841-1848.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/11597285/',
        },
      ],
      warnings: [],
      disclaimer: SAFETY_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      age65OrOlder: false,
      dangerousMechanism: false,
      paresthesiasInExtremities: false,
      simpleRearEndMvc: true,
      sittingInEd: true,
      ambulatoryAtAnyTime: true,
      delayedNeckPainOnset: true,
      noMidlineCervicalTenderness: true,
      noDistractingPainfulInjury: true,
      activeRotationLeft45: true,
      activeRotationRight45: true,
    };
  }
}
