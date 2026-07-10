/**
 * NEWS2 (National Early Warning Score 2) Calculator Service
 *
 * Ported from `src/utils/news2Calculator.ts` (same per-parameter scoring
 * tables, SpO2 Scale 1/2 handling, and risk-band interpretation).
 *
 * Reference: Royal College of Physicians. National Early Warning Score
 * (NEWS) 2 — standard observation chart and escalation thresholds.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolParameter,
  ToolExecutionResult,
  ToolValidationResult,
} from '../interfaces/clinical-tool.interface';

function scoreRespiratoryRate(rr: number): number | null {
  if (!Number.isFinite(rr)) return null;
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

function scoreSpo2Scale1(spo2: number): number | null {
  if (!Number.isFinite(spo2)) return null;
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function scoreSpo2Scale2(spo2: number, supplementalOxygen: boolean): number | null {
  if (!Number.isFinite(spo2)) return null;
  if (spo2 <= 83) return 3;
  if (spo2 <= 85) return 2;
  if (spo2 <= 87) return 1;
  if (spo2 <= 92) return 0;
  if (!supplementalOxygen) return 0;
  if (spo2 <= 94) return 1;
  if (spo2 <= 96) return 2;
  return 3;
}

function scoreSupplementalOxygen(supplementalOxygen: boolean): number {
  return supplementalOxygen ? 2 : 0;
}

function scoreSystolicBp(sbp: number): number | null {
  if (!Number.isFinite(sbp)) return null;
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}

function scorePulse(pulse: number): number | null {
  if (!Number.isFinite(pulse)) return null;
  if (pulse <= 40) return 3;
  if (pulse <= 50) return 1;
  if (pulse <= 90) return 0;
  if (pulse <= 110) return 1;
  if (pulse <= 130) return 2;
  return 3;
}

function scoreConsciousness(newConfusion: boolean): number {
  return newConfusion ? 3 : 0;
}

function scoreTemperature(tempCelsius: number): number | null {
  if (!Number.isFinite(tempCelsius)) return null;
  if (tempCelsius <= 35.0) return 3;
  if (tempCelsius <= 36.0) return 1;
  if (tempCelsius <= 38.0) return 0;
  if (tempCelsius <= 39.0) return 1;
  return 2;
}

function interpretNews2Risk(total: number, breakdown: Record<string, number | null>) {
  const hasRed = [
    'respiratoryRate',
    'spo2',
    'systolicBp',
    'pulse',
    'consciousness',
    'temperature',
  ].some((k) => breakdown[k] === 3);

  if (total >= 7) {
    return {
      riskBand: 'high',
      label: 'High risk band (aggregate)',
      interpretation:
        'Aggregate score 7 or more aligns with RCP NEWS2 guidance for a high-level clinical alert — urgent or emergency response by a team that includes staff with critical care skills. Escalation and diagnosis remain clinical decisions.',
      escalationHint:
        'Escalate per local policy; response team must be able to manage acute deterioration including airway support.',
      hasRed,
    };
  }
  if (total >= 5) {
    return {
      riskBand: 'medium',
      label: 'Medium risk band (aggregate)',
      interpretation:
        'Aggregate score 5-6 matches the RCP threshold for urgent clinical review by staff competent in assessment and treatment of acutely ill patients; it does not by itself define a diagnosis.',
      escalationHint:
        'Increase monitoring frequency and arrange urgent ward-based or acute-team review per protocol.',
      hasRed,
    };
  }
  if (hasRed) {
    return {
      riskBand: 'low_medium_red',
      label: 'Single-parameter red score',
      interpretation:
        'A score of 3 in one physiological parameter (red score) should prompt urgent evaluation by a ward-based clinician to determine cause and monitoring frequency, even when the aggregate score is below 5. This pattern is not equivalent to a specific diagnosis.',
      escalationHint:
        'Does not automatically equal the same response as aggregate >=5, but must not be ignored — clinical review is required.',
      hasRed: true,
    };
  }
  return {
    riskBand: 'low',
    label: 'Lower aggregate band',
    interpretation:
      'Aggregate score 0-4 with no single-parameter red score suggests a lower immediate escalation concern on this chart; continue routine observations per local policy and reassess if the clinical picture changes.',
    escalationHint: 'Continue scheduled observations; reassess if the clinical picture changes.',
    hasRed: false,
  };
}

@Injectable()
export class News2Service implements ClinicalToolService {
  private readonly logger = new Logger(News2Service.name);

  getMetadata(): ToolMetadata {
    return {
      id: 'news2',
      name: 'NEWS2 (National Early Warning Score 2)',
      description:
        'Aggregate early-warning score from respiratory rate, SpO2, supplemental oxygen, systolic BP, pulse, consciousness, and temperature',
      category: 'calculator',
      version: '1.0.0',
      author: 'CareDroid Medical Team',
      references: [
        'Royal College of Physicians. National Early Warning Score (NEWS) 2 — standard observation chart and escalation thresholds.',
      ],
    };
  }

  getSchema(): ToolParameter[] {
    return [
      {
        name: 'respiratoryRate',
        type: 'number',
        required: true,
        description: 'Respiratory rate (breaths/min)',
        validation: { min: 0, max: 60 },
      },
      {
        name: 'spo2',
        type: 'number',
        required: true,
        description: 'SpO2 (%)',
        validation: { min: 70, max: 100 },
      },
      {
        name: 'spo2Scale',
        type: 'string',
        required: true,
        description: 'SpO2 scale: 1 (most patients) or 2 (target-range hypercapnic patients only)',
        validation: { options: ['1', '2'] },
      },
      {
        name: 'supplementalOxygen',
        type: 'boolean',
        required: false,
        description: 'Patient is on supplemental oxygen',
      },
      {
        name: 'systolicBp',
        type: 'number',
        required: true,
        description: 'Systolic blood pressure (mmHg)',
        validation: { min: 50, max: 280 },
      },
      {
        name: 'pulse',
        type: 'number',
        required: true,
        description: 'Pulse (beats/min)',
        validation: { min: 20, max: 220 },
      },
      {
        name: 'newConfusion',
        type: 'boolean',
        required: false,
        description: 'New confusion (ACVPU — not alert)',
      },
      {
        name: 'temperature',
        type: 'number',
        required: true,
        description: 'Temperature (C)',
        validation: { min: 30, max: 43 },
      },
    ];
  }

  validate(parameters: Record<string, any>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rr = Number(parameters.respiratoryRate);
    if (!Number.isFinite(rr)) errors.push('respiratoryRate must be a valid number');
    else if (rr < 0 || rr > 60) errors.push('respiratoryRate should be between 0 and 60');

    const spo2 = Number(parameters.spo2);
    if (!Number.isFinite(spo2)) errors.push('spo2 must be a valid number');
    else if (spo2 < 70 || spo2 > 100) errors.push('spo2 should be between 70 and 100');

    if (parameters.spo2Scale !== '1' && parameters.spo2Scale !== '2') {
      errors.push("spo2Scale must be '1' or '2'");
    }

    const sbp = Number(parameters.systolicBp);
    if (!Number.isFinite(sbp)) errors.push('systolicBp must be a valid number');
    else if (sbp < 50 || sbp > 280) errors.push('systolicBp should be between 50 and 280');

    const pulse = Number(parameters.pulse);
    if (!Number.isFinite(pulse)) errors.push('pulse must be a valid number');
    else if (pulse < 20 || pulse > 220) errors.push('pulse should be between 20 and 220');

    const temp = Number(parameters.temperature);
    if (!Number.isFinite(temp)) errors.push('temperature must be a valid number');
    else if (temp < 30 || temp > 43) errors.push('temperature should be between 30 and 43');

    return { valid: errors.length === 0, errors, warnings };
  }

  async execute(parameters: Record<string, any>): Promise<ToolExecutionResult> {
    this.logger.log(`Calculating NEWS2 with parameters: ${JSON.stringify(parameters)}`);

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

    const rr = Number(parameters.respiratoryRate);
    const spo2 = Number(parameters.spo2);
    const sbp = Number(parameters.systolicBp);
    const pulse = Number(parameters.pulse);
    const temp = Number(parameters.temperature);
    const scale = parameters.spo2Scale === '2' ? '2' : '1';
    const onO2 = Boolean(parameters.supplementalOxygen);
    const confused = Boolean(parameters.newConfusion);

    const breakdown: Record<string, number | null> = {
      respiratoryRate: scoreRespiratoryRate(rr),
      spo2: scale === '1' ? scoreSpo2Scale1(spo2) : scoreSpo2Scale2(spo2, onO2),
      supplementalOxygen: scoreSupplementalOxygen(onO2),
      systolicBp: scoreSystolicBp(sbp),
      pulse: scorePulse(pulse),
      consciousness: scoreConsciousness(confused),
      temperature: scoreTemperature(temp),
    };

    const total = Object.values(breakdown).reduce((sum: number, v) => sum + (v || 0), 0);
    const risk = interpretNews2Risk(total, breakdown);

    return {
      success: true,
      data: {
        total,
        breakdown,
        spo2ScaleUsed: scale,
        riskBand: risk.riskBand,
        hasRed: risk.hasRed,
      },
      interpretation: risk.interpretation,
      citations: [
        {
          title: 'NEWS2 — Royal College of Physicians',
          reference:
            'Royal College of Physicians. National Early Warning Score (NEWS) 2 — standard observation chart and escalation thresholds.',
        },
      ],
      warnings: [...validation.warnings, risk.escalationHint],
      disclaimer: 'This tool supports clinical assessment and does not replace physician judgment.',
      timestamp: new Date(),
    };
  }

  getExample(): Record<string, any> {
    return {
      respiratoryRate: 18,
      spo2: 97,
      spo2Scale: '1',
      supplementalOxygen: false,
      systolicBp: 120,
      pulse: 80,
      newConfusion: false,
      temperature: 37,
    };
  }
}
