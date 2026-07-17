/**
 * Personal interaction inbox — proposals, workflow cards, failed actions,
 * plus lightweight assign/comment collaboration on top (IX13).
 */

import { useMemo, useState } from 'react';
import {
  buildInteractionInbox,
  type InboxItemKind,
  type InteractionInboxItem,
} from '../../services/interactiveAi/interactionInbox';
import {
  addInboxComment,
  assignInboxItem,
  listInboxComments,
  unassignInboxItem,
} from '../../services/interactiveAi/inboxCollaboration';
import './interactiveAi.css';

export type InteractionInboxProps = {
  ownerUserId?: string;
  ownerRole?: string;
  channel?: string;
  onOpenItem?: (item: InteractionInboxItem) => void;
};

const FILTERS: Array<{ id: 'all' | InboxItemKind; label: string }> = [
  { id: 'all', label: 'All open' },
  { id: 'proposal', label: 'Proposals' },
  { id: 'workflow_card', label: 'Cards' },
  { id: 'failed_action', label: 'Failed' },
  { id: 'draft', label: 'Drafts' },
];

export function InteractionInbox({
  ownerUserId,
  ownerRole,
  channel,
  onOpenItem,
}: InteractionInboxProps) {
  const [kind, setKind] = useState<'all' | InboxItemKind>('all');
  const [collabTick, setCollabTick] = useState(0);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const items = useMemo(
    () =>
      buildInteractionInbox({
        ownerUserId,
        ownerRole,
        channel,
        kind: kind === 'all' ? undefined : kind,
        includeTerminal: kind === 'failed_action' || kind === 'draft',
      }),
    // collabTick forces a re-read after assign/comment mutate the
    // collaboration store, which buildInteractionInbox reads but doesn't
    // itself trigger React state changes for.
    [ownerUserId, ownerRole, channel, kind, collabTick],
  );

  function toggleAssignToMe(item: InteractionInboxItem) {
    if (item.assignedToUserId && item.assignedToUserId === ownerUserId) {
      unassignInboxItem(item.id);
    } else {
      assignInboxItem(item.id, { userId: ownerUserId, role: ownerRole }, ownerUserId);
    }
    setCollabTick((n) => n + 1);
  }

  function submitComment(item: InteractionInboxItem) {
    const body = commentDraft.trim();
    if (!body) return;
    addInboxComment(item.id, { authorUserId: ownerUserId, authorRole: ownerRole || 'unknown', body });
    setCommentDraft('');
    setCollabTick((n) => n + 1);
  }

  return (
    <section
      className="cd-iaw-inbox"
      data-testid="interaction-inbox"
      aria-label="Interaction inbox"
    >
      <header className="cd-iaw-inbox__header">
        <h3 className="cd-iaw-inbox__title">Inbox</h3>
        <span className="cd-iaw-inbox__count" role="status">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="cd-iaw-inbox__filters" role="toolbar" aria-label="Inbox filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="cd-iaw__suggestion"
            aria-pressed={kind === f.id}
            onClick={() => setKind(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="cd-iaw-inbox__empty" role="status">
          No open interaction items for this role.
        </p>
      ) : (
        <ul className="cd-iaw-inbox__list">
          {items.map((item) => {
            const isExpanded = expandedItemId === item.id;
            const assignedToMe = Boolean(item.assignedToUserId) && item.assignedToUserId === ownerUserId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`cd-iaw-inbox__item cd-iaw-inbox__item--${item.urgency}`}
                  onClick={() => onOpenItem?.(item)}
                >
                  <span className="cd-iaw-inbox__item-title">{item.title}</span>
                  <span className="cd-iaw-inbox__item-summary">{item.summary}</span>
                  <span className="cd-iaw-inbox__item-meta">
                    {item.kind} · {item.state}
                    {item.dueAt ? ` · due ${new Date(item.dueAt).toLocaleString()}` : ''}
                    {item.resumable ? ' · resumable' : ''}
                  </span>
                </button>

                <div className="cd-iaw-inbox__collab" data-testid="inbox-item-collab">
                  <span
                    className="cd-iaw-inbox__assignment"
                    data-testid="inbox-item-assignment"
                    role="status"
                  >
                    {item.assignedToUserId || item.assignedToRole
                      ? `Assigned to ${item.assignedToUserId || item.assignedToRole}`
                      : 'Unassigned'}
                  </span>
                  <button
                    type="button"
                    className="cd-iaw__suggestion"
                    data-testid="inbox-item-assign-toggle"
                    aria-pressed={assignedToMe}
                    onClick={() => toggleAssignToMe(item)}
                  >
                    {assignedToMe ? 'Unassign' : 'Assign to me'}
                  </button>
                  <button
                    type="button"
                    className="cd-iaw__suggestion"
                    data-testid="inbox-item-comments-toggle"
                    aria-expanded={isExpanded}
                    onClick={() => {
                      setExpandedItemId(isExpanded ? null : item.id);
                      setCommentDraft('');
                    }}
                  >
                    {item.commentCount} comment{item.commentCount === 1 ? '' : 's'}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="cd-iaw-inbox__thread" data-testid="inbox-item-thread">
                    {listInboxComments(item.id).length ? (
                      <ul className="cd-iaw-inbox__comment-list">
                        {listInboxComments(item.id).map((comment) => (
                          <li key={comment.id} className="cd-iaw-inbox__comment">
                            <span className="cd-iaw-inbox__comment-author">
                              {comment.authorUserId || comment.authorRole}
                            </span>
                            <span className="cd-iaw-inbox__comment-body">{comment.body}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="cd-iaw-inbox__empty" role="status">
                        No comments yet.
                      </p>
                    )}
                    <form
                      className="cd-iaw-inbox__comment-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitComment(item);
                      }}
                    >
                      <textarea
                        value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        placeholder="Add a comment for the team…"
                        aria-label={`Comment on ${item.title}`}
                        data-testid="inbox-item-comment-input"
                      />
                      <button type="submit" disabled={!commentDraft.trim()} data-testid="inbox-item-comment-submit">
                        Add comment
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default InteractionInbox;
