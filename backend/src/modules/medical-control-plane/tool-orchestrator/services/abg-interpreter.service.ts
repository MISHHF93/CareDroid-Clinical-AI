/**
 * Arterial Blood Gas (ABG) Interpreter Service
 *
 * Standard step-by-step ABG interpretation: primary acid-base disorder from
 * pH/PaCO2/HCO3, expected respiratory or metabolic compensation, optional
 * anion gap (when sodium and chloride are supplied), and optional P/F ratio
 * oxygenation flag (when PaO2 and FiO2 are supplied).
 *
 * Reference: Winters RW, et al. Ann N Y Acad Sci. 1965;133(1):102-124 (Winter's formula);
 * Berlin Definition ARDS: ARDS Definition Task Force. JAMA. 2012;307(23):2526-2533.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

const ABG_INTERPRETER_DISCLAIMER =
  'Informational acid-base and oxygenation interpretation only. Does not diagnose the underlying cause, recommend treatment, or replace clinical correlation with history, exam, and other labs. Always confirm with a qualified clinician before acting on this output.';

const PH_LOW = 7.35;
const PH_HIGH = 7.45;
const PACO2_LOW = 35;
const PACO2_HIGH = 45;
const HCO3_LOW = 22;
const HCO3_HIGH = 26;
const ANION_GAP_LOW = 8;
const ANION_GAP_HIGH = 12;

type PrimaryDisorder =
  | 'normal'
  | 'respiratory_acidosis'
  | 'respiratory_alkalosis'
  | 'metabolic_acidosis'
  | 'metabolic_alkalosis'
  | 'mixed_acidosis'
  | 'mixed_alkalosis'
  | 'indeterminate_compensated';

function determinePrimaryDisorder(pH: number, paco2: number, hco3: number): PrimaryDisorder {
  const acidemia = pH < PH_LOW;
  const alkalemia = pH > PH_HIGH;
  const highCo2 = paco2 > PACO2_HIGH;
  const lowCo2 = paco2 < PACO2_LOW;
  const lowHco3 = hco3 < HCO3_LOW;
  const highHco3 = hco3 > HCO3_HIGH;

  if (acidemia) {
    if (highCo2 && lowHco3) return 'mixed_acidosis';
    if (highCo2) return 'respiratory_acidosis';
    if (lowHco3) return 'metabolic_acidosis';
    return 'metabolic_acidosis';
  }
  if (alkalemia) {
    if (lowCo2 && highHco3) return 'mixed_alkalosis';
    if (lowCo2) return 'respiratory_alkalosis';
    if (highHco3) return 'metabolic_alkalosis';
    return 'metabolic_alkalosis';
  }
  if (!highCo2 && !lowCo2 && !lowHco3 && !highHco3) return 'normal';
  return 'indeterminate_compensated';
}

function describePrimaryDisorder(disorder: PrimaryDisorder): string {
  switch (disorder) {
    case 'normal':
      return 'Normal acid-base status';
    case 'respiratory_acidosis':
      return 'Primary respiratory acidosis';
    case 'respiratory_alkalosis':
      return 'Primary respiratory alkalosis';
    case 'metabolic_acidosis':
      return 'Primary metabolic acidosis';
    case 'metabolic_alkalosis':
      return 'Primary metabolic alkalosis';
    case 'mixed_acidosis':
      return 'Combined (mixed) respiratory and metabolic acidosis';
    case 'mixed_alkalosis':
      return 'Combined (mixed) respiratory and metabolic alkalosis';
    case 'indeterminate_compensated':
      return 'Normal pH with abnormal PaCO2/HCO3 — suggests a fully compensated or mixed disturbance';
  }
}

function compensationAnalysis(disorder: PrimaryDisorder, paco2: number, hco3: number) {
  if (disorder === 'metabolic_acidosis') {
    const expectedLow = 1.5 * hco3 + 8 - 2;
    const expectedHigh = 1.5 * hco3 + 8 + 2;
    const withinRange = paco2 >= expectedLow && paco2 <= expectedHigh;
    return {
      formula: "Winter's formula: expected PaCO2 = 1.5 x HCO3 + 8 (+/-2)",
      expectedRange: [round1(expectedLow), round1(expectedHigh)] as [number, number],
      actualPaco2: paco2,
      assessment: withinRange
        ? 'Respiratory compensation is appropriate for the degree of metabolic acidosis.'
        : paco2 > expectedHigh
          ? 'PaCO2 is higher than expected for pure metabolic acidosis — suggests a concurrent (mixed) respiratory acidosis or inadequate respiratory compensation.'
          : 'PaCO2 is lower than expected for pure metabolic acidosis — suggests a concurrent (mixed) respiratory alkalosis.',
    };
  }
  if (disorder === 'metabolic_alkalosis') {
    const expectedLow = 0.7 * hco3 + 20 - 5;
    const expectedHigh = 0.7 * hco3 + 20 + 5;
    const withinRange = paco2 >= expectedLow && paco2 <= expectedHigh;
    return {
      formula: 'Expected PaCO2 = 0.7 x HCO3 + 20 (+/-5)',
      expectedRange: [round1(expectedLow), round1(expectedHigh)] as [number, number],
      actualPaco2: paco2,
      assessment: withinRange
        ? 'Respiratory compensation is appropriate for the degree of metabolic alkalosis.'
        : paco2 > expectedHigh
          ? 'PaCO2 is higher than expected — suggests a concurrent (mixed) respiratory acidosis.'
          : 'PaCO2 is lower than expected — suggests a concurrent (mixed) respiratory alkalosis.',
    };
  }
  if (disorder === 'respiratory_acidosis') {
    const deltaCo2 = paco2 - 40;
    const acuteExpectedHco3 = round1(24 + 0.1 * deltaCo2);
    const chronicExpectedHco3 = round1(24 + 0.35 * deltaCo2);
    return {
      formula:
        'Acute: HCO3 rises ~1 mEq/L per 10 mmHg PaCO2 rise. Chronic: HCO3 rises ~3.5-4 mEq/L per 10 mmHg PaCO2 rise.',
      acuteExpectedHco3,
      chronicExpectedHco3,
      actualHco3: hco3,
      assessment: describeRespiratoryTiming(hco3, acuteExpectedHco3, chronicExpectedHco3),
    };
  }
  if (disorder === 'respiratory_alkalosis') {
    const deltaCo2 = 40 - paco2;
    const acuteExpectedHco3 = round1(24 - 0.2 * deltaCo2);
    const chronicExpectedHco3 = round1(24 - 0.5 * deltaCo2);
    return {
      formula:
        'Acute: HCO3 falls ~2 mEq/L per 10 mmHg PaCO2 fall. Chronic: HCO3 falls ~4-5 mEq/L per 10 mmHg PaCO2 fall.',
      acuteExpectedHco3,
      chronicExpectedHco3,
      actualHco3: hco3,
      assessment: describeRespiratoryTiming(hco3, acuteExpectedHco3, chronicExpectedHco3),
    };
  }
  return null;
}

function describeRespiratoryTiming(
  actual: number,
  acuteExpected: number,
  chronicExpected: number,
): string {
  const distToAcute = Math.abs(actual - acuteExpected);
  const distToChronic = Math.abs(actual - chronicExpected);
  if (distToAcute <= 2 && distToAcute <= distToChronic) {
    return 'HCO3 is closest to the acute-compensation estimate — consistent with an acute process (within a rough +/-2 mEq/L band; treat as a coarse estimate, not a lab result).';
  }
  if (distToChronic <= 2 && distToChronic < distToAcute) {
    return 'HCO3 is closest to the chronic-compensation estimate — consistent with a chronic process (within a rough +/-2 mEq/L band; treat as a coarse estimate, not a lab result).';
  }
  return 'HCO3 does not clearly match either the acute or chronic compensation estimate — consider a mixed or evolving process.';
}

function anionGapAnalysis(sodium?: number, chloride?: number, hco3?: number) {
  if (sodium === undefined || chloride === undefined || hco3 === undefined) return null;
  const anionGap = round1(sodium - (chloride + hco3));
  const elevated = anionGap > ANION_GAP_HIGH;
  const category = elevated
    ? 'high_anion_gap'
    : anionGap < ANION_GAP_LOW
      ? 'low_anion_gap'
      : 'normal_anion_gap';

  return {
    anionGap,
    normalRange: [ANION_GAP_LOW, ANION_GAP_HIGH] as [number, number],
    category,
    note:
      category === 'high_anion_gap'
        ? 'Elevated anion gap. Consider high-anion-gap causes (mnemonic MUDPILES: methanol, uremia, DKA, propylene glycol/paraldehyde, iron/isoniazid, lactic acidosis, ethylene glycol, salicylates) alongside history and other labs.'
        : category === 'low_anion_gap'
          ? 'Low anion gap — consider hypoalbuminemia, paraproteinemia, or lab/measurement artifact.'
          : 'Anion gap within the typical reference range — consider normal-anion-gap (hyperchloremic) causes if metabolic acidosis is present (e.g. diarrhea, renal tubular acidosis, early renal failure).',
  };
}

function oxygenationAnalysis(pao2?: number, fio2?: number) {
  if (pao2 === undefined) return null;
  if (fio2 === undefined) {
    return {
      pao2,
      hypoxemia: pao2 < 80,
      note:
        pao2 < 80
          ? 'PaO2 below 80 mmHg — consider hypoxemia (assuming room air); correlate with FiO2 and clinical context.'
          : 'PaO2 at or above 80 mmHg — no oxygenation concern from PaO2 alone (assuming room air).',
    };
  }
  const ratio = round1(pao2 / fio2);
  let band = 'normal';
  if (ratio < 100) band = 'severe';
  else if (ratio < 200) band = 'moderate';
  else if (ratio < 300) band = 'mild';

  return {
    pao2,
    fio2,
    pfRatio: ratio,
    band,
    note:
      band === 'normal'
        ? 'P/F ratio at or above 300 — no ARDS-range hypoxemia by Berlin criteria thresholds.'
        : `P/F ratio in the ${band} ARDS-range band (Berlin criteria thresholds: <300 mild, <200 moderate, <100 severe). Requires clinical correlation, not a standalone diagnosis.`,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

@Injectable()
export class AbgInterpreterService implements ClinicalToolService {
  private readonly logger = new Logger(AbgInterpreterService.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'abg-interpreter',
      name: 'Arterial Blood Gas (ABG) Interpreter',
      description:
        'Standard step-by-step acid-base interpretation from pH, PaCO2, and HCO3, with optional anion gap and oxygenation assessment',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        "Winters RW, Engel K, Dell RB. Acid-Base Physiology in Medicine. 1965; Winter's formula for expected respiratory compensation.",
        'ARDS Definition Task Force. Acute respiratory distress syndrome: the Berlin Definition. JAMA. 2012;307(23):2526-2533.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      { name: 'pH', type: 'number', required: true, description: 'Arterial pH' },
      { name: 'paco2', type: 'number', required: true, description: 'PaCO2 (mmHg)' },
      { name: 'hco3', type: 'number', required: true, description: 'Bicarbonate / HCO3 (mEq/L)' },
      {
        name: 'sodium',
        type: 'number',
        required: false,
        description: 'Serum sodium (mEq/L), for anion gap',
      },
      {
        name: 'chloride',
        type: 'number',
        required: false,
        description: 'Serum chloride (mEq/L), for anion gap',
      },
      {
        name: 'pao2',
        type: 'number',
        required: false,
        description: 'PaO2 (mmHg), for oxygenation assessment',
      },
      {
        name: 'fio2',
        type: 'number',
        required: false,
        description: 'FiO2 as a fraction (e.g. 0.21 for room air), for P/F ratio',
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const pH = Number(parameters.pH);
    const paco2 = Number(parameters.paco2);
    const hco3 = Number(parameters.hco3);

    if (!Number.isFinite(pH)) errors.push('pH must be a number');
    else if (pH < 6.8 || pH > 7.8)
      warnings.push(
        'pH is outside the typical physiologic reporting range (6.8-7.8) — verify entry.',
      );

    if (!Number.isFinite(paco2)) errors.push('paco2 must be a number');
    else if (paco2 < 10 || paco2 > 150)
      warnings.push('PaCO2 is outside the typical reporting range (10-150 mmHg) — verify entry.');

    if (!Number.isFinite(hco3)) errors.push('hco3 must be a number');
    else if (hco3 < 2 || hco3 > 60)
      warnings.push('HCO3 is outside the typical reporting range (2-60 mEq/L) — verify entry.');

    if (parameters.sodium !== undefined && !Number.isFinite(Number(parameters.sodium))) {
      errors.push('sodium must be a number when provided');
    }
    if (parameters.chloride !== undefined && !Number.isFinite(Number(parameters.chloride))) {
      errors.push('chloride must be a number when provided');
    }
    if (parameters.pao2 !== undefined && !Number.isFinite(Number(parameters.pao2))) {
      errors.push('pao2 must be a number when provided');
    }
    if (parameters.fio2 !== undefined) {
      const fio2 = Number(parameters.fio2);
      if (!Number.isFinite(fio2)) errors.push('fio2 must be a number when provided');
      else if (fio2 <= 0 || fio2 > 1)
        errors.push('fio2 must be a fraction between 0 and 1 (e.g. 0.21 for room air)');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Interpreting ABG with parameters: ${JSON.stringify(parameters)}`);

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

    const pH = Number(parameters.pH);
    const paco2 = Number(parameters.paco2);
    const hco3 = Number(parameters.hco3);
    const sodium = parameters.sodium !== undefined ? Number(parameters.sodium) : undefined;
    const chloride = parameters.chloride !== undefined ? Number(parameters.chloride) : undefined;
    const pao2 = parameters.pao2 !== undefined ? Number(parameters.pao2) : undefined;
    const fio2 = parameters.fio2 !== undefined ? Number(parameters.fio2) : undefined;

    const primaryDisorder = determinePrimaryDisorder(pH, paco2, hco3);
    const primaryDisorderLabel = describePrimaryDisorder(primaryDisorder);
    const compensation = compensationAnalysis(primaryDisorder, paco2, hco3);
    const anionGap = anionGapAnalysis(sodium, chloride, hco3);
    const oxygenation = oxygenationAnalysis(pao2, fio2);

    const interpretationParts = [primaryDisorderLabel + '.'];
    if (compensation) interpretationParts.push(compensation.assessment);
    if (anionGap) interpretationParts.push(anionGap.note);
    if (oxygenation) interpretationParts.push(oxygenation.note);

    return {
      success: true,
      data: {
        pH,
        paco2,
        hco3,
        primaryDisorder,
        primaryDisorderLabel,
        compensation,
        anionGap,
        oxygenation,
      },
      interpretation: interpretationParts.join(' '),
      citations: [
        {
          title: "Winter's Formula for Metabolic Acidosis Compensation",
          reference: 'Winters RW, Engel K, Dell RB. Acid-Base Physiology in Medicine. 1965.',
        },
        {
          title: 'Berlin Definition of ARDS',
          reference: 'ARDS Definition Task Force. JAMA. 2012;307(23):2526-2533.',
          url: 'https://pubmed.ncbi.nlm.nih.gov/22797452/',
        },
      ],
      warnings: validation.warnings,
      disclaimer: ABG_INTERPRETER_DISCLAIMER,
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      pH: 7.28,
      paco2: 30,
      hco3: 14,
      sodium: 138,
      chloride: 100,
    };
  }
}
