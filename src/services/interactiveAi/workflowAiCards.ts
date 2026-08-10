/**
 * Workflow-triggered AI cards (CDS-inspired) — deduplicated, permissioned,
 * dismissible, expirable. Never auto-executes high-risk actions.
 */

import type {
  AiDeliveryLevel,
  WorkflowAiCard,
  WorkflowAiCardUrgency,
} from '../../contracts/interactiveAi';
import type { CareDroidUnifiedChannel } from '../../../lib/ai/unifiedAiContracts';

export type WorkflowTriggerKind =
  | 'ems_prearrival'
  | 'incomplete_registration'
  | 'new_ocr_document'
  | 'queue_delay'
  | 'unresolved_alert'
  | 'missing_clinical_field'
  | 'calculator_opportunity'
  | 'operational_bottleneck';

export type WorkflowTriggerEvent = {
  kind: WorkflowTriggerKind;
  occurredAt?: string;
  patientId?: string;
  channel?: CareDroidUnifiedChannel | string;
  summary?: string;
  urgency?: WorkflowAiCardUrgency;
  metadata?: Record<string, unknown>;
};

const cardStore = new Map<string, WorkflowAiCard>();
const recentDedupe = new Map<string, number>();
const DEDUPE_COOLDOWN_MS = 5 * 60 * 1000;

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function dedupeKey(event: WorkflowTriggerEvent): string {
  const sourceId = event.metadata?.sourceId || event.metadata?.alertId;
  if (sourceId) {
    // A source-identified event (one specific EMS unit, one specific alert)
    // is the same occurrence for the life of that source regardless of
    // patientId -- patient-chart linkage can resolve a beat after the
    // source itself is known (e.g. an EMS unit reports inbound before its
    // patient record links), and keying on patientId too would let that
    // timing re-seed a duplicate card for what is canonically one event.
    return [event.kind, event.channel || 'api', String(sourceId)].join('|');
  }
  return [
    event.kind,
    event.patientId || 'none',
    event.channel || 'api',
    String(event.summary || ''),
  ].join('|');
}

export function buildWorkflowAiCard(event: WorkflowTriggerEvent): WorkflowAiCard | null {
  const key = dedupeKey(event);
  const last = recentDedupe.get(key);
  if (last && Date.now() - last < DEDUPE_COOLDOWN_MS) {
    return null;
  }
  recentDedupe.set(key, Date.now());

  const channel = event.channel || inferChannel(event.kind);
  const urgency = event.urgency || defaultUrgency(event.kind);
  const deliveryLevel = deliveryFromUrgency(urgency);
  const timestamp = event.occurredAt || new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const card: WorkflowAiCard = {
    cardId: createId('card'),
    dedupeKey: key,
    title: titleFor(event.kind),
    source: `workflow_trigger:${event.kind}`,
    summary: event.summary || defaultSummary(event.kind),
    evidence: [],
    urgency,
    timestamp,
    expiresAt,
    ownerRole: ownerFor(event.kind),
    recommendedActions: actionsFor(event.kind),
    workspaceLink: workspaceFor(event.kind),
    channel,
    patientId: event.patientId,
    permission: 'use_ai_chat',
    dismissible: urgency !== 'critical',
    acknowledged: false,
    dismissed: false,
    deliveryLevel,
    triggerEvent: event.kind,
    model: 'careDroidAI-heuristic-node',
    promptVersion: 'interactive-workflow-card@1',
  };

  cardStore.set(card.cardId, card);
  return { ...card, recommendedActions: [...card.recommendedActions], evidence: [...card.evidence] };
}

export function listWorkflowAiCards(filter?: {
  channel?: string;
  patientId?: string;
  includeDismissed?: boolean;
}): WorkflowAiCard[] {
  const now = Date.now();
  return [...cardStore.values()]
    .filter((card) => {
      if (card.expiresAt && Date.parse(card.expiresAt) < now) return false;
      if (!filter?.includeDismissed && card.dismissed) return false;
      if (filter?.channel && card.channel !== filter.channel) return false;
      if (filter?.patientId && card.patientId !== filter.patientId) return false;
      return true;
    })
    .map((c) => ({
      ...c,
      recommendedActions: [...c.recommendedActions],
      evidence: [...c.evidence],
    }));
}

export function acknowledgeWorkflowCard(cardId: string): WorkflowAiCard | null {
  const card = cardStore.get(cardId);
  if (!card) return null;
  card.acknowledged = true;
  cardStore.set(cardId, card);
  return { ...card };
}

export function dismissWorkflowCard(cardId: string): WorkflowAiCard | null {
  const card = cardStore.get(cardId);
  if (!card) return null;
  if (!card.dismissible) {
    throw new Error('This card cannot be dismissed');
  }
  card.dismissed = true;
  cardStore.set(cardId, card);
  return { ...card };
}

export function clearWorkflowAiCardsForTests(): void {
  cardStore.clear();
  recentDedupe.clear();
}

function inferChannel(kind: WorkflowTriggerKind): string {
  if (kind === 'ems_prearrival') return 'ems';
  if (kind === 'incomplete_registration' || kind === 'new_ocr_document') return 'reception';
  if (kind === 'missing_clinical_field' || kind === 'unresolved_alert') return 'triage';
  return 'operations';
}

function defaultUrgency(kind: WorkflowTriggerKind): WorkflowAiCardUrgency {
  if (kind === 'unresolved_alert') return 'urgent';
  if (kind === 'ems_prearrival' || kind === 'operational_bottleneck') return 'attention';
  return 'info';
}

function deliveryFromUrgency(urgency: WorkflowAiCardUrgency): AiDeliveryLevel {
  if (urgency === 'critical') return 'urgent';
  if (urgency === 'urgent') return 'attention';
  if (urgency === 'attention') return 'normal';
  return 'quiet';
}

function titleFor(kind: WorkflowTriggerKind): string {
  const map: Record<WorkflowTriggerKind, string> = {
    ems_prearrival: 'EMS pre-arrival assistance',
    incomplete_registration: 'Incomplete registration',
    new_ocr_document: 'OCR document ready for review',
    queue_delay: 'Queue delay detected',
    unresolved_alert: 'Unresolved alert needs review',
    missing_clinical_field: 'Missing clinical field',
    calculator_opportunity: 'Calculator opportunity',
    operational_bottleneck: 'Operational bottleneck',
  };
  return map[kind];
}

function defaultSummary(kind: WorkflowTriggerKind): string {
  const map: Record<WorkflowTriggerKind, string> = {
    ems_prearrival: 'An inbound EMS unit may need ED preparation. Review handoff summary and ETA freshness.',
    incomplete_registration: 'Registration is incomplete. Detect missing fields before triage handoff.',
    new_ocr_document: 'A document was processed. Review low-confidence fields before committing.',
    queue_delay: 'A queue delay may need attention. Review wait times and next actions.',
    unresolved_alert: 'An alert remains unresolved. Explain and assign ownership — do not auto-resolve.',
    missing_clinical_field: 'Required clinical information is missing for the current workflow step.',
    calculator_opportunity: 'A deterministic calculator may apply. Suggest selection only; never invent scores.',
    operational_bottleneck: 'An operational bottleneck was detected. Summarize impact for the charge role.',
  };
  return map[kind];
}

function ownerFor(kind: WorkflowTriggerKind): string {
  if (kind === 'ems_prearrival') return 'charge_nurse';
  if (kind === 'incomplete_registration' || kind === 'new_ocr_document') return 'registration_clerk';
  if (kind === 'unresolved_alert' || kind === 'missing_clinical_field') return 'triage_nurse';
  return 'ed_director';
}

function workspaceFor(kind: WorkflowTriggerKind): string {
  if (kind === 'ems_prearrival') return '/ems';
  if (kind === 'incomplete_registration' || kind === 'new_ocr_document') return '/reception';
  if (kind === 'unresolved_alert') return '/triage';
  return '/dashboard';
}

function actionsFor(kind: WorkflowTriggerKind): WorkflowAiCard['recommendedActions'] {
  const base = (id: string, label: string, risk: WorkflowAiCard['recommendedActions'][0]['riskLevel'] = 'low') => ({
    id,
    label,
    riskLevel: risk,
    requiresApproval: risk !== 'low',
  });
  switch (kind) {
    case 'ems_prearrival':
      return [
        base('summarize_ems', 'Summarize EMS report', 'moderate'),
        base('compare_eta', 'Compare ETA with room readiness', 'low'),
        base('request_triage_review', 'Request triage review', 'moderate'),
      ];
    case 'incomplete_registration':
      return [
        base('detect_missing', 'Show missing registration fields', 'low'),
        base('draft_handoff', 'Prepare triage handoff notes', 'moderate'),
      ];
    case 'new_ocr_document':
      return [
        base('review_ocr', 'Open OCR review', 'moderate'),
        base('create_review', 'Create human-review task', 'low'),
      ];
    default:
      return [base('open_workspace', 'Open workspace', 'low'), base('explain', 'Explain', 'low')];
  }
}
