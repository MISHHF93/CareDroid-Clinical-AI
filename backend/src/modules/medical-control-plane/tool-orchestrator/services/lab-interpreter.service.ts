/**
 * Lab Interpreter Service
 *
 * Interprets laboratory results and provides clinical significance.
 * Handles common lab panels: CBC, BMP, CMP, LFTs, Coags, etc.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../../../ai/ai.service';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

interface LabValue {
  name: string;
  value: number | string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'critical-high' | 'critical-low';
}

interface LabInterpretation {
  category: string;
  findings: string[];
  clinicalSignificance: string;
  suggestedActions: string[];
}

const LAB_CATEGORY_BY_NAME: Array<[string, Set<string>]> = [
  ['CBC', new Set(['wbc', 'hemoglobin', 'platelets', 'hematocrit'])],
  ['Electrolytes', new Set(['sodium', 'potassium', 'chloride', 'co2', 'calcium'])],
  ['Renal Function', new Set(['creatinine', 'bun', 'gfr'])],
  ['Liver Function', new Set(['alt', 'ast', 'alkaline phosphatase', 'bilirubin', 'albumin'])],
  ['Coagulation', new Set(['pt', 'inr', 'ptt'])],
];

@Injectable()
export class LabInterpreterService implements ClinicalToolService {
  private readonly logger = new Logger(LabInterpreterService.name);
  private readonly interpretationCacheTtlMs = 10 * 60 * 1000;
  private readonly interpretationCache = new Map<
    string,
    { value: LabInterpretation; expiresAt: number }
  >();

  constructor(private readonly aiService: AIService) {}

  getMetadata(): ToolMetadata {
    return {
      id: 'lab-interpreter',
      name: 'Lab Results Interpreter',
      description:
        'Interprets laboratory results and provides clinical significance and recommended actions',
      category: 'interpreter',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: ['Clinical Laboratory Reference Values', 'Tietz Textbook of Clinical Chemistry'],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'labValues',
        type: 'array',
        required: true,
        description: 'Array of lab values with name, value, and unit',
      },
      {
        name: 'patientAge',
        type: 'number',
        required: false,
        description: 'Patient age (for age-specific reference ranges)',
      },
      {
        name: 'patientSex',
        type: 'string',
        required: false,
        description: 'Patient sex (male/female) for sex-specific ranges',
        validation: {
          options: ['male', 'female', 'other'],
        },
      },
      {
        name: 'clinicalContext',
        type: 'string',
        required: false,
        description: 'Clinical context or reason for testing',
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!parameters.labValues) {
      errors.push('labValues parameter is required');
    } else if (!Array.isArray(parameters.labValues)) {
      errors.push('labValues must be an array');
    } else if (parameters.labValues.length === 0) {
      errors.push('At least one lab value is required');
    }

    if (parameters.patientAge !== undefined) {
      if (
        typeof parameters.patientAge !== 'number' ||
        parameters.patientAge < 0 ||
        parameters.patientAge > 120
      ) {
        errors.push('patientAge must be a number between 0 and 120');
      }
    }

    if (
      parameters.patientSex !== undefined &&
      !['male', 'female', 'other'].includes(parameters.patientSex)
    ) {
      errors.push('patientSex must be one of: male, female, other');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Interpreting lab results for ${parameters.labValues?.length || 0} values`);

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

    const rawLabValues = parameters.labValues as any[];
    const labValues: LabValue[] = [];

    // Process and classify each lab value
    for (const lab of rawLabValues) {
      const processed = this.processLabValue(lab, parameters.patientAge, parameters.patientSex);
      if (processed) {
        labValues.push(processed);
      }
    }

    // Group by category
    const grouped = this.groupLabsByCategory(labValues);

    // Generate interpretations
    const interpretations: LabInterpretation[] = [];
    for (const [category, labs] of Object.entries(grouped)) {
      const interpretation = await this.interpretCategory(
        category,
        labs,
        parameters.clinicalContext,
      );
      if (interpretation) {
        interpretations.push(interpretation);
      }
    }

    const criticalValues: LabValue[] = [];
    const summary = {
      total: labValues.length,
      normal: 0,
      abnormal: 0,
      critical: 0,
    };
    for (const lab of labValues) {
      if (lab.status === 'normal') {
        summary.normal += 1;
      } else if (lab.status === 'critical-high' || lab.status === 'critical-low') {
        summary.critical += 1;
        criticalValues.push(lab);
      } else {
        summary.abnormal += 1;
      }
    }

    // Overall interpretation
    const overallInterpretation = this.generateOverallInterpretation(
      labValues,
      criticalValues,
      interpretations,
      summary.abnormal + summary.critical,
    );

    return {
      success: true,
      data: {
        labValues,
        groupedByCategory: grouped,
        interpretations,
        criticalValues: criticalValues.length > 0 ? criticalValues : undefined,
        summary,
      },
      interpretation: overallInterpretation,
      citations: [
        {
          title: 'Clinical Laboratory Reference Values',
          reference: 'Lab Tests Online, AACC',
          url: 'https://labtestsonline.org/',
        },
      ],
      warnings: validation.warnings,
      disclaimer:
        'Lab interpretation is context-dependent. Results should be evaluated by qualified healthcare providers in conjunction with clinical presentation and patient history.',
      timestamp: new Date(),
    };
  }

  private processLabValue(lab: any, patientAge?: number, patientSex?: string): LabValue | null {
    if (!lab.name || lab.value === undefined) {
      return null;
    }

    const referenceRange = this.getReferenceRange(lab.name, patientAge, patientSex);
    const status = this.classifyLabStatus(lab.name, lab.value, referenceRange);

    return {
      name: lab.name,
      value: lab.value,
      unit: lab.unit || this.getDefaultUnit(lab.name),
      referenceRange: referenceRange.display,
      status,
    };
  }

  private getReferenceRange(
    labName: string,
    age?: number,
    sex?: string,
  ): { min?: number; max?: number; display: string; criticalLow?: number; criticalHigh?: number } {
    const name = labName.toLowerCase();

    // Common lab reference ranges (adult values)
    const ranges: Record<string, any> = {
      // CBC
      wbc: { min: 4.5, max: 11.0, display: '4.5-11.0 K/μL', criticalLow: 2.0, criticalHigh: 30.0 },
      hemoglobin:
        sex === 'male'
          ? {
              min: 13.5,
              max: 17.5,
              display: '13.5-17.5 g/dL',
              criticalLow: 7.0,
              criticalHigh: 20.0,
            }
          : {
              min: 12.0,
              max: 16.0,
              display: '12.0-16.0 g/dL',
              criticalLow: 7.0,
              criticalHigh: 20.0,
            },
      platelets: {
        min: 150,
        max: 400,
        display: '150-400 K/μL',
        criticalLow: 50,
        criticalHigh: 1000,
      },

      // BMP/CMP
      sodium: { min: 136, max: 145, display: '136-145 mEq/L', criticalLow: 120, criticalHigh: 160 },
      potassium: {
        min: 3.5,
        max: 5.0,
        display: '3.5-5.0 mEq/L',
        criticalLow: 2.5,
        criticalHigh: 6.5,
      },
      chloride: { min: 98, max: 107, display: '98-107 mEq/L', criticalLow: 80, criticalHigh: 120 },
      co2: { min: 23, max: 29, display: '23-29 mEq/L', criticalLow: 10, criticalHigh: 40 },
      glucose: {
        min: 70,
        max: 100,
        display: '70-100 mg/dL (fasting)',
        criticalLow: 40,
        criticalHigh: 500,
      },
      bun: { min: 7, max: 20, display: '7-20 mg/dL', criticalLow: 2, criticalHigh: 100 },
      creatinine:
        sex === 'male'
          ? { min: 0.7, max: 1.3, display: '0.7-1.3 mg/dL', criticalLow: 0.2, criticalHigh: 10.0 }
          : { min: 0.6, max: 1.1, display: '0.6-1.1 mg/dL', criticalLow: 0.2, criticalHigh: 10.0 },
      calcium: {
        min: 8.5,
        max: 10.5,
        display: '8.5-10.5 mg/dL',
        criticalLow: 6.5,
        criticalHigh: 13.0,
      },

      // LFTs
      alt: { min: 7, max: 56, display: '7-56 U/L', criticalLow: 0, criticalHigh: 1000 },
      ast: { min: 10, max: 40, display: '10-40 U/L', criticalLow: 0, criticalHigh: 1000 },
      'alkaline phosphatase': {
        min: 44,
        max: 147,
        display: '44-147 U/L',
        criticalLow: 0,
        criticalHigh: 1000,
      },
      bilirubin: {
        min: 0.1,
        max: 1.2,
        display: '0.1-1.2 mg/dL',
        criticalLow: 0,
        criticalHigh: 15.0,
      },
      albumin: { min: 3.5, max: 5.5, display: '3.5-5.5 g/dL', criticalLow: 2.0, criticalHigh: 6.0 },

      // Coags
      pt: { min: 11, max: 13.5, display: '11-13.5 seconds', criticalLow: 0, criticalHigh: 30 },
      inr: { min: 0.8, max: 1.2, display: '0.8-1.2', criticalLow: 0.5, criticalHigh: 5.0 },
      ptt: { min: 25, max: 35, display: '25-35 seconds', criticalLow: 0, criticalHigh: 100 },
    };

    return ranges[name] || { display: 'Reference range not available' };
  }

  private classifyLabStatus(
    labName: string,
    value: any,
    range: any,
  ): 'normal' | 'high' | 'low' | 'critical-high' | 'critical-low' {
    if (typeof value !== 'number') return 'normal';

    if (range.criticalHigh && value >= range.criticalHigh) return 'critical-high';
    if (range.criticalLow && value < range.criticalLow) return 'critical-low';
    if (range.max && value > range.max) return 'high';
    if (range.min && value < range.min) return 'low';
    return 'normal';
  }

  private getDefaultUnit(labName: string): string {
    const name = labName.toLowerCase();
    const units: Record<string, string> = {
      wbc: 'K/μL',
      hemoglobin: 'g/dL',
      platelets: 'K/μL',
      sodium: 'mEq/L',
      potassium: 'mEq/L',
      glucose: 'mg/dL',
      creatinine: 'mg/dL',
      bun: 'mg/dL',
      alt: 'U/L',
      ast: 'U/L',
    };
    return units[name] || '';
  }

  private groupLabsByCategory(labValues: LabValue[]): Record<string, LabValue[]> {
    const groups: Record<string, LabValue[]> = {
      CBC: [],
      Electrolytes: [],
      'Renal Function': [],
      'Liver Function': [],
      Coagulation: [],
      Other: [],
    };

    for (const lab of labValues) {
      const name = lab.name.toLowerCase();

      let matched = false;
      for (const [category, names] of LAB_CATEGORY_BY_NAME) {
        if (names.has(name)) {
          groups[category].push(lab);
          matched = true;
          break;
        }
      }
      if (!matched) {
        groups.Other.push(lab);
      }
    }

    // Remove empty groups
    return Object.fromEntries(Object.entries(groups).filter(([_, labs]) => labs.length > 0));
  }

  private async interpretCategory(
    category: string,
    labs: LabValue[],
    clinicalContext?: string,
  ): Promise<LabInterpretation | null> {
    const abnormalLabs = labs.filter((l) => l.status !== 'normal');

    if (abnormalLabs.length === 0) {
      return {
        category,
        findings: ['All values within normal limits'],
        clinicalSignificance: 'No significant abnormalities detected.',
        suggestedActions: [],
      };
    }

    // Use AI for detailed interpretation
    const prompt = `Interpret the following ${category} lab results:

${labs.map((l) => `- ${l.name}: ${l.value} ${l.unit} (${l.status}, ref: ${l.referenceRange})`).join('\n')}

${clinicalContext ? `Clinical context: ${clinicalContext}` : ''}

Provide:
1. Key findings
2. Clinical significance
3. Suggested actions or follow-up

Be concise and clinically relevant.`;

    const cacheKey = prompt.trim().replace(/\s+/g, ' ');
    const cached = this.interpretationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return this.cloneInterpretation(cached.value);
    }

    try {
      const result = await this.aiService.generateStructuredJSON('system', prompt, {
        findings: ['string'],
        clinicalSignificance: 'string',
        suggestedActions: ['string'],
      });

      const interpretation = {
        category,
        ...result,
      };
      this.interpretationCache.set(cacheKey, {
        value: interpretation,
        expiresAt: Date.now() + this.interpretationCacheTtlMs,
      });
      return this.cloneInterpretation(interpretation);
    } catch (_error) {
      // Fallback to rule-based interpretation
      return {
        category,
        findings: abnormalLabs.map((l) => `${l.name} is ${l.status.replace('-', ' ')}`),
        clinicalSignificance: 'Abnormal values detected. Clinical correlation recommended.',
        suggestedActions: ['Review in clinical context', 'Consider repeat testing if acute change'],
      };
    }
  }

  private generateOverallInterpretation(
    labs: LabValue[],
    criticalValues: LabValue[],
    interpretations: LabInterpretation[],
    abnormalCount: number,
  ): string {
    if (criticalValues.length > 0) {
      const criticalList = criticalValues.map((l) => `${l.name} (${l.value})`).join(', ');
      return `🚨 **CRITICAL VALUES DETECTED**: ${criticalList}. Immediate clinical review and intervention required.`;
    }

    if (abnormalCount === 0) {
      return `All ${labs.length} lab values are within normal limits. No acute abnormalities detected.`;
    }

    if (abnormalCount === labs.length) {
      return `Multiple abnormalities detected (${abnormalCount}/${labs.length} values abnormal). Review detailed interpretations by category for clinical significance.`;
    }

    return `${abnormalCount} of ${labs.length} lab values are abnormal. Review detailed interpretations for clinical significance and recommended actions.`;
  }

  private cloneInterpretation(interpretation: LabInterpretation): LabInterpretation {
    return {
      ...interpretation,
      findings: [...(interpretation.findings || [])],
      suggestedActions: [...(interpretation.suggestedActions || [])],
    };
  }

  getExample(): Record<string, any> {
    return {
      labValues: [
        { name: 'WBC', value: 15.2, unit: 'K/μL' },
        { name: 'Hemoglobin', value: 10.5, unit: 'g/dL' },
        { name: 'Sodium', value: 132, unit: 'mEq/L' },
        { name: 'Potassium', value: 5.8, unit: 'mEq/L' },
        { name: 'Creatinine', value: 2.1, unit: 'mg/dL' },
        { name: 'Glucose', value: 185, unit: 'mg/dL' },
      ],
      patientAge: 65,
      patientSex: 'male',
      clinicalContext: 'Sepsis evaluation',
    };
  }
}
