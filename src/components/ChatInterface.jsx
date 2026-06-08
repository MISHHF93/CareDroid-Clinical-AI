import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ToolPanel from './ToolPanel';
import AISourcePanel from './chat/AISourcePanel';
import AiRouteMetadata from './chat/AiRouteMetadata';
import AssistantResultRenderer from './chat/AssistantResultRenderer';
import Citations, { CitationModal } from './Citations';
import ConfidenceBadge from './ConfidenceBadge';
import { sendClinicalChatMessage, mapChatResponseToAssistantMessage } from '../services/clinicalChatService';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { getWorkspaceExperienceProfile } from '../data/workspaceExperience';
import './ChatInterface.css';

const ChatInterface = ({
  currentTool,
  currentFeature,
  prefillText,
  conversationId,
  messages,
  onAppendMessage,
  onTrackEvent,
  authToken,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const messagesRef = useRef(null);
  const messagesEndRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const { error: notifyError } = useNotificationActions();
  const {
    activeWorkspace,
    activeWorkspaceId,
    assistantContext,
    visibleAssetIds,
    recommendedAIAgents,
    recommendedAssetPacks,
  } = useWorkspace();
  const workspaceExperience = getWorkspaceExperienceProfile(activeWorkspace);
  const workspaceDiscoveryLabel = workspaceExperience.shortLabel || workspaceExperience.label;
  const assistantDiscoveryPrompts = useMemo(
    () => [
      `Search ${workspaceDiscoveryLabel} assets, workflows, and simulations for my next step.`,
      `Find the best workflow or simulation for ${workspaceDiscoveryLabel}.`,
    ],
    [workspaceDiscoveryLabel]
  );

  const updateStickToBottom = () => {
    const scroller = messagesRef.current;
    if (!scroller) return;
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  };

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const scroller = messagesRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior });
  }, []);

  const keepComposerVisible = useCallback(() => {
    if (!shouldStickToBottomRef.current) return;
    window.setTimeout(() => scrollToBottom('smooth'), 80);
  }, [scrollToBottom]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    const raf = window.requestAnimationFrame(() => scrollToBottom('smooth'));
    return () => window.cancelAnimationFrame(raf);
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    const handleViewportChange = () => {
      if (!shouldStickToBottomRef.current) return;
      window.requestAnimationFrame(() => scrollToBottom('auto'));
    };

    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [scrollToBottom]);

  useEffect(() => {
    if (prefillText && !input.trim()) {
      setInput(prefillText);
    }
  }, [prefillText]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    shouldStickToBottomRef.current = true;
    onAppendMessage?.(conversationId, userMessage);
    onTrackEvent?.('message_sent', {
      conversationId,
      tool: currentTool,
      feature: currentFeature,
      length: input.length
    });
    setInput('');
    setIsLoading(true);

    try {
      const { ok, data } = await sendClinicalChatMessage({
        message: input,
        tool: currentTool,
        feature: currentFeature,
        conversationId,
        authToken,
        workspaceContext: {
          activeWorkspaceId,
          operatingLabel: workspaceExperience.operatingLabel,
          modeSummary: workspaceExperience.modeSummary,
          assistantContext: assistantContext || workspaceExperience.assistantContext,
          visibleAssetIds,
          recommendedAIAgents,
          recommendedAssetPacks,
        },
      });

      if (!ok) {
        throw new Error(`Request failed with status`);
      }

      const assistantMessage = mapChatResponseToAssistantMessage(data);
      onAppendMessage?.(conversationId, assistantMessage);
    } catch {
      onAppendMessage?.(conversationId, {
        role: 'assistant',
        content: 'I\'m having trouble connecting to the server. Please try again in a moment.',
        timestamp: new Date()
      });
      notifyError('Connection failed', 'Unable to reach the server. Please try again.');
      onTrackEvent?.('message_error', {
        conversationId,
        tool: currentTool,
        feature: currentFeature
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-interface">
      <div
        ref={messagesRef}
        className="chat-interface__messages app-scroll-container"
        onScroll={updateStickToBottom}
      >
        <section className="chat-interface__workspace-banner" aria-label="Active assistant workspace">
          <span>{workspaceExperience.operatingLabel}</span>
          <strong>{workspaceExperience.assistantTitle}</strong>
          <p>{assistantContext || workspaceExperience.modeSummary}</p>
        </section>
        {messages.length === 0 && (
          <div className="chat-interface__empty">
            Start a conversation in {workspaceExperience.operatingLabel}.
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-interface__message-row chat-interface__message-row--${message.role}`}
          >
            {message.role === 'assistant' && (
              <div className="chat-interface__avatar chat-interface__avatar--assistant" aria-hidden>
                🤖
              </div>
            )}
            <div
              className={`chat-interface__bubble ${
                message.role === 'user'
                  ? 'chat-interface__bubble--user'
                  : 'chat-interface__bubble--assistant'
              }`}
            >
              <div>{message.content}</div>
              {message.confidence !== undefined && message.role === 'assistant' && (
                <div style={{ marginTop: '12px' }}>
                  <ConfidenceBadge confidence={message.confidence} />
                </div>
              )}
              {message.role === 'assistant' && (message.aiFoundation || message.metadata?.aiFoundation) && (
                <AiRouteMetadata
                  aiFoundation={message.aiFoundation || message.metadata?.aiFoundation}
                  routePlan={message.metadata?.routePlan}
                  aiGateway={message.aiGateway || message.metadata?.aiGateway}
                />
              )}
              <AssistantResultRenderer
                message={message}
                visualizationsStyle={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}
              />
              {message.role === 'assistant' && (
                <AISourcePanel
                  sourcePanel={
                    message.sourcePanel ||
                    message.ragContext?.sourcePanel ||
                    (Array.isArray(message.ragContext?.references) &&
                    message.ragContext.references.length > 0
                      ? {
                          references: message.ragContext.references,
                          confidence: message.confidence ?? message.ragContext.confidence,
                          generatedAt: message.ragContext.generatedAt,
                          retrieval: message.ragContext,
                        }
                      : undefined)
                  }
                />
              )}
              {message.citations &&
                message.citations.length > 0 &&
                message.role === 'assistant' &&
                !(
                  message.sourcePanel?.references?.length ||
                  message.ragContext?.sourcePanel?.references?.length ||
                  message.ragContext?.references?.length
                ) && (
                <Citations
                  citations={message.citations}
                  onViewDetails={(citation) => setSelectedCitation(citation)}
                />
              )}
              <div className="chat-interface__meta">
                {message.timestamp
                  ? new Date(message.timestamp).toLocaleTimeString()
                  : 'Unknown time'}
                {message.ragContext && message.ragContext.sourcesFound > 0 && (
                  <span style={{ marginLeft: '12px', opacity: 0.7 }}>
                    • {message.ragContext.chunksRetrieved} chunks from {message.ragContext.sourcesFound} sources
                  </span>
                )}
              </div>
            </div>
            {message.role === 'user' && (
              <div className="chat-interface__avatar chat-interface__avatar--user" aria-hidden>
                👤
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chat-interface__message-row chat-interface__message-row--assistant">
            <div className="chat-interface__avatar chat-interface__avatar--assistant" aria-hidden>
              🤖
            </div>
            <div className="chat-interface__loading-bubble">
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="dot-pulse">●</div>
                <div className="dot-pulse" style={{ animationDelay: '0.2s' }}>●</div>
                <div className="dot-pulse" style={{ animationDelay: '0.4s' }}>●</div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {(currentTool || currentFeature) && <ToolPanel tool={currentTool} feature={currentFeature} />}

      <div className="chat-interface__input-area">
        <div className="chat-interface__quick-actions">
            {[...workspaceExperience.quickPrompts, ...assistantDiscoveryPrompts].map((hint) => (
            <button
              key={hint}
              onClick={() => setInput(hint)}
              className="btn-ghost"
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              {hint}
            </button>
          ))}
        </div>
        <div className="chat-interface__composer">
          <textarea
            value={input}
            onFocus={keepComposerVisible}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={workspaceExperience.assistantPlaceholder}
            disabled={isLoading}
            className="chat-interface__textarea"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn-primary chat-interface__send"
            style={{
              opacity: input.trim() && !isLoading ? 1 : 0.6,
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
        <div className="chat-interface__disclaimer">
          CareDroid can make mistakes. Verify medical information.
        </div>
      </div>

      {selectedCitation && (
        <CitationModal
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .dot-pulse {
          animation: pulse 1.5s infinite;
          color: #00FF88;
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;
