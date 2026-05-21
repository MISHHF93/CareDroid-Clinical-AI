import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { toolRegistryById, getToolById } from '../data/toolRegistry';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import ToolVisualization from '../components/ToolVisualization';
import ToolCard from '../components/ToolCard';
import Citations, { CitationModal } from '../components/Citations';
import ConfidenceBadge from '../components/ConfidenceBadge';
import { Drawer } from '../components/ui/Drawer';
import analyticsService from '../services/analyticsService';
import { getToolRecommendationsNLU, recordRecommendationFeedback } from '../utils/toolRecommendations';
import { scheduleIdleWork } from '../utils/scheduleIdleWork';
import {
  sendClinicalChatMessage,
  mapChatResponseToAssistantMessage,
  registryIdToChatToolParam,
} from '../services/clinicalChatService';
import { NavIcon } from '../navigation/NavIcon';
import { getToolIcon, CHROME_ICONS } from '../navigation/iconRegistry';
import './Dashboard.css';

const OUTREACH_INITIAL_FORM = {
  target: '',
  reason: '',
  timing: 'within 48 hours',
  context: '',
};

function buildOutreachChatPrompt({ target, reason, timing, context }) {
  const contextLine = context?.trim() ? `Additional context: ${context.trim()}` : 'Additional context: none provided';
  return [
    'Create a patient follow-up outreach plan for clinician review.',
    '',
    `Target/context: ${target.trim() || 'not specified yet'}`,
    `Reason for follow-up: ${reason.trim() || 'not specified yet'}`,
    `Timing/next step: ${timing}`,
    contextLine,
    '',
    'Do not send any message or claim outreach has been completed.',
    'Return a concise patient-safe draft, a clinician confirmation checklist, expected result state, and verification/documentation steps.',
  ].join('\n');
}

/**
 * Dashboard — clinical chat (full width). Tools open on dedicated /tools/* routes.
 * Legacy URLs `/dashboard?tool=…` redirect to the matching tool page.
 */
function Dashboard() {
  const { authToken } = useUser();
  const { error } = useNotificationActions();
  const { recordToolAccess } = useToolPreferences();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [recommendedTools, setRecommendedTools] = useState([]);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [sending, setSending] = useState(false);
  const [outreachDrawerOpen, setOutreachDrawerOpen] = useState(false);
  const [outreachForm, setOutreachForm] = useState(OUTREACH_INITIAL_FORM);
  const scrollRef = useRef(null);
  const scrollEndRef = useRef(null);
  const composerInputRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const {
    activeConversationId,
    messages,
    selectedTool,
    addMessage,
    selectTool,
    setActiveTool,
    clearTool,
  } = useConversation();

  const updateScrollStickiness = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  }, []);

  const scrollToConversationEnd = useCallback((behavior = 'smooth') => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior });
  }, []);

  const keepComposerVisible = useCallback(() => {
    if (!shouldStickToBottomRef.current) return;
    window.setTimeout(() => scrollToConversationEnd('smooth'), 80);
  }, [scrollToConversationEnd]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    const raf = window.requestAnimationFrame(() => scrollToConversationEnd('smooth'));
    return () => window.cancelAnimationFrame(raf);
  }, [messages, sending, scrollToConversationEnd]);

  useEffect(() => {
    const handleViewportChange = () => {
      if (!shouldStickToBottomRef.current) return;
      window.requestAnimationFrame(() => scrollToConversationEnd('auto'));
    };

    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [scrollToConversationEnd]);

  const panelRegistryId = searchParams.get('tool');
  const calcFromUrl = searchParams.get('calc');
  const isChatMode = location.pathname === '/chat';
  const selectedToolEntry = selectedTool ? getToolById(selectedTool) : null;
  const activeConversationLabel = activeConversationId ? `Conversation ${activeConversationId}` : 'No conversation';
  const starterPrompts = useMemo(
    () => [
      {
        title: 'Review a patient concern',
        prompt: 'Help me think through this patient presentation:',
        icon: CHROME_ICONS.stethoscope,
      },
      {
        title: 'Check medication safety',
        prompt: 'Check for drug interactions between ',
        icon: CHROME_ICONS.shield,
      },
      {
        title: 'Interpret labs',
        prompt: 'Interpret these lab results and flag critical values:',
        icon: CHROME_ICONS.microscope,
      },
      {
        title: 'Plan follow-up outreach',
        prompt: 'Create a patient follow-up outreach plan for ',
        workflow: 'outreach',
        icon: CHROME_ICONS.messageCircle,
      },
    ],
    []
  );
  const pulseActions = useMemo(
    () => [
      {
        title: 'Review what needs attention',
        body: 'Open active clinical alerts and verify the highest-risk items first.',
        label: 'Review alerts',
        icon: CHROME_ICONS.siren,
        path: '/clinical/alerts',
      },
      {
        title: 'Act with guidance',
        body: 'Start from chat with context instead of memorizing a tool or command phrase.',
        label: 'Open Chat',
        icon: CHROME_ICONS.message,
        path: '/chat',
      },
      {
        title: 'Outreach and follow-up',
        body: 'Draft a follow-up plan, preview the message, then confirm the next step.',
        label: 'Plan outreach',
        icon: CHROME_ICONS.messageCircle,
        workflow: 'outreach',
      },
      {
        title: 'Medication safety',
        body: 'Guide a drug interaction check with structured context and reviewable output.',
        label: 'Check medications',
        icon: CHROME_ICONS.shield,
        path: '/tools/drug-checker',
      },
      {
        title: 'Lab review',
        body: 'Interpret labs with loading, success, and error states handled by the tool page.',
        label: 'Interpret labs',
        icon: CHROME_ICONS.microscope,
        path: '/tools/lab-interpreter',
      },
      {
        title: 'Control access and trust',
        body: 'Manage account, integrations, audit visibility, and platform settings.',
        label: 'Open Control',
        icon: CHROME_ICONS.settings,
        path: '/settings',
      },
    ],
    []
  );
  const outreachPreview = useMemo(() => buildOutreachChatPrompt(outreachForm), [outreachForm]);
  const canConfirmOutreach = Boolean(outreachForm.target.trim() && outreachForm.reason.trim());

  useEffect(() => {
    if (!panelRegistryId) {
      return;
    }
    const entry = toolRegistryById[panelRegistryId];
    if (!entry) {
      clearTool();
      navigate({ pathname: '/dashboard', search: '' }, { replace: true });
      return;
    }

    if (entry.id === 'calculators' && calcFromUrl) {
      setActiveTool(panelRegistryId);
      recordToolAccess(panelRegistryId);
      navigate(`/tools/calculators?calc=${encodeURIComponent(calcFromUrl)}`, { replace: true });
      return;
    }

    const plan = applyRegistryToolLaunch(panelRegistryId, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      replace: true,
    });

    if (plan.mode === 'chat-assisted') {
      navigate({ pathname: '/chat', search: '' }, { replace: true });
    }
  }, [panelRegistryId, calcFromUrl, navigate, setActiveTool, recordToolAccess, clearTool, addMessage, selectTool]);

  const submitChatMessage = async (messageText) => {
    if (!messageText.trim() || sending) return false;
    const text = messageText.trim();
    shouldStickToBottomRef.current = true;
    addMessage(text, 'user');
    setInput('');
    setSending(true);

    try {
      const apiTool = registryIdToChatToolParam(selectedTool);
      const { ok, data } = await sendClinicalChatMessage({
        message: text,
        tool: apiTool,
        conversationId: activeConversationId,
        authToken,
      });

      if (!ok) {
        throw new Error(data?.message || `Request failed`);
      }

      addMessage(mapChatResponseToAssistantMessage(data));
    } catch (err) {
      error('Message failed', err?.message || 'Failed to send message.');
      addMessage({
        role: 'assistant',
        content: 'Unable to reach the clinical AI service. Check your connection and try again.',
        timestamp: new Date(),
      });
    } finally {
      setSending(false);
    }
    return true;
  };

  const handleSendMessage = async () => {
    await submitChatMessage(input);
  };

  const handleSubmitMessage = (event) => {
    event.preventDefault();
    handleSendMessage();
  };

  const openOutreachPlanner = () => {
    setOutreachDrawerOpen(true);
  };

  const handleStarterPrompt = (starter) => {
    if (starter.workflow === 'outreach') {
      openOutreachPlanner();
      return;
    }
    setInput(starter.prompt);
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const openChatWithPrompt = (prompt) => {
    setInput(prompt);
    navigate('/chat');
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const handlePulseAction = (action) => {
    if (action.workflow === 'outreach') {
      openOutreachPlanner();
      return;
    }
    if (action.prompt) {
      openChatWithPrompt(action.prompt);
      return;
    }
    navigate(action.path);
  };

  const updateOutreachField = (field, value) => {
    setOutreachForm((current) => ({ ...current, [field]: value }));
  };

  const handleConfirmOutreach = () => {
    if (!canConfirmOutreach || sending) return;
    setOutreachDrawerOpen(false);
    navigate('/chat');
    void submitChatMessage(outreachPreview);
  };

  const recommendationSource = useMemo(() => {
    if (input.trim()) return input.trim();
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    return lastUser?.content || '';
  }, [input, messages]);

  useEffect(() => {
    let cancelled = false;
    if (!recommendationSource) {
      setRecommendedTools([]);
      return undefined;
    }

    const cancelIdle = scheduleIdleWork(async () => {
      if (cancelled) return;
      try {
        const tools = await getToolRecommendationsNLU(
          recommendationSource,
          { userId: activeConversationId, recentTools: [] },
          3
        );
        if (!cancelled) setRecommendedTools(tools);
      } catch {
        if (!cancelled) setRecommendedTools([]);
      }
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [recommendationSource, activeConversationId]);

  useEffect(() => {
    if (recommendedTools.length > 0) {
      analyticsService.trackEvent({
        eventName: 'tool_recommendations_shown',
        parameters: {
          count: recommendedTools.length,
          source: recommendationSource.slice(0, 120),
        },
      });
    }
  }, [recommendedTools, recommendationSource]);

  return (
    <div className="dashboard-root">
      <div className="dashboard-main">
        <header className="dashboard-chat-header" aria-labelledby="dashboard-chat-title">
          <div className="dashboard-chat-header__identity">
            <div className="dashboard-chat-header__icon" aria-hidden>
              <NavIcon icon={isChatMode ? CHROME_ICONS.bot : CHROME_ICONS.barChart} size={22} />
            </div>
            <div>
              <p className="dashboard-chat-eyebrow">
                {isChatMode ? 'Chat = act with guidance' : 'Pulse = see what matters'}
              </p>
              <h1 id="dashboard-chat-title" className="dashboard-chat-title">
                {isChatMode ? 'CareDroid clinical chat' : 'Pulse'}
              </h1>
            </div>
          </div>
          <div className="dashboard-chat-header__status" aria-label="Chat context">
            <span className="dashboard-context-pill dashboard-context-pill--online">
              <NavIcon icon={CHROME_ICONS.checkCircle} size={14} aria-hidden />
              Online
            </span>
            <span className="dashboard-context-pill">{activeConversationLabel}</span>
            {selectedToolEntry && (
              <span className="dashboard-context-pill dashboard-context-pill--tool">
                <NavIcon icon={getToolIcon(selectedToolEntry.id)} size={14} aria-hidden />
                {selectedToolEntry.name}
              </span>
            )}
          </div>
        </header>

        <div
          ref={scrollRef}
          className={`dashboard-scroll app-scroll-container${messages.length === 0 && !sending ? ' dashboard-scroll--empty' : ''}`}
          onScroll={updateScrollStickiness}
        >
          {messages.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon" aria-hidden>
                <NavIcon icon={isChatMode ? CHROME_ICONS.hospital : CHROME_ICONS.barChart} size={48} />
              </div>
              <div className="dashboard-empty-inner">
                <div className="dashboard-empty-title">
                  {isChatMode ? 'CareDroid clinical chat' : 'Start with what matters'}
                </div>
                <div className="dashboard-empty-copy">
                  {isChatMode
                    ? 'Ask about medications, labs, scores, protocols, and procedures. Use guided prompts when you want a structured path.'
                    : 'Review priority items, choose the next action, then use Chat to preview, confirm, and verify the result.'}
                </div>
                {isChatMode ? (
                  <div className="dashboard-starter-grid" aria-label="Starter prompts">
                    {starterPrompts.map((starter) => (
                      <button
                        key={starter.title}
                        type="button"
                        className="dashboard-starter-card"
                        onClick={() => handleStarterPrompt(starter)}
                      >
                        <span className="dashboard-starter-card__icon" aria-hidden>
                          <NavIcon icon={starter.icon} size={18} />
                        </span>
                        <span className="dashboard-starter-card__title">{starter.title}</span>
                        <span className="dashboard-starter-card__prompt">{starter.prompt}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-pulse-grid" aria-label="Priority actions">
                    {pulseActions.map((action) => (
                      <button
                        key={action.title}
                        type="button"
                        className="dashboard-pulse-card"
                        onClick={() => handlePulseAction(action)}
                      >
                        <span className="dashboard-pulse-card__icon" aria-hidden>
                          <NavIcon icon={action.icon} size={18} />
                        </span>
                        <span className="dashboard-pulse-card__title">{action.title}</span>
                        <span className="dashboard-pulse-card__body">{action.body}</span>
                        <span className="dashboard-pulse-card__action">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`dashboard-msg-row ${
                  msg.role === 'user' ? 'dashboard-msg-row--user' : 'dashboard-msg-row--assistant'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="dashboard-msg-avatar" aria-hidden>
                    <NavIcon icon={CHROME_ICONS.bot} size={20} />
                  </div>
                )}
                <div
                  className={`dashboard-msg-bubble ${
                    msg.role === 'user' ? 'dashboard-msg-bubble--user' : 'dashboard-msg-bubble--assistant'
                  }`}
                >
                  {msg.role === 'assistant' && msg.confidence !== undefined && (
                    <div className="dashboard-msg-meta">
                      <ConfidenceBadge confidence={msg.confidence} />
                    </div>
                  )}
                  <div className="dashboard-msg-body">{msg.content}</div>
                  {msg.toolResult && (
                    <div style={{ marginTop: 12 }}>
                      <ToolCard toolResult={msg.toolResult} />
                    </div>
                  )}
                  {Array.isArray(msg.visualizations) && msg.visualizations.length > 0 && (
                    <div className="dashboard-msg-viz">
                      {msg.visualizations.map((viz, idx) => (
                        <ToolVisualization key={`${viz.type || 'viz'}-${idx}`} visualization={viz} />
                      ))}
                    </div>
                  )}
                  {msg.citations && msg.citations.length > 0 && msg.role === 'assistant' && (
                    <Citations citations={msg.citations} onViewDetails={(c) => setSelectedCitation(c)} />
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="dashboard-msg-avatar" aria-hidden>
                    <NavIcon icon={CHROME_ICONS.user} size={20} />
                  </div>
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="dashboard-thinking">
              <div className="dashboard-msg-avatar" aria-hidden>
                <NavIcon icon={CHROME_ICONS.bot} size={20} />
              </div>
              <div className="dashboard-msg-thinking">Thinking…</div>
            </div>
          )}
          <div ref={scrollEndRef} aria-hidden />
        </div>

        <div className="dashboard-composer">
          {recommendedTools.length > 0 && (
            <div className="dashboard-recs">
              <div className="dashboard-recs-label">Suggested tools</div>
              <div className="dashboard-recs-row">
                {recommendedTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      analyticsService.trackEvent({
                        eventName: 'tool_recommendation_clicked',
                        parameters: {
                          toolId: tool.id,
                          confidence: tool.confidence,
                          reason: tool.recommendationReason,
                        },
                      });
                      recordRecommendationFeedback(tool.id, true);
                      const entry = getToolById(tool.id);
                      if (!entry?.path) return;
                      selectTool(tool.id);
                      const calcSlug = tool.initialCalc ?? entry.initialCalc;
                      const dest =
                        entry.id === 'calculators' && calcSlug
                          ? `/tools/calculators?calc=${encodeURIComponent(calcSlug)}`
                          : entry.path;
                      navigate(dest);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '999px',
                      border: `1px solid ${tool.color}55`,
                      background: `${tool.color}20`,
                      color: 'var(--text-color)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span aria-hidden>
                      <NavIcon icon={getToolIcon(tool.id)} size={18} />
                    </span>
                    <span>{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <form className="dashboard-input-row" onSubmit={handleSubmitMessage}>
            <textarea
              ref={composerInputRef}
              className="dashboard-input"
              value={input}
              onFocus={keepComposerVisible}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask anything clinical…"
              disabled={sending}
              rows={1}
              aria-label="Clinical chat message"
            />
            <button
              type="submit"
              className="dashboard-send"
              disabled={sending || !input.trim()}
            >
              Send
            </button>
          </form>
          <p className="dashboard-disclaimer">
            Decision support only. Verify recommendations against local protocols and clinician judgment.
          </p>
        </div>
      </div>

      {selectedCitation && (
        <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}

      <Drawer
        isOpen={outreachDrawerOpen}
        onClose={() => setOutreachDrawerOpen(false)}
        side="right"
        size="lg"
        title="Plan follow-up outreach"
        className="dashboard-outreach-drawer"
        footer={
          <div className="dashboard-outreach-footer">
            <button
              type="button"
              className="dashboard-outreach-secondary"
              onClick={() => setOutreachForm(OUTREACH_INITIAL_FORM)}
            >
              Reset
            </button>
            <button
              type="button"
              className="dashboard-outreach-primary"
              disabled={!canConfirmOutreach || sending}
              onClick={handleConfirmOutreach}
            >
              Confirm and ask Chat
            </button>
          </div>
        }
      >
        <div className="dashboard-outreach">
          <p className="dashboard-outreach-copy">
            Build a reviewable outreach plan through the existing protected Chat route. No outreach
            message will be sent, scheduled, or documented automatically.
          </p>

          <div className="dashboard-outreach-steps" aria-label="Outreach workflow steps">
            {['Start', 'Choose target', 'Draft preview', 'Confirm', 'Result in Chat', 'Verify'].map(
              (step) => (
                <span key={step} className="dashboard-outreach-step">
                  {step}
                </span>
              )
            )}
          </div>

          <label className="dashboard-outreach-field">
            <span>Patient or cohort target</span>
            <input
              value={outreachForm.target}
              onChange={(event) => updateOutreachField('target', event.target.value)}
              placeholder="Example: Mrs. A after ED discharge for pneumonia"
            />
          </label>

          <label className="dashboard-outreach-field">
            <span>Follow-up reason</span>
            <input
              value={outreachForm.reason}
              onChange={(event) => updateOutreachField('reason', event.target.value)}
              placeholder="Example: symptom check, med adherence, return precautions"
            />
          </label>

          <label className="dashboard-outreach-field">
            <span>Timing or next step</span>
            <select
              value={outreachForm.timing}
              onChange={(event) => updateOutreachField('timing', event.target.value)}
            >
              <option value="today">Today</option>
              <option value="within 48 hours">Within 48 hours</option>
              <option value="within 1 week">Within 1 week</option>
              <option value="at next scheduled visit">At next scheduled visit</option>
            </select>
          </label>

          <label className="dashboard-outreach-field">
            <span>Optional clinical context</span>
            <textarea
              value={outreachForm.context}
              onChange={(event) => updateOutreachField('context', event.target.value)}
              placeholder="Add relevant constraints, safety notes, language needs, or verification requirements."
              rows={4}
            />
          </label>

          <section className="dashboard-outreach-preview-section">
            <div className="dashboard-outreach-preview-heading">Preview before execution</div>
            <pre className="dashboard-outreach-preview" aria-label="Outreach Chat preview">
              {outreachPreview}
            </pre>
          </section>
        </div>
      </Drawer>
    </div>
  );
}

export default Dashboard;
