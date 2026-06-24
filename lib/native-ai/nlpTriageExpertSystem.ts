import { Priority, type Patient } from '../../src/types/emergency';
import { suggestTriagePriority } from '../../engine/triageEngine';
import { loadPersistedTriageRules, persistTriageRules } from './persistence';
import type { NativeAiSourceState, StructuredTriageRule, TriageExpertInference } from './types';

const SEED_RULES: StructuredTriageRule[] = [
  {
    id: 'rule-severe-burns',
    label: 'Severe burns >25% TBSA',
    naturalLanguageSource: 'Patients with severe burns >25% TBS must be triage class 1',
    priority: Priority.P1,
    conditions: [{ field: 'complaint', operator: 'matches', value: 'burn' }, { field: 'complaint', operator: 'matches', value: '25%' }],
    confidence: 0.9,
    requiresHumanReview: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rule-chest-pain-elderly',
    label: 'Elderly chest pain',
    naturalLanguageSource: 'Patients age 65+ with chest pain should be triage class 2',
    priority: Priority.P2,
    conditions: [{ field: 'age', operator: 'gte', value: 65 }, { field: 'complaint', operator: 'contains', value: 'chest pain' }],
    confidence: 0.82,
    requiresHumanReview: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const persistedRules = loadPersistedTriageRules();
const ruleStore: StructuredTriageRule[] = persistedRules.length ? persistedRules : [...SEED_RULES];

function syncTriageRulesToStorage(): void {
  persistTriageRules(ruleStore);
}

function createRuleId(): string {
  return `triage-rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function parseNaturalLanguageTriageRule(
  naturalLanguage: string,
  options: { createdBy?: string; priority?: Priority } = {},
): StructuredTriageRule {
  const lower = naturalLanguage.toLowerCase();
  let priority = options.priority || Priority.P3;

  if (/\b(class\s*1|ctas\s*1|resuscitation|immediate)\b/.test(lower) || /\bmust be triage class 1\b/.test(lower)) {
    priority = Priority.P1;
  } else if (/\b(class\s*2|ctas\s*2|emergent)\b/.test(lower)) {
    priority = Priority.P2;
  } else if (/\b(class\s*4|ctas\s*4|semi)/.test(lower)) {
    priority = Priority.P4;
  } else if (/\b(class\s*5|ctas\s*5|non-urgent)\b/.test(lower)) {
    priority = Priority.P5;
  }

  const conditions: StructuredTriageRule['conditions'] = [];
  const percentMatch = lower.match(/(\d+)\s*%/);
  if (percentMatch) {
    conditions.push({ field: 'complaint', operator: 'matches', value: `${percentMatch[1]}%` });
  }
  if (/\bburn/.test(lower)) {
    conditions.push({ field: 'complaint', operator: 'contains', value: 'burn' });
  }
  if (/\bchest pain\b/.test(lower)) {
    conditions.push({ field: 'complaint', operator: 'contains', value: 'chest pain' });
  }
  if (/\bage\s*(\d+)\+/.test(lower)) {
    const ageMatch = lower.match(/age\s*(\d+)\+/);
    if (ageMatch) conditions.push({ field: 'age', operator: 'gte', value: Number(ageMatch[1]) });
  }
  if (/\bspo2\b|\boxygen/.test(lower)) {
    const spo2Match = lower.match(/spo2\s*<\s*(\d+)/);
    conditions.push({
      field: 'spo2',
      operator: 'lte',
      value: spo2Match ? Number(spo2Match[1]) : 94,
    });
  }

  if (!conditions.length) {
    conditions.push({ field: 'complaint', operator: 'contains', value: naturalLanguage.slice(0, 80) });
  }

  return {
    id: createRuleId(),
    label: naturalLanguage.slice(0, 80),
    naturalLanguageSource: naturalLanguage,
    priority,
    conditions,
    confidence: 0.72,
    requiresHumanReview: true,
    createdAt: new Date().toISOString(),
    createdBy: options.createdBy,
  };
}

export function addStructuredTriageRule(rule: StructuredTriageRule): StructuredTriageRule {
  ruleStore.unshift(rule);
  syncTriageRulesToStorage();
  return rule;
}

export function removeStructuredTriageRule(ruleId: string): boolean {
  const index = ruleStore.findIndex((rule) => rule.id === ruleId);
  if (index < 0) return false;
  ruleStore.splice(index, 1);
  syncTriageRulesToStorage();
  return true;
}

export function listStructuredTriageRules(): StructuredTriageRule[] {
  return ruleStore.map((rule) => ({ ...rule }));
}

function matchesCondition(
  condition: StructuredTriageRule['conditions'][number],
  patient: Patient,
  complaint: string,
  vitals: Record<string, number | undefined>,
): boolean {
  if (condition.field === 'complaint') {
    if (condition.operator === 'contains') return complaint.includes(String(condition.value).toLowerCase());
    if (condition.operator === 'matches') return new RegExp(String(condition.value), 'i').test(complaint);
  }
  if (condition.field === 'age') {
    const age = patient.age ?? 0;
    if (condition.operator === 'gte') return age >= Number(condition.value);
    if (condition.operator === 'lte') return age <= Number(condition.value);
  }
  if (condition.field === 'spo2' && vitals.spo2 != null) {
    if (condition.operator === 'lte') return vitals.spo2 <= Number(condition.value);
  }
  return false;
}

export function inferTriageFromExpertSystem(
  patient: Patient,
  options: { sourceState?: NativeAiSourceState } = {},
): TriageExpertInference {
  const complaint = [
    patient.chiefComplaint,
    patient.complaint,
    patient.complaintCategory,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const vitals = (patient.vitals?.at(-1) || patient.currentVitals || {}) as {
    spo2?: number;
    oxygenSaturation?: number;
    hr?: number;
    heartRate?: number;
  };
  const vitalsRecord = {
    spo2: vitals.spo2 ?? vitals.oxygenSaturation,
    hr: vitals.hr ?? vitals.heartRate,
  };

  const matchedRules: string[] = [];
  let bestPriority: Priority | null = null;

  ruleStore.forEach((rule) => {
    const allMatch = rule.conditions.every((condition) =>
      matchesCondition(condition, patient, complaint, vitalsRecord),
    );
    if (allMatch) {
      matchedRules.push(rule.label);
      if (!bestPriority || rule.priority < bestPriority) {
        bestPriority = rule.priority;
      }
    }
  });

  const baseline = suggestTriagePriority({
    complaintText: complaint,
    complaintCategory: patient.complaintCategory,
    vitals,
  });

  const suggestedPriority = bestPriority || baseline.suggestedPriority;
  const rationale = [
    matchedRules.length
      ? `Matched custom rules: ${matchedRules.join('; ')}`
      : 'No custom NLP rules matched — baseline triage engine applied',
    baseline.reason,
  ];

  return {
    suggestedPriority,
    matchedRules,
    confidence: matchedRules.length ? 0.84 : baseline.confidence === 'high' ? 0.78 : 0.62,
    rationale,
    requiresHumanReview: true,
    sourceState: options.sourceState || 'live',
  };
}