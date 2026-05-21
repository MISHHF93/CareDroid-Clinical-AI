/**
 * SOFA Score Calculator Service
 *
 * Sequential Organ Failure Assessment (SOFA) score for ICU patients.
 * Assesses organ dysfunction across 6 systems.
 *
 * Reference: Vincent JL, et al. Intensive Care Med. 1996;22(7):707-10.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

@Injectable()
export class SofaCalculatorService implements ClinicalToolService {
  private readonly logger = new Logger(SofaCalculatorService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'sofa-calculator',
      name: 'SOFA Score Calculator',
      description:
        'Sequential Organ Failure Assessment score for evaluating organ dysfunction in ICU patients',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Vincent JL, et al. The SOFA (Sepsis-related Organ Failure Assessment) score to describe organ dysfunction/failure. Intensive Care Med. 1996;22(7):707-10.',
        'Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801-810.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'pao2',
        type: 'number',
        required: false,
        description: 'PaO2 (mmHg)',
        validation: { min: 0, max: 700 },
      },
      {
        name: 'fio2',
        type: 'number',
        required: false,
        description: 'FiO2 (fraction, 0.21-1.0)',
        validation: { min: 0.21, max: 1.0 },
      },
      {
        name: 'mechanicalVentilation',
        type: 'boolean',
        required: false,
        description: 'Patient on mechanical ventilation',
      },
      {
        name: 'platelets',
        type: 'number',
        required: false,
        description: 'Platelet count (×10³/μL)',
        validation: { min: 0, max: 1000 },
      },
      {
        name: 'bilirubin',
        type: 'number',
        required: false,
        description: 'Total bilirubin (mg/dL)',
        validation: { min: 0, max: 50 },
      },
      {
        name: 'map',
        type: 'number',
        required: false,
        description: 'Mean Arterial Pressure (mmHg)',
        validation: { min: 0, max: 200 },
      },
      {
        name: 'dopamine',
        type: 'number',
        required: false,
        description: 'Dopamine dose (μg/kg/min)',
        validation: { min: 0, max: 50 },
      },
      {
        name: 'dobutamine',
        type: 'number',
        required: false,
        description: 'Dobutamine dose (μg/kg/min)',
        validation: { min: 0, max: 50 },
      },
      {
        name: 'epinephrine',
        type: 'number',
        required: false,
        description: 'Epinephrine dose (μg/kg/min)',
        validation: { min: 0, max: 50 },
      },
      {
        name: 'norepinephrine',
        type: 'number',
        required: false,
        description: 'Norepinephrine dose (μg/kg/min)',
        validation: { min: 0, max: 50 },
      },
      {
        name: 'gcs',
        type: 'number',
        required: false,
        description: 'Glasgow Coma Scale (3-15)',
        validation: { min: 3, max: 15 },
      },
      {
        name: 'creatinine',
        type: 'number',
        required: false,
        description: 'Serum creatinine (mg/dL)',
        validation: { min: 0, max: 20 },
      },
      {
        name: 'urineOutput',
        type: 'number',
        required: false,
        description: 'Urine output (mL/day)',
        validation: { min: 0, max: 10000 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if at least one parameter is provided
    const providedParams = Object.keys(parameters).filter(
      (key) => parameters[key] !== undefined && parameters[key] !== null,
    );

    if (providedParams.length === 0) {
      warnings.push(
        'No parameters provided. SOFA score cannot be calculated without clinical data.',
      );
    }

    // Validate PaO2/FiO2 ratio parameters
    if (parameters.pao2 !== undefined && parameters.fio2 === undefined) {
      warnings.push('PaO2 provided without FiO2. Cannot calculate respiratory score.');
    }
    if (parameters.fio2 !== undefined && parameters.pao2 === undefined) {
      warnings.push('FiO2 provided without PaO2. Cannot calculate respiratory score.');
    }

    // Validate ranges
    const schema = this.getSchema();
    for (const param of schema) {
      const value = parameters[param.name];
      if (value !== undefined && value !== null) {
        if (param.type === 'number') {
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`${param.name} must be a valid number`);
          } else if (param.validation) {
            if (param.validation.min !== undefined && value < param.validation.min) {
              if (value < 0) {
                errors.push(`${param.name} must be non-negative`);
              } else {
                warnings.push(
                  `${param.name} is below the usual validated range (${param.validation.min})`,
                );
              }
            }
            if (param.validation.max !== undefined && value > param.validation.max) {
              warnings.push(
                `${param.name} is above the usual validated range (${param.validation.max})`,
              );
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating SOFA score with parameters: ${JSON.stringify(parameters)}`);

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

    // Calculate individual organ scores
    const scores = {
      respiration: this.calculateRespirationScore(parameters),
      coagulation: this.calculateCoagulationScore(parameters),
      liver: this.calculateLiverScore(parameters),
      cardiovascular: this.calculateCardiovascularScore(parameters),
      cns: this.calculateCNSScore(parameters),
      renal: this.calculateRenalScore(parameters),
    };

    const totalScore = Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);

    // Interpret the score
    const interpretation = this.interpretScore(totalScore);
    const mortality = this.estimateMortality(totalScore);

    return {
      success: true,
      data: {
        totalScore,
        respirationScore: scores.respiration,
        coagulationScore: scores.coagulation,
        liverScore: scores.liver,
        cardiovascularScore: scores.cardiovascular,
        cnsScore: scores.cns,
        renalScore: scores.renal,
        scores,
        mortality,
        mortalityEstimate: mortality,
        interpretation,
      },
      interpretation,
      citations: [
        {
          title: 'SOFA Score - Original Publication',
          reference: 'Vincent JL, et al. Intensive Care Med. 1996;22(7):707-10.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/8844239/',
        },
        {
          title: 'Sepsis-3 Definitions',
          reference: 'Singer M, et al. JAMA. 2016;315(8):801-810.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/26903338/',
        },
      ],
      warnings: validation.warnings,
      disclaimer:
        'This calculator is for educational purposes. Clinical decisions should be made by qualified healthcare providers based on complete patient assessment.',
      timestamp: new Date(),
    };
  }

  private calculateRespirationScore(params: Record<string, any>): number | null {
    if (params.pao2 === undefined || params.fio2 === undefined) {
      return null;
    }

    const pao2FiO2 = params.pao2 / params.fio2;

    if (pao2FiO2 >= 400) return 0;
    if (pao2FiO2 >= 300) return 1;
    if (pao2FiO2 >= 200) return 2;
    if (pao2FiO2 >= 100) {
      return params.mechanicalVentilation ? 3 : 3;
    }
    return 4;
  }

  private calculateCoagulationScore(params: Record<string, any>): number | null {
    if (params.platelets === undefined) return null;

    const platelets = params.platelets;
    if (platelets >= 150) return 0;
    if (platelets >= 100) return 1;
    if (platelets >= 50) return 2;
    if (platelets >= 20) return 3;
    return 4;
  }

  private calculateLiverScore(params: Record<string, any>): number | null {
    if (params.bilirubin === undefined) return null;

    const bilirubin = params.bilirubin;
    if (bilirubin < 1.2) return 0;
    if (bilirubin < 2.0) return 1;
    if (bilirubin < 6.0) return 2;
    if (bilirubin < 12.0) return 3;
    return 4;
  }

  private calculateCardiovascularScore(params: Record<string, any>): number | null {
    // Check vasopressor use first
    const hasEpi = params.epinephrine !== undefined && params.epinephrine > 0;
    const hasNorepi = params.norepinephrine !== undefined && params.norepinephrine > 0;
    const hasDopamine = params.dopamine !== undefined && params.dopamine > 0;
    const hasDobutamine = params.dobutamine !== undefined && params.dobutamine > 0;

    // High-dose vasopressors
    if (hasEpi && params.epinephrine > 0.1) return 4;
    if (hasNorepi && params.norepinephrine > 0.1) return 4;
    if (hasDopamine && params.dopamine > 15) return 4;

    // Medium-dose vasopressors
    if (hasEpi && params.epinephrine <= 0.1) return 3;
    if (hasNorepi && params.norepinephrine <= 0.1) return 3;
    if (hasDopamine && params.dopamine > 5) return 3;
    if (hasDopamine) return 2;
    if (hasDobutamine) return 2;

    // MAP-based scoring if no vasopressors
    if (params.map !== undefined) {
      const map = params.map;
      if (map >= 70) return 0;
      return 1;
    }

    return null;
  }

  private calculateCNSScore(params: Record<string, any>): number | null {
    if (params.gcs === undefined) return null;

    const gcs = params.gcs;
    if (gcs === 15) return 0;
    if (gcs >= 13) return 1;
    if (gcs >= 10) return 2;
    if (gcs >= 6) return 3;
    return 4;
  }

  private calculateRenalScore(params: Record<string, any>): number | null {
    const hasCr = params.creatinine !== undefined;
    const hasUO = params.urineOutput !== undefined;

    if (!hasCr && !hasUO) return null;

    let crScore = 0;
    let uoScore = 0;

    if (hasCr) {
      const cr = params.creatinine;
      if (cr < 1.2) crScore = 0;
      else if (cr < 2.0) crScore = 1;
      else if (cr < 3.5) crScore = 2;
      else if (cr < 5.0) crScore = 3;
      else crScore = 4;
    }

    if (hasUO) {
      const uo = params.urineOutput;
      if (uo >= 500) uoScore = 0;
      else if (uo >= 200) uoScore = 3;
      else uoScore = 4;
    }

    return Math.max(crScore, uoScore);
  }

  private interpretScore(score: number): string {
    if (score === 0) {
      return 'No organ dysfunction detected based on SOFA criteria.';
    } else if (score <= 2) {
      return `Minimal organ dysfunction (SOFA ${score}). Continue clinical monitoring and reassess with new data.`;
    } else if (score <= 6) {
      return `Mild organ dysfunction (SOFA ${score}). Monitor closely and optimize supportive care.`;
    } else if (score <= 11) {
      return `Moderate organ dysfunction (SOFA ${score}). Increased risk of mortality. Aggressive management indicated.`;
    } else if (score <= 14) {
      return `Severe organ dysfunction (SOFA ${score}). High mortality risk. Consider ICU-level care and specialist consultation.`;
    } else {
      return `Critical multi-organ dysfunction (SOFA ${score}). Very high mortality risk. Maximal intensive care support required.`;
    }
  }

  private estimateMortality(score: number): {
    percentage: string;
    category: string;
  } {
    // Based on Vincent et al. 1996 and subsequent validation studies
    if (score <= 6) {
      return { percentage: '<10%', category: 'Low' };
    } else if (score <= 9) {
      return { percentage: '15-20%', category: 'Moderate' };
    } else if (score <= 12) {
      return { percentage: '40-50%', category: 'High' };
    } else {
      return { percentage: '>50%', category: 'Very High' };
    }
  }

  getExample(): Record<string, any> {
    return {
      pao2: 150,
      fio2: 0.5,
      mechanicalVentilation: true,
      platelets: 80,
      bilirubin: 2.5,
      map: 65,
      dopamine: 8,
      gcs: 12,
      creatinine: 2.8,
      urineOutput: 350,
    };
  }
}
