import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { toolRegistryById, resolveToolDrawerParams } from '../data/toolRegistry';
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
import { lazyWithRetry } from '../utils/lazyWithRetry';

const DrugChecker = lazyWithRetry(() => import('./tools/DrugChecker'));
const LabInterpreter = lazyWithRetry(() => import('./tools/LabInterpreter'));
const Calculators = lazyWithRetry(() => import('./tools/Calculators'));
const Protocols = lazyWithRetry(() => import('./tools/Protocols'));
const DiagnosisAssistant = lazyWithRetry(() => import('./tools/DiagnosisAssistant'));
const ProcedureGuide = lazyWithRetry(() => import('./tools/ProcedureGuide'));

const drawerFallback = <div className="dashboard-drawer-fallback">Loading tool…</div>;

function ClinicalToolDrawer({ toolId, initialCalc, onClose }) {
  const common = { embedded: true, onCloseEmbedded: onClose };
  switch (toolId) {
    case 'drug-check':
      return (
        <Suspense fallback={drawerFallback}>
          <DrugChecker {...common} />
        </Suspense>
      );
    case 'lab-interp':
      return (
        <Suspense fallback={drawerFallback}>
          <LabInterpreter {...common} />
        </Suspense>
      );
    case 'calculators':
      return (
        <Suspense fallback={drawerFallback}>
          <Calculators {...common} initialCalculatorId={initialCalc || undefined} />
        </Suspense>
      );
    case 'protocols':
      return (
        <Suspense fallback={drawerFallback}>
          <Protocols {...common} />
        </Suspense>
      );
    case 'diagnosis':
      return (
        <Suspense fallback={drawerFallback}>
          <DiagnosisAssistant {...common} />
        </Suspense>
      );
    case 'procedures':
      return (
        <Suspense fallback={drawerFallback}>
          <ProcedureGuide {...common} />
        </Suspense>
      );
    default:
      return null;
  }
}

/**
 * Dashboard — main clinical chat (real API). Optional tool drawer from ?tool= registry id.
 */
function Dashboard() {
  const { authToken } = useUser();
  const { error } = useNotificationActions();
  const { recordToolAccess } = useToolPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [recommendedTools, setRecommendedTools] = useState([]);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [sending, setSending] = useState(false);

  const {
    activeConversationId,
    messages,
    selectedTool,
    addMessage,
    selectTool,
    setActiveTool,
    clearTool,
  } = useConversation();

  const panelRegistryId = searchParams.get('tool');
  const calcFromUrl = searchParams.get('calc');
  const registryEntry = panelRegistryId ? toolRegistryById[panelRegistryId] : null;
  const { drawerToolId, initialCalc: initialCalcFromRegistry } = resolveToolDrawerParams(panelRegistryId);
  const initialCalc =
    drawerToolId === 'calculators'
      ? initialCalcFromRegistry || calcFromUrl || undefined
      : undefined;
  const drawerOpen = Boolean(panelRegistryId && registryEntry && drawerToolId);

  const closeDrawer = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('tool');
        next.delete('calc');
        return next;
      },
      { replace: true },
    );
    clearTool();
  }, [setSearchParams, clearTool]);

  useEffect(() => {
    if (panelRegistryId && toolRegistryById[panelRegistryId]) {
      setActiveTool(panelRegistryId);
      recordToolAccess(panelRegistryId);
    } else if (!panelRegistryId) {
      clearTool();
    }
  }, [panelRegistryId, setActiveTool, recordToolAccess, clearTool]);

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    addMessage(text, 'user');
    setInput('');
    setSending(true);

    try {
      const apiTool = registryIdToChatToolParam(selectedTool || panelRegistryId);
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
          className={`dashboard-scroll${messages.length === 0 && !sending ? ' dashboard-scroll--empty' : ''}`}
        >
          {messages.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.hospital} size={48} />
              </div>
              <div className="dashboard-empty-inner">
                <div className="dashboard-empty-title">CareDroid clinical chat</div>
                <div className="dashboard-empty-copy">
                  Ask about medications, labs, scores, protocols, and procedures. Open a tool from the
                  sidebar to use forms beside this conversation.
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
                      selectTool(tool.id);
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set('tool', tool.id);
                          if (tool.initialCalc) next.set('calc', tool.initialCalc);
                          else next.delete('calc');
                          return next;
                        },
                        { replace: true },
                      );
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
              className="dashboard-input"
              value={input}
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

      {drawerOpen && (
        <div className="dashboard-drawer">
          <ClinicalToolDrawer toolId={drawerToolId} initialCalc={initialCalc} onClose={closeDrawer} />
        </div>
      )}

      {selectedCitation && (
        <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}
    </div>
  );
}

export default Dashboard;
