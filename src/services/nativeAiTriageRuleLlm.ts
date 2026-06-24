import { callAI } from '../lib/ai/client';
import { getAIPrompt } from '../lib/ai/promptRegistry';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import { Priority } from '../types/emergency';
import { addStructuredTriageRule, parseNaturalLanguageTriageRule } from '../../lib/native-ai';
import type { StructuredTriageRule } from '../../lib/native-ai/types';

function normalizePriority(value: string): Priority | undefined {
  const upper = value.toUpperCase();
  if (upper === 'P1' || upper.includes('RESUSCITATION') || upper.includes('CLASS 1')) return Priority.P1;
  if (upper === 'P2' || upper.includes('EMERGENT') || upper.includes('CLASS 2')) return Priority.P2;
  if (upper === 'P3' || upper.includes('URGENT') || upper.includes('CLASS 3')) return Priority.P3;
  if (upper === 'P4' || upper.includes('SEMI') || upper.includes('CLASS 4')) return Priority.P4;
  if (upper === 'P5' || upper.includes('NON-URGENT') || upper.includes('CLASS 5')) return Priority.P5;
  return undefined;
}

export async function parseTriageRuleWithLlm(
  naturalLanguage: string,
  options: { createdBy?: string } = {},
): Promise<StructuredTriageRule> {
  const fallback = parseNaturalLanguageTriageRule(naturalLanguage, options);

  try {
    const response = await callAI({
      requestType: 'TRIAGE_ASSIST',
      systemPrompt: `${getAIPrompt('triage-assistant').prompt}\n${HUMAN_REVIEW_DISCLAIMER}`,
      message: [
        'Convert this triage rule into JSON with keys: label, priority (P1-P5), conditions (array of {field, operator, value}).',
        'Do not invent clinical facts. Only encode what the rule text states.',
        naturalLanguage,
      ].join('\n'),
      context: { triageRuleBuilder: true },
    });

    const content = typeof response?.content === 'string' ? response.content : '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return addStructuredTriageRule(fallback);

    const parsed = JSON.parse(jsonMatch[0]) as {
      label?: string;
      priority?: string;
      conditions?: StructuredTriageRule['conditions'];
    };

    const rule: StructuredTriageRule = {
      ...fallback,
      label: parsed.label || fallback.label,
      priority: normalizePriority(String(parsed.priority || '')) || fallback.priority,
      conditions: Array.isArray(parsed.conditions) && parsed.conditions.length ? parsed.conditions : fallback.conditions,
      confidence: 0.8,
      createdBy: options.createdBy,
    };

    return addStructuredTriageRule(rule);
  } catch {
    return addStructuredTriageRule(fallback);
  }
}