/**
 * Shared Interactive AI Workspace shell for Reception, EMS, Triage, etc.
 * Role adapts channel, prompts, and density — safety/permissions never adapt
 * from informal usage patterns.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  approveProposal,
  executeProposal,
  rejectProposal,
  rollbackProposal,
} from '../../services/interactiveAi/actionProposalService';
import { runInteractiveAssist } from '../../services/interactiveAi/interactiveAiOrchestrator';
import {
  acknowledgeWorkflowCard,
  buildWorkflowAiCard,
  dismissWorkflowCard,
  listWorkflowAiCards,
  type WorkflowTriggerEvent,
} from '../../services/interactiveAi/workflowAiCards';
import { startInteractiveRealtimeClient } from '../../services/interactiveAi/interactiveRealtimeClient';
import { getSuggestedPrompts } from '../../services/interactiveAi/suggestedPrompts';
import { resolveUnifiedChannelFromRole } from '../../services/unifiedAiEnvelope';
import { AccountableRecommendationCard } from '../ai/AccountableRecommendationCard';
import type { AccountableRecommendation } from '../../contracts/accountableAi';
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
  permissions = ['use_ai_chat', 'view_phi', 'view_operations'],
}: InteractiveAIWorkspaceProps) {
  const channel = channelProp || resolveUnifiedChannelFromRole(role, 'api');
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
  const abortRef = useRef<AbortController | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  const heading = title || (channel === 'reception' ? 'Reception Copilot' : channel === 'ems' ? 'EMS Assist' : 'CareDroid Assist');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        announce(isTerminalStreamState(result.finalState) ? streamStateLabel(result.finalState) : 'Updated');
      } finally {
        setLoading(false);
      }
    },
    [announce, channel, loading, organizationId, pageId, patientId, permissions, purpose, role, userId],
  );

  const onCancel = () => {
    abortRef.current?.abort();
    announce('Cancellation requested');
  };

  const onApproveProposal = async () => {
    if (!proposal) return;
    try {
      approveProposal(proposal.proposalId, userId);
      const executed = await executeProposal(proposal.proposalId, async (p) => ({
        ok: true,
        toolName: p.toolName,
        draftSaved: true,
        note: 'Draft stored for review — no chart write performed.',
      }));
      setProposal(executed);
      announce(`Proposal ${executed.state}`);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Proposal failed');
    }
  };

  const onRejectProposal = () => {
    if (!proposal) return;
    try {
      const next = rejectProposal(proposal.proposalId, 'User rejected after preview');
      setProposal(next);
      announce('Proposal rejected');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Reject failed');
    }
  };

  const onRollbackProposal = () => {
    if (!proposal) return;
    try {
      const next = rollbackProposal(proposal.proposalId);
      setProposal(next);
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
        <div
          className="cd-iaw__realtime"
          data-live={realtime && !realtime.isStale && realtime.status === 'connected' ? 'true' : 'false'}
          data-testid="interactive-realtime-status"
        >
          {realtime
            ? `${realtime.status} · ${realtime.mode}${realtime.isStale ? ' · stale' : ''}`
            : 'realtime idle'}
        </div>
      </header>

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
            <p className="cd-iaw-card__preview" style={{ margin: 0, fontSize: '0.8rem' }}>
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
              <button
                type="button"
                onClick={() => {
                  acknowledgeWorkflowCard(card.cardId);
                  refreshCards();
                }}
              >
                Acknowledge
              </button>
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
              {(proposal.state === 'proposed' || proposal.state === 'reviewing') && (
                <>
                  <button type="button" className="cd-iaw-approve" onClick={onApproveProposal}>
                    Approve & execute draft
                  </button>
                  <button type="button" className="cd-iaw-reject" onClick={onRejectProposal}>
                    Reject
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
        className="visually-hidden"
        data-testid="interactive-live-region"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {statusMessage}
      </div>
    </section>
  );
}

export default InteractiveAIWorkspace;
