/**
 * Shared Interactive AI Workspace shell for Reception, EMS, Triage, etc.
 * Role adapts channel, prompts, and density — safety/permissions never adapt
 * from informal usage patterns.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  isTerminalStreamState,
  streamStateLabel,
  type AIActionProposal,
  type RealtimeConnectionStatus,
  type StreamProgressEvent,
  type SuggestedPrompt,
  type WorkflowAiCard,
} from '../../contracts/interactiveAi';
import {
  approveProposalApi,
  createActionProposalApi,
  executeProposalApi,
  getActionProposalApi,
  rejectProposalApi,
  rollbackProposalApi,
} from '../../services/interactiveAi/actionProposalApi';
import { runInteractiveAssist } from '../../services/interactiveAi/interactiveAiOrchestrator';
import {
  acknowledgeWorkflowCard,
  buildWorkflowAiCard,
  dismissWorkflowCard,
  listWorkflowAiCards,
  type WorkflowTriggerEvent,
} from '../../services/interactiveAi/workflowAiCards';
import { startInteractiveRealtimeClient } from '../../services/interactiveAi/interactiveRealtimeClient';
import {
  AI_COMMAND_EVENT,
  commandMatchesChannel,
  consumePendingAiCommand,
  getAiPaletteCommand,
} from '../../services/interactiveAi/aiCommandRegistry';
import { getSuggestedPrompts } from '../../services/interactiveAi/suggestedPrompts';
import {
  applyNavigationProposal,
  isNavigationProposalTool,
  looksLikeNavigationPrompt,
  navigationIntentToProposalInput,
  resolvePromptNavigationIntent,
} from '../../services/interactiveAi/promptNavigationIntent';
import { resolveUnifiedChannelFromRole } from '../../services/unifiedAiEnvelope';
import { AccountableRecommendationCard } from '../ai/AccountableRecommendationCard';
import type { AccountableRecommendation } from '../../contracts/accountableAi';
import { InteractionInbox } from './InteractionInbox';
import { useSecurityAccess } from '../../hooks/useSecurityAccess';
import { Permission } from '../../config/backendPermissionCatalog';
import './interactiveAi.css';

export type InteractiveAIWorkspaceProps = {
  role: string;
  organizationId?: string;
  userId?: string;
  patientId?: string;
  pageId?: string;
  channel?: string;
  purpose?: string;
  title?: string;
  seedTriggers?: WorkflowTriggerEvent[];
  permissions?: string[];
};

export function InteractiveAIWorkspace({
  role,
  organizationId,
  userId,
  patientId,
  pageId,
  channel: channelProp,
  purpose = 'interactive_workspace',
  title,
  seedTriggers = [],
  permissions: permissionsProp,
}: InteractiveAIWorkspaceProps) {
  const channel = channelProp || resolveUnifiedChannelFromRole(role, 'api');
  const security = useSecurityAccess();
  // HEAL-347.37: this used to default to a hardcoded, always-permissive
  // ['use_ai_chat', 'view_phi', 'view_operations'] array. No real caller
  // (Reception/Triage/EMS panels) ever overrode it, so contextAssembler's
  // view_phi gate always passed regardless of the signed-in user's actual
  // role or permissions -- every role saw confirmed_patient_fact/ocr_extraction
  // PHI context items. Deriving from useSecurityAccess() (the same
  // real, role-derived engine that gates routes/mutations elsewhere) makes
  // this reflect the signed-in user instead of a fiction.
  const permissions = useMemo(() => {
    if (permissionsProp) return permissionsProp;
    const derived: string[] = [];
    if (security.can(Permission.USE_AI_CHAT)) derived.push('use_ai_chat');
    if (security.canAccessPhi('view')) derived.push('view_phi');
    if (security.can(Permission.VIEW_OPERATIONS)) derived.push('view_operations');
    return derived;
  }, [permissionsProp, security]);
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<StreamProgressEvent | null>(null);
  const [content, setContent] = useState('');
  const [accountable, setAccountable] = useState<AccountableRecommendation | null>(null);
  const [proposal, setProposal] = useState<AIActionProposal | null>(null);
  const [cards, setCards] = useState<WorkflowAiCard[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedPrompt[]>([]);
  const [realtime, setRealtime] = useState<RealtimeConnectionStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showInbox, setShowInbox] = useState(true);
  const [inboxTick, setInboxTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  const heading = title || (channel === 'reception' ? 'Reception Copilot' : channel === 'ems' ? 'EMS Assist' : 'CareDroid Assist');
  const isNavProposal = proposal ? isNavigationProposalTool(proposal.toolName) : false;

  const refreshCards = useCallback(() => {
    setCards(listWorkflowAiCards({ channel, patientId }));
  }, [channel, patientId]);

  const seedKey = useMemo(
    () => seedTriggers.map((t) => t.kind).join('|'),
    [seedTriggers],
  );

  useEffect(() => {
    for (const trigger of seedTriggers) {
      buildWorkflowAiCard({
        ...trigger,
        channel: trigger.channel || channel,
        patientId: trigger.patientId || patientId,
      });
    }
    refreshCards();
    // The personal inbox is a separate component with its own memoized read
    // of the card/proposal stores — without this it never learns that
    // seeding just added cards, and silently under-reports open items.
    if (seedTriggers.length) setInboxTick((n) => n + 1);
    setSuggestions(
      getSuggestedPrompts({
        channel,
        role,
        pageId,
        hasPatient: Boolean(patientId),
        hasEmsArrival: channel === 'ems',
        hasOcrJob: seedKey.includes('new_ocr_document'),
        missingRegistrationFields:
          channel === 'reception' ? ['insurance', 'next_of_kin'] : undefined,
      }),
    );
    // seedTriggers content is summarized by seedKey to avoid identity thrash
  }, [channel, role, pageId, patientId, seedKey, refreshCards]);

  useEffect(() => {
    const stop = startInteractiveRealtimeClient({
      organizationId,
      onStatus: setRealtime,
    });
    return () => stop();
  }, [organizationId]);

  const announce = useCallback((message: string) => {
    // Announce meaningful status segments only — not every token.
    setStatusMessage(message);
  }, []);

  const runQuery = useCallback(
    async (query: string) => {
      const clean = query.trim();
      if (!clean || loading) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setContent('');
      setAccountable(null);
      setProposal(null);
      setProgress(null);
      announce('Starting assist request');

      try {
        // Closed-catalog navigation/open before free-text assist.
        // Never lets the model invent routes — only known intents open pages/tools.
        if (looksLikeNavigationPrompt(clean)) {
          const intent = resolvePromptNavigationIntent(clean, { role, permissions });
          if (intent) {
            const requestId = `nav-${Date.now().toString(36)}`;
            const created = await createActionProposalApi(
              navigationIntentToProposalInput(intent, {
                originatingRequestId: requestId,
                correlationId: requestId,
                patientId,
                userId,
                role,
              }),
            );
            setProposal(created);
            setContent(
              `I can open ${intent.label} for you. Review the action card, then confirm to open it in CareDroid.`,
            );
            setSuggestions(
              getSuggestedPrompts({
                channel,
                role,
                pageId,
                hasPatient: Boolean(patientId),
              }),
            );
            setInboxTick((n) => n + 1);
            announce(`Ready to open: ${intent.label}`);
            return;
          }
        }

        const result = await runInteractiveAssist({
          query: clean,
          role,
          permissions,
          organizationId,
          userId,
          patientId,
          pageId,
          channel,
          purpose,
          signal: controller.signal,
          onProgress: (event) => {
            setProgress(event);
            if (
              event.state === 'checking_safety' ||
              event.state === 'awaiting_human_approval' ||
              isTerminalStreamState(event.state)
            ) {
              announce(event.message);
            }
          },
          contextItems: patientId
            ? [
                {
                  id: `patient-${patientId}`,
                  kind: 'confirmed_patient_fact',
                  label: 'Selected patient',
                  summary: `Patient context ${patientId}`,
                  patientId,
                  version: '1',
                },
              ]
            : [],
        });

        setContent(result.content);
        setAccountable(result.accountable);
        setProposal(result.proposal || null);
        setSuggestions(result.suggestedPrompts);
        if (result.progress.length) {
          setProgress(result.progress[result.progress.length - 1]);
        }
        setInboxTick((n) => n + 1);
        announce(isTerminalStreamState(result.finalState) ? streamStateLabel(result.finalState) : 'Updated');
      } finally {
        setLoading(false);
      }
    },
    [announce, channel, loading, organizationId, pageId, patientId, permissions, purpose, role, userId],
  );

  // Typed palette commands (IX14): only registry ids arrive here — the id is
  // re-validated against the closed registry, the channel and the user's
  // permissions before the FIXED template query runs. Unknown ids are refused.
  const runPaletteCommand = useCallback(
    (commandId: string) => {
      const command = getAiPaletteCommand(commandId);
      if (!command) {
        announce('Ignored unknown AI command');
        return;
      }
      if (!commandMatchesChannel(command, channel)) return;
      if (!permissions.includes(command.requiredPermission)) {
        announce(`Not permitted: ${command.label}`);
        return;
      }
      announce(`Running ${command.label}`);
      void runQuery(command.query);
    },
    [announce, channel, permissions, runQuery],
  );

  const consumedPendingRef = useRef(false);
  useEffect(() => {
    if (!consumedPendingRef.current) {
      consumedPendingRef.current = true;
      const pending = consumePendingAiCommand();
      if (pending) runPaletteCommand(pending);
    }
    const onCommand = (event: Event) => {
      const commandId = (event as CustomEvent<{ commandId?: string }>).detail?.commandId;
      if (typeof commandId === 'string') runPaletteCommand(commandId);
    };
    document.addEventListener(AI_COMMAND_EVENT, onCommand);
    return () => document.removeEventListener(AI_COMMAND_EVENT, onCommand);
  }, [runPaletteCommand]);

  const onCancel = () => {
    abortRef.current?.abort();
    announce('Cancellation requested');
  };

  const onApproveProposal = async () => {
    if (!proposal) return;
    try {
      // Navigation proposals may execute from proposed when requiresApproval is false.
      let current = proposal;
      if (current.requiresApproval || current.state === 'proposed' || current.state === 'reviewing') {
        if (current.state === 'proposed' || current.state === 'reviewing') {
          current = await approveProposalApi(current.proposalId);
        }
      }
      // The backend's execute endpoint records a pre-computed outcome rather
      // than running arbitrary logic server-side ("records draft outcome; no
      // silent chart writes") -- run the same local executor logic first,
      // then report its result for durable, audited recording.
      let result: Record<string, unknown>;
      if (isNavigationProposalTool(current.toolName)) {
        const navResult = applyNavigationProposal(current, {
          navigate: (path) => navigate(path),
          currentPath: location.pathname + location.search,
        });
        const opened =
          typeof navResult.opened === 'string' ? navResult.opened : current.previewSummary || current.toolName;
        announce(`Opened ${opened}`);
        result = navResult;
      } else {
        result = {
          ok: true,
          toolName: current.toolName,
          draftSaved: true,
          note: 'Draft stored for review — no chart write performed.',
        };
      }
      const executed = await executeProposalApi(current.proposalId, result);
      setProposal(executed);
      setInboxTick((n) => n + 1);
      if (!isNavigationProposalTool(executed.toolName)) {
        announce(`Proposal ${executed.state}`);
      } else if (executed.state === 'completed') {
        const label =
          typeof executed.validatedArguments?.label === 'string'
            ? executed.validatedArguments.label
            : executed.previewSummary;
        setContent((prev) => (prev ? `${prev}\n\nOpened: ${label}` : `Opened: ${label}`));
      }
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Proposal failed');
    }
  };

  const onRejectProposal = async () => {
    if (!proposal) return;
    try {
      const next = await rejectProposalApi(proposal.proposalId, 'User rejected after preview');
      setProposal(next);
      setInboxTick((n) => n + 1);
      announce('Proposal rejected');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Reject failed');
    }
  };

  const onRollbackProposal = async () => {
    if (!proposal) return;
    try {
      const next = await rollbackProposalApi(proposal.proposalId);
      setProposal(next);
      setInboxTick((n) => n + 1);
      announce('Proposal rolled back');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Rollback failed');
    }
  };

  const progressPercent = progress?.percent ?? (loading ? 15 : 0);
  const progressClass = progress
    ? `cd-iaw__progress--${progress.state}`
    : loading
      ? 'cd-iaw__progress--validating_request'
      : '';

  const contextChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; kind: string }> = [];
    chips.push({ id: 'channel', label: `Channel: ${channel}`, kind: 'scope' });
    chips.push({ id: 'role', label: `Role: ${role}`, kind: 'scope' });
    if (patientId) chips.push({ id: 'patient', label: `Patient: ${patientId}`, kind: 'patient' });
    return chips;
  }, [channel, role, patientId]);

  return (
    <section
      className="cd-iaw"
      data-testid="interactive-ai-workspace"
      data-channel={channel}
      aria-label={heading}
    >
      <header className="cd-iaw__header">
        <h2 className="cd-iaw__title">
          <span className="cd-iaw__ai-mark" aria-hidden="true" />
          {heading}
        </h2>
        <div className="cd-iaw__header-actions">
          <button
            type="button"
            className="cd-iaw__suggestion"
            aria-pressed={showInbox ? 'true' : 'false'}
            onClick={() => setShowInbox((v) => !v)}
          >
            Inbox
          </button>
          <div
            className="cd-iaw__realtime"
            data-live={realtime && !realtime.isStale && realtime.status === 'connected' ? 'true' : 'false'}
            data-testid="interactive-realtime-status"
          >
            {realtime
              ? // Plain-English connection health -- realtime.mode ('sse'/'polling') is a
                // transport implementation detail with no clinical relevance, so it's
                // deliberately not shown; only whether updates are live and current matter.
                `${realtime.status === 'connected' ? 'Live' : 'Reconnecting…'}${realtime.isStale ? ' · may be outdated' : ''}`
              : 'Not connected'}
          </div>
        </div>
      </header>

      {showInbox ? (
        <InteractionInbox
          key={inboxTick}
          ownerUserId={userId}
          ownerRole={role}
          channel={channel}
          onOpenItem={async (item) => {
            if (item.kind === 'proposal' || item.kind === 'failed_action' || item.kind === 'draft') {
              const p = await getActionProposalApi(item.sourceId);
              if (p) setProposal(p);
            }
            if (item.summary) setInput(item.summary);
            announce(`Opened inbox item: ${item.title}`);
          }}
        />
      ) : null}

      <div className="cd-iaw__context-bar" data-testid="interactive-context-bar" aria-label="Attached context">
        {contextChips.map((chip) => (
          <span key={chip.id} className="cd-iaw__chip">
            {chip.label}
          </span>
        ))}
      </div>

      {(loading || progress) && (
        <div
          className={`cd-iaw__progress ${progressClass}`}
          data-testid="interactive-stream-progress"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="cd-iaw__progress-label">
            {progress ? progress.message : streamStateLabel('validating_request')}
          </div>
          <div className="cd-iaw__progress-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }} />
          </div>
        </div>
      )}

      <div className="cd-iaw__body">
        {cards.map((card) => (
          <article
            key={card.cardId}
            className={`cd-iaw-card cd-iaw-card--${card.urgency}`}
            data-testid="workflow-ai-card"
          >
            <h3 className="cd-iaw-card__title">{card.title}</h3>
            <p className="cd-iaw-card__preview">
              {card.summary}
            </p>
            <div className="cd-iaw-card__meta">
              <span>{card.source}</span>
              <span>{card.urgency}</span>
              <span>{new Date(card.timestamp).toLocaleTimeString()}</span>
              {card.ownerRole ? <span>Owner: {card.ownerRole}</span> : null}
            </div>
            <div className="cd-iaw-card__actions">
              {card.recommendedActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => runQuery(action.label)}
                >
                  {action.label}
                  {action.requiresApproval ? ' (review)' : ''}
                </button>
              ))}
              {card.acknowledged ? (
                <span className="cd-iaw-card__ack" data-testid="workflow-card-acknowledged">
                  Acknowledged
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    acknowledgeWorkflowCard(card.cardId);
                    refreshCards();
                  }}
                >
                  Acknowledge
                </button>
              )}
              {card.dismissible ? (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      dismissWorkflowCard(card.cardId);
                      refreshCards();
                    } catch (error) {
                      announce(error instanceof Error ? error.message : 'Cannot dismiss');
                    }
                  }}
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </article>
        ))}

        {content ? (
          <div className="cd-iaw__response" data-testid="interactive-response">
            {content}
          </div>
        ) : null}

        {accountable ? <AccountableRecommendationCard recommendation={accountable} compact /> : null}

        {proposal ? (
          <article className="cd-iaw-proposal" data-testid="action-proposal-card">
            <h3 className="cd-iaw-proposal__title">Action proposal · {proposal.state}</h3>
            <div className="cd-iaw-proposal__preview">{proposal.previewSummary}</div>
            <div className="cd-iaw-proposal__preview">
              <strong>Expected effect:</strong> {proposal.expectedEffect}
            </div>
            <div className="cd-iaw-proposal__preview">
              <strong>Risk:</strong> {proposal.riskLevel} · <strong>Reversible:</strong>{' '}
              {proposal.rollbackCapable ? 'yes' : 'no'}
            </div>
            <ul className="cd-iaw-proposal__changes">
              {proposal.dataWillChange.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="cd-iaw-proposal__actions">
              {(proposal.state === 'proposed' || proposal.state === 'reviewing' || proposal.state === 'approved') && (
                <>
                  <button
                    type="button"
                    className="cd-iaw-approve"
                    data-testid="action-proposal-approve"
                    onClick={onApproveProposal}
                  >
                    {isNavProposal ? 'Open' : 'Approve & execute draft'}
                  </button>
                  <button type="button" className="cd-iaw-reject" onClick={onRejectProposal}>
                    Cancel
                  </button>
                </>
              )}
              {proposal.state === 'completed' && proposal.rollbackCapable ? (
                <button type="button" onClick={onRollbackProposal}>
                  Undo (rollback)
                </button>
              ) : null}
            </div>
          </article>
        ) : null}

        <div className="cd-iaw__suggestions" aria-label="Suggested prompts">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="cd-iaw__suggestion"
              onClick={() => {
                setInput(s.prompt);
                void runQuery(s.prompt);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <form
        className="cd-iaw__composer"
        onSubmit={(event) => {
          event.preventDefault();
          void runQuery(input);
          setInput('');
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for help completing this workflow…"
          aria-label="Assist message"
          disabled={loading}
        />
        {loading ? (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="cd-iaw__send" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>

      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="cd-iaw__sr-only"
        data-testid="interactive-live-region"
      >
        {statusMessage}
      </div>
    </section>
  );
}

export default InteractiveAIWorkspace;
