/**
 * Personal interaction inbox — proposals, workflow cards, failed actions.
 */

import { useMemo, useState } from 'react';
import {
  buildInteractionInbox,
  type InboxItemKind,
  type InteractionInboxItem,
} from '../../services/interactiveAi/interactionInbox';
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
  const items = useMemo(
    () =>
      buildInteractionInbox({
        ownerUserId,
        ownerRole,
        channel,
        kind: kind === 'all' ? undefined : kind,
        includeTerminal: kind === 'failed_action' || kind === 'draft',
      }),
    [ownerUserId, ownerRole, channel, kind],
  );

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
          {items.map((item) => (
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default InteractionInbox;
