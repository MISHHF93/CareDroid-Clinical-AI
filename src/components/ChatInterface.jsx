import React, { useState, useRef, useEffect } from 'react';
import ToolPanel from './ToolPanel';
import ToolCard from './ToolCard';
import ToolVisualization from './ToolVisualization';
import Citations, { CitationModal } from './Citations';
import ConfidenceBadge from './ConfidenceBadge';
import { sendClinicalChatMessage, mapChatResponseToAssistantMessage } from '../services/clinicalChatService';
import { useNotificationActions } from '../hooks/useNotificationActions';

const ChatInterface = ({
  currentTool,
  currentFeature,
  prefillText,
  conversationId,
  messages,
  onAppendMessage,
  onTrackEvent,
  authToken,
  onToolSelect,
  onFeatureSelect
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const messagesEndRef = useRef(null);
  const { error } = useNotificationActions();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

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
      });

      if (!ok) {
        throw new Error(`Request failed with status`);
      }

      const assistantMessage = mapChatResponseToAssistantMessage(data);
      onAppendMessage?.(conversationId, assistantMessage);
    } catch (error) {
      onAppendMessage?.(conversationId, {
        role: 'assistant',
        content: 'I\'m having trouble connecting to the server. Please try again in a moment.',
        timestamp: new Date()
      });
      error('Connection failed', 'Unable to reach the server. Please try again.');
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
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {messages.length === 0 && (
          <div style={{
            padding: '30px',
            borderRadius: '12px',
            border: '1px dashed var(--panel-border)',
            color: 'var(--muted-text)',
            textAlign: 'center'
          }}>
            Start a conversation to see messages here.
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '15px',
              alignItems: 'flex-start',
              maxWidth: '860px',
              margin: message.role === 'user' ? '0 0 0 auto' : '0 auto 0 0',
              width: '100%'
            }}
          >
            {message.role === 'assistant' && (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00FF88, #00FFFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0
              }}>
                🤖
              </div>
            )}
            <div style={{
              flex: 1,
              background: message.role === 'user'
                ? 'rgba(0, 255, 136, 0.1)'
                : 'var(--surface-2)',
              padding: '16px 20px',
              borderRadius: '16px',
              border: message.role === 'user'
                ? '1px solid rgba(0, 255, 136, 0.3)'
                : '1px solid var(--panel-border)',
              lineHeight: '1.6',
              boxShadow: 'var(--shadow-1)'
            }}>
              <div>{message.content}</div>
              {message.confidence !== undefined && message.role === 'assistant' && (
                <div style={{ marginTop: '12px' }}>
                  <ConfidenceBadge confidence={message.confidence} />
                </div>
              )}
              {/* Tool Result Card */}
              {message.toolResult && (
                <div style={{ marginTop: '12px' }}>
                  <ToolCard toolResult={message.toolResult} />
                </div>
              )}
              {Array.isArray(message.visualizations) && message.visualizations.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {message.visualizations.map((viz, idx) => (
                    <ToolVisualization key={`${viz.type || 'viz'}-${idx}`} visualization={viz} />
                  ))}
                </div>
              )}
              {/* Citations */}
              {message.citations && message.citations.length > 0 && message.role === 'assistant' && (
                <Citations 
                  citations={message.citations}
                  onViewDetails={(citation) => setSelectedCitation(citation)}
                />
              )}
              <div style={{
                fontSize: '12px',
                color: 'var(--muted-text)',
                marginTop: '8px'
              }}>
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
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0
              }}>
                👤
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'flex-start',
            maxWidth: '900px',
            margin: '0 auto 0 0'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00FF88, #00FFFF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🤖
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '15px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
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

      {/* Tool Panel */}
      {(currentTool || currentFeature) && <ToolPanel tool={currentTool} feature={currentFeature} />}

      {/* Input Area */}
      <div style={{
        padding: '14px 24px max(14px, env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--panel-border)',
        background: 'var(--surface-0)',
        flexShrink: 0,
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto 12px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {['Summarize a protocol', 'Check drug interaction', 'Interpret labs'].map((hint) => (
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
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask CareDroid anything clinical..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'var(--surface-1)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '12px 16px',
              color: 'var(--text-color)',
              fontSize: '15px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '200px',
              fontFamily: 'inherit',
              outline: 'none',
              boxShadow: 'var(--shadow-1)',
              lineHeight: 1.35,
              boxSizing: 'border-box',
            }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn-primary"
            style={{
              flexShrink: 0,
              minHeight: '44px',
              padding: '0 22px',
              opacity: input.trim() && !isLoading ? 1 : 0.6,
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
        <div style={{
          maxWidth: '900px',
          margin: '8px auto 0',
          fontSize: '12px',
          color: 'var(--muted-text)',
          textAlign: 'center',
        }}>
          CareDroid can make mistakes. Verify medical information.
        </div>
      </div>

      {/* Citation Modal */}
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
