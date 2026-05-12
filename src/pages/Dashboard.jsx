import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import AppShell from '../layout/AppShell';
import toolRegistry from '../data/toolRegistry';
import ToolVisualization from '../components/ToolVisualization';
import analyticsService from '../services/analyticsService';
import { getToolRecommendationsNLU, recordRecommendationFeedback } from '../utils/toolRecommendations';

/**
 * Dashboard Page - Main Clinical AI Interface
 * Central hub for chat, clinical tools, and conversation management
 */
function Dashboard() {
  const { signOut } = useUser();
  const navigate = useNavigate();
  const { error } = useNotificationActions();
  const { recordToolAccess } = useToolPreferences();
  const {
    conversations,
    activeConversationId,
    messages,
    selectedTool,
    isLoading,
    addConversation,
    selectConversation,
    addMessage,
    selectTool,
    setIsLoading
  } = useConversation();
  const [input, setInput] = useState('');
  const [recommendedTools, setRecommendedTools] = useState([]);

  const clinicalTools = toolRegistry;

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    addMessage(input, 'user');
    setInput('');
    setIsLoading(true);

    try {
      // Simulate API call - with your real backend, use: await apiFetch('/api/chat/message', ...)
      setTimeout(() => {
        const selectedToolName = clinicalTools.find((tool) => tool.id === selectedTool)?.name;
        const aiResponse = `I'm analyzing your request about "${input}". In a real implementation, this would call the medical AI API to provide evidence-based clinical guidance.${selectedToolName ? ` Using ${selectedToolName}...` : ''}`;
        addMessage(aiResponse, 'assistant');
        setIsLoading(false);
      }, 800);
    } catch (err) {
      error('Message failed', 'Failed to send message.');
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    addConversation();
  };

  const handleSelectConversation = (conversationId) => {
    selectConversation(conversationId);
  };

  const handleSelectTool = (toolId) => {
    recordToolAccess(toolId);
    selectTool(toolId);
  };

  const recommendationSource = useMemo(() => {
    if (input.trim()) {
      return input.trim();
    }

    const lastUserMessage = [...messages].reverse().find((msg) => msg.role === 'user');
    return lastUserMessage?.content || '';
  }, [input, messages]);

  // Get NLU-based recommendations (async)
  useEffect(() => {
    let cancelled = false;

    const fetchRecommendations = async () => {
      if (!recommendationSource) {
        setRecommendedTools([]);
        return;
      }

      try {
        const context = {
          userId: activeConversationId,
          userPreferences: recordToolAccess ? { favoritedTools: [] } : undefined,
          recentTools: [] // Could track recently used tools
        };

        const tools = await getToolRecommendationsNLU(recommendationSource, context, 3);
        
        if (!cancelled) {
          setRecommendedTools(tools);
        }
      } catch (error) {
        console.error('Failed to get recommendations:', error);
        if (!cancelled) {
          setRecommendedTools([]);
        }
      }
    };

    fetchRecommendations();

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

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  return (
    <AppShell
      isAuthed={true}
      conversations={conversations}
      activeConversation={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onSignOut={handleSignOut}
      healthStatus="online"
      currentTool={selectedTool}
      onToolSelect={handleSelectTool}
    >
      <div style={{
        flex: 1,
        display: 'flex',
        minWidth: 0,
        height: '100%'
      }}>
        {/* Main Chat Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0
        }}>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '24px',
                color: 'var(--muted-text)'
              }}>
                <div style={{ fontSize: '48px' }}>🏥</div>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-color)' }}>
                    Welcome to CareDroid-Clinical-AI
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Ask me anything about medicine, drugs, lab values, clinical protocols, and more.
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '12px', color: 'var(--accent-green)' }}>
                    💡 Select a clinical tool from the sidebar to get started
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: '12px'
                  }}
                >
                  {msg.role === 'assistant' && <div style={{ fontSize: '20px' }}>🤖</div>}
                  <div
                    style={{
                      maxWidth: '60%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #00ff88, #00ffff)' : 'var(--surface-1)',
                      color: msg.role === 'user' ? 'var(--navy-ink)' : 'var(--text-color)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--panel-border)',
                      lineHeight: 1.5
                    }}
                  >
                    {msg.content}
                    {Array.isArray(msg.visualizations) && msg.visualizations.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {msg.visualizations.map((viz, idx) => (
                          <ToolVisualization key={`${viz.type || 'viz'}-${idx}`} visualization={viz} />
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && <div style={{ fontSize: '20px' }}>👤</div>}
                </div>
              ))
            )}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted-text)' }}>
                <div style={{ fontSize: '20px' }}>🤖</div>
                <div style={{ animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.7 }}>
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--panel-border)',
            display: 'flex',
            gap: '12px',
            position: 'relative'
          }}>
            {recommendedTools.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '84px',
                left: '0',
                right: '0',
                background: 'var(--surface-2)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: 'var(--shadow-1)'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--muted-text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Suggested tools
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {recommendedTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        analyticsService.trackEvent({
                          eventName: 'tool_recommendation_clicked',
                          parameters: { 
                            toolId: tool.id,
                            confidence: tool.confidence,
                            reason: tool.recommendationReason
                          },
                        });
                        recordRecommendationFeedback(tool.id, true);
                        handleSelectTool(tool.id);
                        navigate(tool.path);
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
                        cursor: 'pointer'
                      }}
                    >
                      <span>{tool.icon}</span>
                      <span>{tool.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask me anything... (e.g., drug interactions, lab values, diagnosis)"
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'var(--surface-1)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                color: 'var(--text-color)',
                fontSize: '14px',
                outline: 'none'
              }}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #00ff88, #00ffff)',
                color: 'var(--navy-ink)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !input.trim() ? 0.5 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Clinical Tools Sidebar */}
        <div style={{
          width: '320px',
          borderLeft: '1px solid var(--panel-border)',
          background: 'var(--surface-0)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid var(--panel-border)',
            position: 'sticky',
            top: 0,
            background: 'var(--surface-0)',
            zIndex: 1
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>🔧</span>
              Clinical Tools
            </h3>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: 'var(--muted-text)',
              lineHeight: 1.4
            }}>
              Select a tool to enhance your clinical queries
            </p>
          </div>

          <div style={{ padding: '12px' }}>
            {clinicalTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleSelectTool(tool.id)}
                style={{
                  width: '100%',
                  padding: '16px',
                  marginBottom: '8px',
                  background: selectedTool === tool.id 
                    ? `linear-gradient(135deg, ${tool.color}22, ${tool.color}11)` 
                    : 'var(--surface-1)',
                  border: selectedTool === tool.id 
                    ? `2px solid ${tool.color}` 
                    : '1px solid var(--panel-border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (selectedTool !== tool.id) {
                    e.currentTarget.style.background = 'var(--surface-2)';
                    e.currentTarget.style.borderColor = tool.color + '66';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTool !== tool.id) {
                    e.currentTarget.style.background = 'var(--surface-1)';
                    e.currentTarget.style.borderColor = 'var(--panel-border)';
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontSize: '24px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    background: selectedTool === tool.id ? tool.color + '33' : 'transparent'
                  }}>
                    {tool.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: selectedTool === tool.id ? tool.color : 'var(--text-color)',
                      marginBottom: '2px'
                    }}>
                      {tool.name}
                    </div>
                  </div>
                  {selectedTool === tool.id && (
                    <div style={{
                      fontSize: '16px',
                      color: tool.color
                    }}>
                      ✓
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--muted-text)',
                  lineHeight: 1.4
                }}>
                  {tool.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </AppShell>
  );
}

export default Dashboard;
