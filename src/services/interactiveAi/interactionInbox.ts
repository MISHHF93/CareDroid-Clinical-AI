/**
 * Personal interaction inbox — aggregates AI proposals, workflow cards, and
 * lightweight review stubs for the current user/role without a second chat UI.
 */

import type { AIActionProposal, WorkflowAiCard } from '../../contracts/interactiveAi';
import { listActionProposals } from './actionProposalService';
import { listWorkflowAiCards } from './workflowAiCards';
import { countInboxComments, getInboxAssignment } from './inboxCollaboration';

export type InboxItemKind = 'proposal' | 'workflow_card' | 'human_review' | 'failed_action' | 'draft';

export type InteractionInboxItem = {
  id: string;
  kind: InboxItemKind;
  title: string;
  summary: string;
  urgency: 'info' | 'attention' | 'urgent' | 'critical';
  dueAt?: string;
  ownerUserId?: string;
  ownerRole?: string;
  patientId?: string;
  state: string;
  createdAt: string;
  sourceId: string;
  href?: string;
  resumable: boolean;
  assignedToUserId?: string;
  assignedToRole?: string;
  commentCount: number;
};

export type InteractionInboxFilter = {
  ownerUserId?: string;
  ownerRole?: string;
  channel?: string;
  kind?: InboxItemKind;
  includeTerminal?: boolean;
};

function proposalUrgency(p: AIActionProposal): InteractionInboxItem['urgency'] {
  if (p.riskLevel === 'critical') return 'critical';
  if (p.riskLevel === 'high') return 'urgent';
  if (p.riskLevel === 'moderate') return 'attention';
  return 'info';
}

function withCollaboration(
  id: string,
  item: Omit<InteractionInboxItem, 'id' | 'assignedToUserId' | 'assignedToRole' | 'commentCount'>,
): InteractionInboxItem {
  const assignment = getInboxAssignment(id);
  return {
    id,
    ...item,
    assignedToUserId: assignment?.assignedToUserId,
    assignedToRole: assignment?.assignedToRole,
    commentCount: countInboxComments(id),
  };
}

function cardToInbox(card: WorkflowAiCard): InteractionInboxItem {
  return withCollaboration(`card:${card.cardId}`, {
    kind: 'workflow_card',
    title: card.title,
    summary: card.summary,
    urgency: card.urgency,
    dueAt: card.expiresAt,
    ownerUserId: card.ownerUserId,
    ownerRole: card.ownerRole,
    patientId: card.patientId,
    state: card.dismissed ? 'dismissed' : card.acknowledged ? 'acknowledged' : 'open',
    createdAt: card.timestamp,
    sourceId: card.cardId,
    href: card.workspaceLink,
    resumable: !card.dismissed,
  });
}

function proposalToInbox(p: AIActionProposal): InteractionInboxItem {
  const kind: InboxItemKind =
    p.state === 'failed'
      ? 'failed_action'
      : p.state === 'proposed' || p.state === 'reviewing' || p.state === 'approved'
        ? 'proposal'
        : p.state === 'completed'
          ? 'draft'
          : 'proposal';
  return withCollaboration(`proposal:${p.proposalId}`, {
    kind,
    title: `Action: ${p.toolName}`,
    summary: p.previewSummary || p.expectedEffect,
    urgency: proposalUrgency(p),
    dueAt: p.expiresAt,
    ownerUserId: p.ownerUserId,
    ownerRole: p.ownerRole,
    patientId: p.patientId,
    state: p.state,
    createdAt: p.createdAt,
    sourceId: p.proposalId,
    resumable: p.state === 'proposed' || p.state === 'reviewing' || p.state === 'approved',
  });
}

const TERMINAL_PROPOSAL = new Set([
  'completed',
  'failed',
  'rejected',
  'cancelled',
  'expired',
  'rolled_back',
]);

export function buildInteractionInbox(
  filter: InteractionInboxFilter = {},
): InteractionInboxItem[] {
  const proposals = listActionProposals({
    ownerUserId: filter.ownerUserId,
  })
    .filter((p) => {
      if (!filter.includeTerminal && TERMINAL_PROPOSAL.has(p.state) && p.state !== 'failed') {
        return false;
      }
      if (filter.ownerRole && p.ownerRole && p.ownerRole !== filter.ownerRole) return false;
      return true;
    })
    .map(proposalToInbox);

  const cards = listWorkflowAiCards({
    channel: filter.channel,
    includeDismissed: Boolean(filter.includeTerminal),
  })
    .filter((c) => {
      if (filter.ownerRole && c.ownerRole && c.ownerRole !== filter.ownerRole) return false;
      if (filter.ownerUserId && c.ownerUserId && c.ownerUserId !== filter.ownerUserId) return false;
      return true;
    })
    .map(cardToInbox);

  let items = [...proposals, ...cards];
  if (filter.kind) {
    items = items.filter((i) => i.kind === filter.kind);
  }

  return items.sort((a, b) => {
    const urgencyRank = { critical: 0, urgent: 1, attention: 2, info: 3 };
    const ur = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (ur !== 0) return ur;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function countOpenInboxItems(filter: InteractionInboxFilter = {}): number {
  return buildInteractionInbox({ ...filter, includeTerminal: false }).filter((i) => i.resumable)
    .length;
}
