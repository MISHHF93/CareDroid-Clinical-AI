/**
 * ChatInterface — NLU/chat integration (Vitest + clinicalChatService mocks).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from './ChatInterface';

vi.mock('./ChatInterface.css', () => ({}));
vi.mock('./ToolPanel', () => ({ default: () => <div data-testid="tool-panel" /> }));
vi.mock('./ToolCard', () => ({ default: () => null }));
vi.mock('./ToolVisualization', () => ({ default: () => null }));
vi.mock('./Citations', () => ({
  default: () => null,
  CitationModal: () => null,
}));
vi.mock('./ConfidenceBadge', () => ({ default: () => null }));

const sendClinicalChatMessage = vi.fn();
const mapChatResponseToAssistantMessage = vi.fn();
const setWhiteboardFilter = vi.fn();
const flagPatientForReassessment = vi.fn();
let activeWorkspaceId = 'medical-iot';

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: (...args) => sendClinicalChatMessage(...args),
  mapChatResponseToAssistantMessage: (...args) => mapChatResponseToAssistantMessage(...args),
}));

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspaceId,
    activeWorkspace: { id: activeWorkspaceId, name: activeWorkspaceId === 'emergency' ? 'Emergency' : 'Medical IoT' },
    assistantContext: 'Interpret device telemetry and stale data carefully.',
    visibleAssetIds: ['medical-iot-dashboard'],
    recommendedAIAgents: ['device-telemetry-agent'],
    recommendedAssetPacks: ['medical-iot-pack'],
  }),
}));

vi.mock('../contexts/EmergencyDepartmentContext', () => ({
  getQueueForPatientState: (state) => {
    if (state === 'Triage') return 'Triage';
    if (state === 'Waiting') return 'Waiting';
    if (state === 'Assessment') return 'Provider';
    return state;
  },
  useEmergencyDepartment: () => ({
    patients: [
      {
        id: 'tor-uc-001',
        name: 'Maya Chen',
        location: 'Bed 1',
        arrivalTime: new Date(Date.now() - 45 * 60000).toISOString(),
        complaint: 'Chest pain',
        state: 'Waiting',
        priority: 'CTAS 2',
        assignedTo: 'Dr. Singh',
      },
      {
        id: 'tor-uc-004',
        name: 'Noah Williams',
        location: 'Bed 4',
        arrivalTime: new Date(Date.now() - 12 * 60000).toISOString(),
        complaint: 'Abdominal pain',
        state: 'Assessment',
        priority: 'CTAS 3',
        assignedTo: 'NP Carter',
      },
    ],
    queueCounts: {
      Waiting: 1,
      Triage: 0,
      Provider: 1,
    },
    capacitySnapshot: {
      score: 'Yellow',
      currentOccupancy: 2,
      maxCapacity: 30,
      occupancyPercent: 7,
      boardingCount: 0,
      reassessmentQueueLength: 1,
    },
    reassessmentQueue: [
      {
        patientId: 'tor-uc-001',
        patientName: 'Maya Chen',
        reasons: ['Waiting state over 45 minutes'],
      },
    ],
    setWhiteboardFilter,
    flagPatientForReassessment,
  }),
}));

describe('ChatInterface NLU integration', () => {
  const onAppendMessage = vi.fn();

  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
    activeWorkspaceId = 'medical-iot';
    vi.clearAllMocks();
    sendClinicalChatMessage.mockResolvedValue({
      ok: true,
      message: { content: 'Assistant reply' },
    });
    mapChatResponseToAssistantMessage.mockReturnValue({
      role: 'assistant',
      content: 'Assistant reply',
    });
  });

  it('renders composer and sends message via clinicalChatService', async () => {
    const user = userEvent.setup();

    render(
      <ChatInterface
        currentTool={null}
        conversationId="conv-1"
        messages={[]}
        onAppendMessage={onAppendMessage}
        authToken="test-token"
      />,
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'Calculate SOFA score');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalled();
    });

    expect(sendClinicalChatMessage.mock.calls[0][0]).toMatchObject({
      conversationId: 'conv-1',
      workspaceContext: expect.objectContaining({
        activeWorkspaceId: 'medical-iot',
        operatingLabel: 'Medical IoT OS',
      }),
    });
    expect(onAppendMessage).toHaveBeenCalled();
  });

  it('sends ED Copilot context and applies returned whiteboard actions in emergency workspace', async () => {
    activeWorkspaceId = 'emergency';
    const user = userEvent.setup();
    mapChatResponseToAssistantMessage.mockReturnValue({
      role: 'assistant',
      content: 'Chest pain patients',
      metadata: {
        whiteboardAction: {
          type: 'filterComplaint',
          complaint: 'chest',
        },
      },
    });

    render(
      <ChatInterface
        currentTool={null}
        conversationId="conv-ed"
        messages={[]}
        onAppendMessage={onAppendMessage}
        authToken="test-token"
      />,
    );

    await user.type(screen.getByRole('textbox'), 'Show me all chest pain patients');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalled();
    });

    const payload = sendClinicalChatMessage.mock.calls[0][0];
    expect(payload.workspaceContext.edCopilot).toMatchObject({
      enabled: true,
      patientCount: 2,
      capacitySnapshot: expect.objectContaining({ score: 'Yellow' }),
    });
    expect(payload.workspaceContext.edCopilot.systemPrompt).toMatch(/Never suggest autonomous clinical decisions/i);
    expect(payload.workspaceContext.edCopilot.queueHealth[0]).toHaveProperty('health');
    expect(payload.workspaceContext.edCopilot.flaggedReassessments).toHaveLength(1);
    expect(setWhiteboardFilter).toHaveBeenCalledWith({ queue: null, complaint: 'chest' });
  });

  it('focuses the ED Copilot composer when / is pressed in emergency workspace', () => {
    activeWorkspaceId = 'emergency';

    render(
      <ChatInterface
        currentTool={null}
        conversationId="conv-ed"
        messages={[]}
        onAppendMessage={onAppendMessage}
        authToken="test-token"
      />,
    );

    const input = screen.getByRole('textbox');
    expect(input).not.toHaveFocus();

    fireEvent.keyDown(window, { key: '/' });

    expect(input).toHaveFocus();
  });

  it('shows existing messages without blank root', () => {
    render(
      <ChatInterface
        messages={[
          { id: '1', role: 'user', content: 'Hello clinician' },
          { id: '2', role: 'assistant', content: 'How can I help?' },
        ]}
        onAppendMessage={onAppendMessage}
      />,
    );

    expect(screen.getByText('Hello clinician')).toBeInTheDocument();
    expect(screen.getByText('How can I help?')).toBeInTheDocument();
  });

  it('renders AI foundation metadata on assistant messages', () => {
    render(
      <ChatInterface
        messages={[
          {
            id: '2',
            role: 'assistant',
            content: 'Routing-aware reply',
            aiFoundation: {
              route: 'administrative',
              selectedExpert: 'operations',
              selectedExperts: [{ expertId: 'operations', role: 'primary', confidence: 0.76, score: 9.4 }],
              retrievalPolicy: 'operational',
              confidence: 0.76,
              routeScore: 9.4,
              estimatedCost: 0.08,
              requiresHumanReview: false,
            },
          },
        ]}
        onAppendMessage={onAppendMessage}
      />,
    );

    const routePanel = screen.getByLabelText(/ai routing metadata/i);
    expect(routePanel).toHaveTextContent(/expert: operations/i);
    expect(routePanel).toHaveTextContent(/retrieval: operational/i);
    expect(routePanel).toHaveTextContent(/estimated cost/i);
  });

  it('renders the AI source panel for RAG references', () => {
    render(
      <ChatInterface
        messages={[
          {
            id: '2',
            role: 'assistant',
            content: 'Use early antibiotics for sepsis.',
            sourcePanel: {
              confidence: 0.88,
              generatedAt: '2026-01-01T12:00:00.000Z',
              retrieval: {
                chunksRetrieved: 2,
                sourcesFound: 1,
                latencyMs: 42,
              },
              references: [
                {
                  id: 'ref-sepsis',
                  sourceId: 'sepsis-guideline',
                  citationLabel: '[1]',
                  title: 'Surviving Sepsis Guideline',
                  type: 'clinical_guideline',
                  organization: 'SCCM',
                  relevance: 0.91,
                  timestamp: '2026-01-01T11:00:00.000Z',
                  chunkCount: 2,
                  excerpts: ['Use early broad-spectrum antibiotics in sepsis.'],
                },
              ],
            },
          },
        ]}
        onAppendMessage={onAppendMessage}
      />,
    );

    const sourcePanel = screen.getByLabelText(/ai source panel/i);
    expect(sourcePanel).toHaveTextContent(/clinical rag sources/i);
    expect(sourcePanel).toHaveTextContent(/surviving sepsis guideline/i);
    expect(sourcePanel).toHaveTextContent(/relevance/i);
    expect(sourcePanel).toHaveTextContent(/91%/);
  });
});
