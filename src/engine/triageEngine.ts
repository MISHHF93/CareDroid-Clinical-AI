import { Priority, type VitalValue } from '../types/emergency';

export type TriageConfidence = 'high' | 'medium' | 'low';

export interface TriageVitalsInput {
  hr?: VitalValue;
  heartRate?: VitalValue;
  bpSystolic?: VitalValue;
  sbp?: VitalValue;
  spo2?: VitalValue;
  oxygenSaturation?: VitalValue;
  gcs?: VitalValue;
  pain?: VitalValue;
  painScore?: VitalValue;
  [key: string]: VitalValue | undefined;
}

export interface TriageSuggestionInput {
  complaintCategory?: string;
  complaintText?: string;
  vitals?: TriageVitalsInput;
  overridePriority?: Priority | null;
}

export interface SuggestionResult {
  suggestedPriority: Priority;
  confidence: TriageConfidence;
  reason: string;
  ruleTriggered: string;
  override: boolean;
}

interface RuleResult extends Omit<SuggestionResult, 'override'> {}

function parseNumber(value: VitalValue | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function complaintText(input: TriageSuggestionInput): string {
  return `${input.complaintCategory || ''} ${input.complaintText || ''}`.toLowerCase();
}

function hasAnyComplaint(input: TriageSuggestionInput): boolean {
  return Boolean(`${input.complaintCategory || ''}${input.complaintText || ''}`.trim());
}

function formatValue(value: number, suffix = ''): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}

function hasChestPain(complaint: string): boolean {
  return /\b(chest|cardiac|heart|acs|stemi)\b/.test(complaint);
}

function hasDiaphoresis(complaint: string): boolean {
  return /\b(diaphoresis|diaphoretic|sweat|sweating|clammy)\b/.test(complaint);
}

function hasStrokeSymptoms(complaint: string): boolean {
  return /\b(stroke|facial droop|slurred|aphasia|one[-\s]?sided|hemiparesis|neuro)\b/.test(
    complaint,
  );
}

function hasSevereRespiratory(complaint: string): boolean {
  return /\b(severe respiratory|severe breath|respiratory distress|unable to speak|tripod|cyanosis)\b/.test(
    complaint,
  );
}

function hasSepsis(complaint: string): boolean {
  return /\b(sepsis|septic)\b/.test(complaint);
}

function hasMajorTrauma(complaint: string): boolean {
  return /\b(major trauma|polytrauma|penetrating trauma|unstable trauma|ejected|crush injury)\b/.test(
    complaint,
  );
}

function p1Complaint(complaint: string): string | null {
  if (/\bcardiac arrest\b/.test(complaint)) return 'cardiac arrest';
  if (/\banaphylaxis\b/.test(complaint)) return 'anaphylaxis';
  if (hasMajorTrauma(complaint)) return 'major trauma';
  if (/\bunconscious\b|\bunresponsive\b/.test(complaint)) return 'unconscious';
  return null;
}

function p3Complaint(complaint: string): string | null {
  if (hasChestPain(complaint) && !hasDiaphoresis(complaint)) return 'chest pain without diaphoresis';
  if (/\babdominal pain\b|\babdo\b/.test(complaint)) return 'abdominal pain';
  if (/\blaceration\b/.test(complaint) && /\brepair\b|\bsuture\b|\bstitch\b/.test(complaint)) {
    return 'laceration requiring repair';
  }
  return null;
}

function rule(
  suggestedPriority: Priority,
  confidence: TriageConfidence,
  reason: string,
  ruleTriggered: string,
): RuleResult {
  return {
    suggestedPriority,
    confidence,
    reason,
    ruleTriggered,
  };
}

function priorityLabel(priority: Priority): string {
  return priority;
}

export class TriageSuggestionEngine {
  static suggest(input: TriageSuggestionInput): SuggestionResult {
    const baseResult = TriageSuggestionEngine.evaluate(input);

    if (input.overridePriority && input.overridePriority !== baseResult.suggestedPriority) {
      return {
        suggestedPriority: input.overridePriority,
        confidence: baseResult.confidence,
        reason: `${priorityLabel(input.overridePriority)} selected by staff override; engine suggested ${baseResult.reason}`,
        ruleTriggered: 'staff-override',
        override: true,
      };
    }

    return {
      ...baseResult,
      override: false,
    };
  }

  private static evaluate(input: TriageSuggestionInput): RuleResult {
    const vitals = input.vitals || {};
    const hr = parseNumber(vitals.hr ?? vitals.heartRate);
    const sbp = parseNumber(vitals.bpSystolic ?? vitals.sbp);
    const spo2 = parseNumber(vitals.spo2 ?? vitals.oxygenSaturation);
    const gcs = parseNumber(vitals.gcs);
    const pain = parseNumber(vitals.pain ?? vitals.painScore);
    const complaint = complaintText(input);
    const p1ComplaintMatch = p1Complaint(complaint);
    const p3ComplaintMatch = p3Complaint(complaint);

    if (typeof spo2 === 'number' && spo2 < 88) {
      return rule(Priority.P1, 'high', `P1 suggested - SpO2 ${formatValue(spo2, '%')}`, 'p1-spo2-under-88');
    }
    if (typeof hr === 'number' && (hr < 40 || hr > 160)) {
      return rule(Priority.P1, 'high', `P1 suggested - HR ${formatValue(hr)}`, 'p1-hr-critical');
    }
    if (typeof sbp === 'number' && sbp < 70) {
      return rule(Priority.P1, 'high', `P1 suggested - SBP ${formatValue(sbp)}`, 'p1-sbp-under-70');
    }
    if (typeof gcs === 'number' && gcs <= 8) {
      return rule(Priority.P1, 'high', `P1 suggested - GCS ${formatValue(gcs)}`, 'p1-gcs-8-or-less');
    }
    if (p1ComplaintMatch) {
      return rule(Priority.P1, 'high', `P1 suggested - ${p1ComplaintMatch}`, 'p1-complaint');
    }

    if (typeof spo2 === 'number' && spo2 >= 88 && spo2 <= 93) {
      return rule(Priority.P2, 'high', `P2 suggested - SpO2 ${formatValue(spo2, '%')}`, 'p2-spo2-88-93');
    }
    if (typeof hr === 'number' && ((hr >= 130 && hr <= 160) || hr < 50)) {
      return rule(Priority.P2, 'high', `P2 suggested - HR ${formatValue(hr)}`, 'p2-hr-emergent');
    }
    if (typeof sbp === 'number' && ((sbp >= 70 && sbp <= 89) || sbp > 200)) {
      return rule(Priority.P2, 'high', `P2 suggested - SBP ${formatValue(sbp)}`, 'p2-sbp-emergent');
    }
    if (hasChestPain(complaint) && hasDiaphoresis(complaint)) {
      return rule(Priority.P2, 'high', 'P2 suggested - chest pain with diaphoresis', 'p2-chest-pain-diaphoresis');
    }
    if (hasChestPain(complaint) && typeof hr === 'number' && hr > 120) {
      return rule(Priority.P2, 'high', `P2 suggested - chest pain with HR ${formatValue(hr)}`, 'p2-chest-pain-hr-over-120');
    }
    if (hasStrokeSymptoms(complaint)) {
      return rule(Priority.P2, 'high', 'P2 suggested - stroke symptoms', 'p2-stroke-symptoms');
    }
    if (hasSepsis(complaint)) {
      return rule(Priority.P2, 'high', 'P2 suggested - sepsis complaint', 'p2-sepsis');
    }
    if (hasSevereRespiratory(complaint)) {
      return rule(Priority.P2, 'high', 'P2 suggested - severe respiratory complaint', 'p2-severe-respiratory');
    }

    if (typeof spo2 === 'number' && spo2 >= 94 && spo2 <= 95) {
      return rule(Priority.P3, 'medium', `P3 suggested - SpO2 ${formatValue(spo2, '%')}`, 'p3-spo2-94-95');
    }
    if (typeof hr === 'number' && hr >= 110 && hr < 130) {
      return rule(Priority.P3, 'medium', `P3 suggested - HR ${formatValue(hr)}`, 'p3-hr-110-130');
    }
    // HEAL-239: pain 9-10 (the most severe end of the scale) fell through
    // every rule to the P4/P5 default -- a fully valid "10/10 worst pain"
    // entry, no typo required, was triaged as routine/non-urgent unless
    // some unrelated complaint-text rule happened to also match. Widened
    // to include the top of the scale rather than inventing a new P1/P2
    // pain-specific tier this engine doesn't otherwise have.
    if (typeof pain === 'number' && pain >= 6 && pain <= 10) {
      return rule(Priority.P3, 'medium', `P3 suggested - pain ${formatValue(pain)}/10`, 'p3-moderate-pain');
    }
    if (p3ComplaintMatch) {
      return rule(Priority.P3, 'medium', `P3 suggested - ${p3ComplaintMatch}`, 'p3-complaint');
    }

    const defaultPriority = hasAnyComplaint(input) ? Priority.P4 : Priority.P5;
    return rule(
      defaultPriority,
      'low',
      `${defaultPriority} suggested - no high-acuity rule triggered`,
      defaultPriority === Priority.P4 ? 'default-p4' : 'default-p5',
    );
  }
}

export function suggestTriagePriority(input: TriageSuggestionInput): SuggestionResult {
  return TriageSuggestionEngine.suggest(input);
}
