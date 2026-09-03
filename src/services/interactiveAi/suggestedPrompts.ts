/**
 * Contextual suggested prompts from approved templates only.
 * The model cannot invent unauthorized capabilities via free-form suggestions.
 */

import type { SuggestedPrompt } from '../../contracts/interactiveAi';
import type { CareDroidUnifiedChannel } from '../../../lib/ai/unifiedAiContracts';

export type SuggestedPromptContext = {
  channel: CareDroidUnifiedChannel | string;
  role: string;
  pageId?: string;
  hasPatient?: boolean;
  hasEmsArrival?: boolean;
  hasOcrJob?: boolean;
  hasUnresolvedAlert?: boolean;
  missingRegistrationFields?: string[];
  queueDelayed?: boolean;
};

const TEMPLATES: SuggestedPrompt[] = [
  {
    id: 'tpl-reception-missing',
    templateId: 'reception.missing_registration',
    label: 'Show missing registration information',
    prompt: 'List missing registration fields for the current arrival and what to collect next.',
    task: 'detect_missing_information',
    channel: 'reception',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'low',
  },
  {
    id: 'tpl-reception-ocr',
    templateId: 'reception.review_ocr',
    label: 'Review OCR extraction confidence',
    prompt:
      'Summarize OCR fields below confidence threshold and which require manual verification.',
    task: 'extract_document',
    channel: 'reception',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'moderate',
  },
  {
    id: 'tpl-ems-summarize',
    templateId: 'ems.summarize_report',
    label: 'Summarize this EMS report',
    prompt:
      'Summarize the EMS pre-arrival report for ED preparation. Flag red flags for nurse review.',
    task: 'prepare_handoff',
    channel: 'ems',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'moderate',
  },
  {
    id: 'tpl-ems-eta',
    templateId: 'ems.compare_eta_room',
    label: 'Compare ETA with room readiness',
    prompt: 'Compare ambulance ETA with current room readiness and note preparation gaps.',
    task: 'suggest_next_action',
    channel: 'ems',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'low',
  },
  {
    id: 'tpl-triage-alert',
    templateId: 'triage.explain_alert',
    label: 'Explain this alert',
    prompt:
      'Explain the current clinical/operational alert, supporting observations, and recommended next review step.',
    task: 'explain_alert',
    channel: 'triage',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'moderate',
  },
  {
    id: 'tpl-any-handoff',
    templateId: 'shared.prepare_handoff',
    label: 'Prepare the handoff',
    prompt: 'Draft a handoff summary for the next care team. Require clinician review before use.',
    task: 'prepare_handoff',
    channel: 'api',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'moderate',
  },
  {
    id: 'tpl-any-procedure',
    templateId: 'shared.find_procedure',
    label: 'Find the applicable procedure',
    prompt: 'Retrieve the applicable local procedure or policy for this situation with citations.',
    task: 'retrieve_policy',
    channel: 'api',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'low',
  },
  {
    id: 'tpl-any-calculator',
    templateId: 'shared.select_calculator',
    label: 'Select an appropriate calculator',
    prompt:
      'Suggest which deterministic clinical calculator may apply and which inputs are required. Do not compute scores yourself.',
    task: 'select_calculator',
    channel: 'api',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'low',
  },
  {
    id: 'tpl-any-review',
    templateId: 'shared.create_human_review',
    label: 'Create a human-review task',
    prompt: 'Create a human-review task describing what needs clinician verification and why.',
    task: 'suggest_next_action',
    channel: 'api',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'low',
  },
];

export function getSuggestedPrompts(ctx: SuggestedPromptContext): SuggestedPrompt[] {
  const channel = String(ctx.channel || 'api');
  return TEMPLATES.filter((tpl) => {
    if (tpl.channel !== 'api' && tpl.channel !== channel) return false;
    if (tpl.templateId === 'reception.missing_registration') {
      return channel === 'reception' && (ctx.missingRegistrationFields?.length || !ctx.hasPatient);
    }
    if (tpl.templateId === 'reception.review_ocr') {
      return channel === 'reception' && Boolean(ctx.hasOcrJob);
    }
    if (tpl.templateId.startsWith('ems.')) {
      return channel === 'ems' || Boolean(ctx.hasEmsArrival);
    }
    if (tpl.templateId === 'triage.explain_alert') {
      return channel === 'triage' || Boolean(ctx.hasUnresolvedAlert);
    }
    return true;
  }).slice(0, 6);
}

export function listApprovedSuggestionTemplates(): readonly SuggestedPrompt[] {
  return TEMPLATES;
}
