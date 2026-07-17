/**
 * Interactive Intelligence IX11 — render an AIActionProposal for human
 * decision. The user previews the exact operation (tool + validated
 * arguments), sees risk, reversibility, expiry, and provenance, and can
 * approve or reject. Terminal and expired proposals disable actions instead
 * of hiding what happened; the audit trail is always inspectable.
 */
import {
  isProposalActionable,
  isProposalExpired,
  type AIActionProposal,
} from '../../contracts/aiInteraction';
import './ActionProposalCard.css';

export type ActionProposalCardProps = {
  proposal: AIActionProposal;
  patientName?: string;
  /** True when no authoritative server record exists (offline/demo). */
  sessionOnly?: boolean;
  /** Disables actions while an approve/reject is in flight. */
  busy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  /** Injectable clock for deterministic expiry rendering in tests. */
  now?: () => Date;
};

const STATE_TONE: Record<string, 'active' | 'good' | 'warn' | 'critical'> = {
  proposed: 'active',
  reviewing: 'active',
  approved: 'active',
  executing: 'active',
  completed: 'good',
  rolled_back: 'warn',
  cancelled: 'warn',
  expired: 'warn',
  rejected: 'warn',
  failed: 'critical',
};

function stateLabel(state: AIActionProposal['state']): string {
  return state.replace(/_/g, ' ');
}

export function ActionProposalCard({
  proposal,
  patientName,
  sessionOnly = false,
  busy = false,
  onApprove,
  onReject,
  now = () => new Date(),
}: ActionProposalCardProps) {
  const expired = isProposalExpired(proposal, now);
  const actionable = isProposalActionable(proposal, now) && !busy;
  const tone = expired && STATE_TONE[proposal.state] === 'active' ? 'warn' : STATE_TONE[proposal.state];

  return (
    <article
      className={`cd-proposal cd-proposal--${tone}`}
      data-ai="true"
      data-testid="action-proposal-card"
      data-state={proposal.state}
      aria-label={`AI action proposal: ${proposal.toolName}`}
    >
      <header className="cd-proposal__header">
        <span className="cd-proposal__tool">{proposal.toolName}</span>
        <span
          className={`cd-proposal__pill cd-proposal__pill--risk-${proposal.riskLevel}`}
          data-testid="proposal-risk"
        >
          {proposal.riskLevel} risk
        </span>
        <span
          className={`cd-proposal__pill cd-proposal__pill--${tone}`}
          data-testid="proposal-state"
        >
          {expired && proposal.state !== 'expired' ? 'expired' : stateLabel(proposal.state)}
        </span>
        {sessionOnly ? (
          <span className="cd-proposal__pill cd-proposal__pill--session" data-testid="proposal-session-only">
            session only — not persisted
          </span>
        ) : null}
      </header>

      <p className="cd-proposal__effect" data-testid="proposal-effect">
        {proposal.expectedEffect}
        {patientName ? <span className="cd-proposal__patient"> · {patientName}</span> : null}
      </p>

      <details className="cd-proposal__details">
        <summary>Exact operation</summary>
        <pre className="cd-proposal__args" data-testid="proposal-arguments">
          {JSON.stringify({ tool: proposal.toolName, arguments: proposal.validatedArguments }, null, 2)}
        </pre>
      </details>

      <p className="cd-proposal__rollback" data-testid="proposal-rollback">
        {proposal.rollback.supported
          ? `Reversible: ${proposal.rollback.note || 'can be rolled back after execution.'}`
          : `Not automatically reversible${proposal.rollback.note ? ` — ${proposal.rollback.note}` : '.'}`}
      </p>

      {proposal.transitions.length > 0 ? (
        <details className="cd-proposal__details">
          <summary>History ({proposal.transitions.length})</summary>
          <ol className="cd-proposal__history" data-testid="proposal-history">
            {proposal.transitions.map((transition, index) => (
              <li key={`${transition.at}-${index}`}>
                <span className="cd-proposal__history-move">
                  {stateLabel(transition.from)} → {stateLabel(transition.to)}
                </span>{' '}
                by {transition.actor}
                {transition.note ? ` — ${transition.note}` : ''}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <footer className="cd-proposal__meta">
        <span>Model: {proposal.modelVersion}</span>
        <span>Prompt: {proposal.promptVersion}</span>
        <span data-testid="proposal-expiry">
          {expired
            ? 'Expired — request a fresh proposal'
            : `Approval window closes ${new Date(proposal.expiresAt).toLocaleTimeString()}`}
        </span>
      </footer>

      {actionable ? (
        <div className="cd-proposal__actions">
          <button
            type="button"
            className="cd-proposal__approve"
            onClick={onApprove}
            data-testid="proposal-approve"
          >
            Approve
            {proposal.requiredPermission ? (
              <span className="cd-proposal__perm"> (requires {proposal.requiredPermission})</span>
            ) : null}
          </button>
          <button
            type="button"
            className="cd-proposal__reject"
            onClick={onReject}
            data-testid="proposal-reject"
          >
            Reject
          </button>
        </div>
      ) : (
        <p className="cd-proposal__closed" role="status" data-testid="proposal-closed">
          {busy
            ? 'Working…'
            : expired && proposal.state !== 'expired'
              ? 'This proposal expired before a decision was made.'
              : `No further action available — proposal is ${stateLabel(proposal.state)}.`}
        </p>
      )}
    </article>
  );
}

export default ActionProposalCard;
