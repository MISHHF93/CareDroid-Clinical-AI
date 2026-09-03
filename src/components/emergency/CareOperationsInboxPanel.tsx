import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCareOperationsInbox,
  transitionCareTask,
  type CareTask,
  type CareTaskStatus,
  type CareTaskType,
} from '../../services/careOperationsApi';
import { touchSurfaceView } from '../../services/surfaceViewsApi';
import './CareOperationsInboxPanel.css';

const CARE_TASK_TYPE_LABELS: Record<CareTaskType, string> = {
  reassessment_due: 'Reassessment due',
  ems_handoff_pending: 'EMS handoff pending',
  operational_exception: 'Operational exception',
};

function CareTaskRow({
  task,
  busy,
  isNew,
  onTransition,
}: {
  task: CareTask;
  busy: boolean;
  isNew: boolean;
  onTransition: (id: string, status: CareTaskStatus) => void;
}) {
  const ownerLabel = task.ownerUserId
    ? 'Claimed'
    : task.ownerRole
      ? `Unclaimed · ${task.ownerRole.replace(/_/g, ' ')}`
      : 'Unassigned';

  return (
    <article className="care-ops-inbox__row" data-overdue={task.isOverdue || undefined}>
      <div className="care-ops-inbox__row-main">
        <strong className="care-ops-inbox__row-title">
          {isNew ? <span className="care-ops-inbox__new-badge">NEW</span> : null}
          {task.reason}
        </strong>
        <div className="care-ops-inbox__row-meta">
          {CARE_TASK_TYPE_LABELS[task.taskType]} · {ownerLabel}
          {task.dueAt && ` · Due ${new Date(task.dueAt).toLocaleTimeString()}`}
        </div>
      </div>
      <div className="care-ops-inbox__row-actions">
        {task.deepLink && (
          <Link to={task.deepLink} className="care-ops-inbox__chip">
            Open
          </Link>
        )}
        {task.status === 'OPEN' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onTransition(task.id, 'ACKNOWLEDGED')}
            className="care-ops-inbox__btn care-ops-inbox__btn--primary"
          >
            Claim
          </button>
        )}
        {task.status === 'ACKNOWLEDGED' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onTransition(task.id, 'IN_PROGRESS')}
            className="care-ops-inbox__btn care-ops-inbox__btn--primary"
          >
            Start
          </button>
        )}
        {(task.status === 'ACKNOWLEDGED' || task.status === 'IN_PROGRESS') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onTransition(task.id, 'COMPLETED')}
            className="care-ops-inbox__btn care-ops-inbox__btn--primary"
          >
            Complete
          </button>
        )}
        {task.status === 'OPEN' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onTransition(task.id, 'CANCELLED')}
            className="care-ops-inbox__btn"
          >
            Dismiss
          </button>
        )}
      </div>
      <span className="care-ops-inbox__status" data-status={task.isOverdue ? 'attention' : 'ready'}>
        {task.isOverdue ? 'OVERDUE' : task.status.replace(/_/g, ' ')}
      </span>
    </article>
  );
}

/**
 * Care Operations Inbox -- one role-aware, backend-persisted list of real
 * outstanding operational work (registration exceptions, reassessment-due,
 * EMS handoff-pending). Self-contained so it can mount on any operational
 * page (Handoffs, Shift Summary) without depending on that page's own CSS.
 */
export default function CareOperationsInboxPanel({
  title = 'Care Operations Inbox',
  lead = 'Real outstanding work claimed and closed here -- not scattered notes or memory.',
  surfaceKey = 'care-operations-inbox',
}: {
  title?: string;
  lead?: string;
  /**
   * Item 6 (change-since-last-view). Both mounts of this panel (Handoffs,
   * Shift Summary) show the SAME underlying inbox, so they deliberately
   * share the default key -- viewing it from either page marks it seen for
   * both, which matches what a user would actually expect.
   */
  surfaceKey?: string;
}) {
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [previousViewedAt, setPreviousViewedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await fetchCareOperationsInbox();
    if (result.ok) setTasks(result.tasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    touchSurfaceView(surfaceKey).then((result) => {
      if (!cancelled && result.ok) setPreviousViewedAt(result.previousViewedAt);
    });
    return () => {
      cancelled = true;
    };
    // Deliberately runs once per mount, not per refresh -- re-touching on every
    // 15s poll would make "new" flicker off almost immediately.
  }, [surfaceKey]);

  const isTaskNew = useCallback(
    (task: CareTask) =>
      previousViewedAt !== null && new Date(task.createdAt) > new Date(previousViewedAt),
    [previousViewedAt],
  );

  async function handleTransition(id: string, status: CareTaskStatus) {
    setPendingId(id);
    await transitionCareTask(id, status);
    await refresh();
    setPendingId(null);
  }

  const overdueCount = tasks.filter((task) => task.isOverdue).length;
  const newCount = tasks.filter(isTaskNew).length;

  return (
    <section className="care-ops-inbox">
      <div className="care-ops-inbox__header">
        <div>
          <strong>{title}</strong>
          <p className="care-ops-inbox__lead">{lead}</p>
        </div>
        <span className="care-ops-inbox__badge">{loading ? '…' : tasks.length}</span>
      </div>

      {overdueCount > 0 && (
        <div className="care-ops-inbox__overdue-banner">
          ⚡ {overdueCount} item{overdueCount > 1 ? 's' : ''} overdue
        </div>
      )}

      {newCount > 0 && (
        <div className="care-ops-inbox__new-banner">{newCount} new since you last checked</div>
      )}

      {!loading && tasks.length === 0 ? (
        <p className="care-ops-inbox__empty">
          Inbox clear -- no outstanding registration, reassessment, or handoff work right now.
        </p>
      ) : (
        <div className="care-ops-inbox__list">
          {tasks.map((task) => (
            <CareTaskRow
              key={task.id}
              task={task}
              busy={pendingId === task.id}
              isNew={isTaskNew(task)}
              onTransition={handleTransition}
            />
          ))}
        </div>
      )}
    </section>
  );
}
