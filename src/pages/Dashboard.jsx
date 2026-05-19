import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import analyticsService from '../services/analyticsService';
import { getToolRecommendationsNLU, recordRecommendationFeedback } from '../utils/toolRecommendations';
import {
  sendClinicalChatMessage,
  mapChatResponseToAssistantMessage,
  registryIdToChatToolParam,
} from '../services/clinicalChatService';
import { NavIcon } from '../navigation/NavIcon';
import { getToolIcon, CHROME_ICONS } from '../navigation/iconRegistry';
import './Dashboard.css';

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
  const [input, setInput] = useState('');
  const [recommendedTools, setRecommendedTools] = useState([]);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [sending, setSending] = useState(false);
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
      navigate({ pathname: '/dashboard', search: '' }, { replace: true });
    }
  }, [panelRegistryId, calcFromUrl, navigate, setActiveTool, recordToolAccess, clearTool, addMessage, selectTool]);

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
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
  };

  const recommendationSource = useMemo(() => {
    if (input.trim()) return input.trim();
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    return lastUser?.content || '';
  }, [input, messages]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!recommendationSource) {
        setRecommendedTools([]);
        return;
      }
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
    };
    run();
    return () => {
      cancelled = true;
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
        <div
          ref={scrollRef}
          className={`dashboard-scroll app-scroll-container${messages.length === 0 && !sending ? ' dashboard-scroll--empty' : ''}`}
          onScroll={updateScrollStickiness}
        >
          {messages.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.hospital} size={48} />
              </div>
              <div className="dashboard-empty-inner">
                <div className="dashboard-empty-title">CareDroid clinical chat</div>
                <div className="dashboard-empty-copy">
                  Ask about medications, labs, scores, protocols, and procedures. Open a clinical tool from
                  the sidebar or Tools — each tool has its own page; use &quot;Discuss with AI&quot; there to
                  bring results back into this chat.
                </div>
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
          <div className="dashboard-input-row">
            <input
              type="text"
              ref={composerInputRef}
              className="dashboard-input"
              value={input}
              onFocus={keepComposerVisible}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask anything clinical…"
              disabled={sending}
            />
            <button
              type="button"
              className="dashboard-send"
              onClick={handleSendMessage}
              disabled={sending || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {selectedCitation && (
        <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}
    </div>
  );
}

export default Dashboard;
