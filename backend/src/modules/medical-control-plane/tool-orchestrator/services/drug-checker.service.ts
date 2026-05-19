/**
 * Drug Interaction Checker Service
 *
 * Checks for clinically significant drug-drug interactions.
 * Uses AI service with medical knowledge base.
 *
 * Note: In production, integrate with DailyMed, First Databank, or Lexicomp API
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

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'contraindicated' | 'major' | 'moderate' | 'minor';
  mechanism: string;
  clinicalSignificance: string;
  management: string;
}

@Injectable()
export class DrugCheckerService implements ClinicalToolService {
  private readonly logger = new Logger(DrugCheckerService.name);

  constructor(private readonly aiService: AIService) {}

  getMetadata(): ToolMetadata {
    return {
      id: 'drug-interactions',
      name: 'Drug Interaction Checker',
      description:
        'Identifies clinically significant drug-drug interactions and provides management recommendations',
      category: 'checker',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'FDA Drug Interactions Database',
        'Micromedex Drug Interactions',
        'Clinical Pharmacology powered by First Databank',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'medications',
        type: 'array',
        required: true,
        description: 'List of medication names (generic or brand)',
      },
      {
        name: 'severityFilter',
        type: 'string',
        required: false,
        description: 'Filter by severity level',
        validation: {
          options: ['all', 'contraindicated', 'major', 'moderate', 'minor'],
        },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!parameters.medications) {
      errors.push('medications parameter is required');
    } else if (!Array.isArray(parameters.medications)) {
      errors.push('medications must be an array');
    } else if (parameters.medications.length < 2) {
      errors.push('At least 2 medications are required to check interactions');
    } else if (parameters.medications.length > 20) {
      warnings.push(
        'Checking more than 20 medications may take longer and could miss interactions',
      );
    }

    if (parameters.severityFilter) {
      const validSeverities = ['all', 'contraindicated', 'major', 'moderate', 'minor'];
      if (!validSeverities.includes(parameters.severityFilter)) {
        errors.push(`severityFilter must be one of: ${validSeverities.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Checking drug interactions for: ${parameters.medications?.join(', ')}`);

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

    const medications = parameters.medications as string[];
    const severityFilter = parameters.severityFilter || 'all';

    // Check for known high-risk interactions first (rule-based)
    const knownInteractions = this.checkKnownInteractions(medications);

    // Use AI for comprehensive analysis
    let aiInteractions: DrugInteraction[] = [];
    try {
      aiInteractions = await this.checkWithAI(medications);
    } catch (error) {
      this.logger.warn(
        `AI interaction check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Merge results
    const allInteractions = [...knownInteractions, ...aiInteractions];

    // Filter by severity
    const filteredInteractions =
      severityFilter === 'all'
        ? allInteractions
        : allInteractions.filter((i) => i.severity === severityFilter);

    // Group by severity
    const groupedBySeverity = {
      contraindicated: filteredInteractions.filter((i) => i.severity === 'contraindicated'),
      major: filteredInteractions.filter((i) => i.severity === 'major'),
      moderate: filteredInteractions.filter((i) => i.severity === 'moderate'),
      minor: filteredInteractions.filter((i) => i.severity === 'minor'),
    };

    const interpretation = this.generateInterpretation(groupedBySeverity, medications.length);

    return {
      success: true,
      data: {
        medicationsChecked: medications,
        totalInteractions: filteredInteractions.length,
        interactionsBySeverity: {
          contraindicated: groupedBySeverity.contraindicated.length,
          major: groupedBySeverity.major.length,
          moderate: groupedBySeverity.moderate.length,
          minor: groupedBySeverity.minor.length,
        },
        interactions: filteredInteractions,
        groupedBySeverity,
      },
      interpretation,
      citations: [
        {
          title: 'FDA Drug Interactions',
          reference: 'U.S. Food and Drug Administration',
          url: 'https://www.fda.gov/drugs/drug-interactions-labeling',
        },
      ],
      warnings: validation.warnings,
      disclaimer:
        'Educational decision support only. Does not recommend specific doses or starting, stopping, or switching medications. Verify with clinical pharmacology resources and qualified clinician judgment.',
      timestamp: new Date(),
    };
  }

  private checkKnownInteractions(medications: string[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    const medSet = new Set(medications.map((m) => m.toLowerCase()));

    // High-risk interactions database (sample)
    const knownPairs: Record<string, DrugInteraction> = {
      'warfarin-aspirin': {
        drug1: 'Warfarin',
        drug2: 'Aspirin',
        severity: 'major',
        mechanism: 'Additive antiplatelet effects and gastric mucosal injury',
        clinicalSignificance: 'Significantly increased risk of bleeding, especially GI bleeding',
        management:
          'Monitor INR closely. Consider PPI for GI protection. Use lowest effective aspirin dose.',
      },
      'warfarin-nsaid': {
        drug1: 'Warfarin',
        drug2: 'NSAID',
        severity: 'major',
        mechanism:
          'Increased anticoagulant effect via protein displacement and platelet inhibition',
        clinicalSignificance: 'Increased bleeding risk by 2-3 fold',
        management:
          'Avoid concurrent use if possible. If necessary, monitor INR closely and consider PPI.',
      },
      'metformin-contrast': {
        drug1: 'Metformin',
        drug2: 'IV Contrast',
        severity: 'major',
        mechanism: 'Contrast-induced nephropathy can lead to metformin accumulation',
        clinicalSignificance: 'Risk of lactic acidosis in setting of renal dysfunction',
        management:
          'Hold metformin 48 hours before and after IV contrast. Check renal function before resuming.',
      },
      'ssri-tramadol': {
        drug1: 'SSRI',
        drug2: 'Tramadol',
        severity: 'major',
        mechanism: 'Both increase serotonin levels',
        clinicalSignificance:
          'Risk of serotonin syndrome (confusion, agitation, tachycardia, hyperthermia)',
        management:
          'Avoid combination. Use alternative analgesic. Monitor for serotonin syndrome if unavoidable.',
      },
      'acei-spironolactone': {
        drug1: 'ACE Inhibitor',
        drug2: 'Spironolactone',
        severity: 'major',
        mechanism: 'Additive effects on potassium retention',
        clinicalSignificance: 'Risk of life-threatening hyperkalemia',
        management:
          'Monitor potassium levels closely. Consider lower doses. Watch for EKG changes.',
      },
    };

    // Check for known pairs
    for (const [key, interaction] of Object.entries(knownPairs)) {
      const [drug1, drug2] = key.split('-');
      if (medSet.has(drug1) && medSet.has(drug2)) {
        interactions.push(interaction);
      }
    }

    return interactions;
  }

  private async checkWithAI(medications: string[]): Promise<DrugInteraction[]> {
    const prompt = `As a clinical pharmacologist, identify significant drug-drug interactions for the following medications:

${medications.map((m, i) => `${i + 1}. ${m}`).join('\n')}

For each clinically significant interaction, provide:
1. The two drugs involved
2. Severity (contraindicated, major, moderate, or minor)
3. Mechanism of interaction
4. Clinical significance
5. Management recommendations

Focus on interactions that require dose adjustment, monitoring, or contraindicate concurrent use.

Respond in JSON format as an array of interactions.`;

    try {
      const result = await this.aiService.generateStructuredJSON('system', prompt, {
        interactions: [
          {
            drug1: 'string',
            drug2: 'string',
            severity: 'string',
            mechanism: 'string',
            clinicalSignificance: 'string',
            management: 'string',
          },
        ],
      });

      return result.interactions || [];
    } catch (error) {
      this.logger.error(
        `AI interaction analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private generateInterpretation(
    grouped: Record<string, DrugInteraction[]>,
    totalMeds: number,
  ): string {
    const contraindicated = grouped.contraindicated.length;
    const major = grouped.major.length;
    const moderate = grouped.moderate.length;
    const minor = grouped.minor.length;

    if (contraindicated > 0) {
      return `🚨 **${contraindicated} CONTRAINDICATED interaction(s)** detected. Immediate medication review required. These combinations should be avoided.${major > 0 ? ` Additionally, ${major} major interaction(s) found requiring close monitoring.` : ''}`;
    } else if (major > 0) {
      return `⚠️ **${major} major interaction(s)** detected. These require dose adjustment, close monitoring, or consideration of alternative medications.${moderate > 0 ? ` ${moderate} moderate interaction(s) also identified.` : ''}`;
    } else if (moderate > 0) {
      return `${moderate} moderate interaction(s) detected. Monitor for interaction effects and consider patient-specific risk factors. ${minor > 0 ? `${minor} minor interaction(s) noted.` : ''}`;
    } else if (minor > 0) {
      return `${minor} minor interaction(s) detected. Generally well-tolerated but be aware of potential effects.`;
    } else {
      return `No significant drug interactions detected among the ${totalMeds} medications checked. Continue to monitor for adverse effects with any medication combination.`;
    }
  }

  getExample(): Record<string, any> {
    return {
      medications: ['Warfarin', 'Aspirin', 'Metoprolol', 'Lisinopril', 'Atorvastatin'],
      severityFilter: 'all',
    };
  }
}
