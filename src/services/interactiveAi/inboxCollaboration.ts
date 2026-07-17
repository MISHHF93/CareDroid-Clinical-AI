/**
 * Interaction inbox collaboration (IX13 remainder) — assign an inbox item to
 * a teammate and leave short comments on it. Layered onto the inbox item's
 * own stable id (`card:<id>` / `proposal:<id>`) rather than mutating the
 * underlying proposal/card domain object, since proposals are server-
 * authoritative (`AiActionProposalService`) while cards are session-local —
 * collaboration metadata is annotation on top of either, not a write to
 * either's own state machine.
 */

export type InboxAssignment = {
  itemId: string;
  assignedToUserId?: string;
  assignedToRole?: string;
  assignedByUserId?: string;
  assignedAt: string;
};

export type InboxComment = {
  id: string;
  itemId: string;
  authorUserId?: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

const MAX_COMMENT_LENGTH = 2000;
const MAX_COMMENTS_PER_ITEM = 100;

const assignments = new Map<string, InboxAssignment>();
const comments = new Map<string, InboxComment[]>();

function createCommentId(): string {
  return `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function assignInboxItem(
  itemId: string,
  assignee: { userId?: string; role?: string },
  assignedByUserId?: string,
  now: () => string = () => new Date().toISOString(),
): InboxAssignment {
  if (!itemId.trim()) {
    throw new Error('assignInboxItem requires an item id');
  }
  if (!assignee.userId && !assignee.role) {
    throw new Error('assignInboxItem requires an assignee userId or role');
  }
  const assignment: InboxAssignment = {
    itemId,
    assignedToUserId: assignee.userId,
    assignedToRole: assignee.role,
    assignedByUserId,
    assignedAt: now(),
  };
  assignments.set(itemId, assignment);
  return { ...assignment };
}

export function unassignInboxItem(itemId: string): void {
  assignments.delete(itemId);
}

export function getInboxAssignment(itemId: string): InboxAssignment | undefined {
  const assignment = assignments.get(itemId);
  return assignment ? { ...assignment } : undefined;
}

export function addInboxComment(
  itemId: string,
  comment: { authorUserId?: string; authorRole: string; body: string },
  now: () => string = () => new Date().toISOString(),
): InboxComment {
  if (!itemId.trim()) {
    throw new Error('addInboxComment requires an item id');
  }
  const body = comment.body.trim();
  if (!body) {
    throw new Error('Comment body cannot be empty');
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment exceeds ${MAX_COMMENT_LENGTH} characters`);
  }
  if (!comment.authorRole.trim()) {
    throw new Error('addInboxComment requires an author role');
  }

  const entry: InboxComment = {
    id: createCommentId(),
    itemId,
    authorUserId: comment.authorUserId,
    authorRole: comment.authorRole,
    body,
    createdAt: now(),
  };

  const existing = comments.get(itemId) || [];
  const next = [...existing, entry].slice(-MAX_COMMENTS_PER_ITEM);
  comments.set(itemId, next);
  return { ...entry };
}

export function listInboxComments(itemId: string): InboxComment[] {
  return (comments.get(itemId) || []).map((c) => ({ ...c }));
}

export function countInboxComments(itemId: string): number {
  return comments.get(itemId)?.length || 0;
}

export function clearInboxCollaborationForTests(): void {
  assignments.clear();
  comments.clear();
}
