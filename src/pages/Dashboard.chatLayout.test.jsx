import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import {
  mockConversationValue,
  mockToolPreferencesValue,
  mockUserValue,
} from '../test/testRenderUtils';

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({
    ok: true,
    data: { response: 'Draft message\n\nOutreach plan\n\nVerification steps' },
  }),
  mapChatResponseToAssistantMessage: vi.fn((data) => ({
    role: 'assistant',
    content: data.response || 'ok',
  })),
  registryIdToChatToolParam: vi.fn(() => null),
}));

vi.mock('../utils/toolRecommendations', () => ({
  getToolRecommendationsNLU: vi.fn().mockResolvedValue([]),
  recordRecommendationFeedback: vi.fn(),
}));

function renderDashboard(route = '/home') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard chat layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollTo = vi.fn();
    mockConversationValue.messages = [];
    mockConversationValue.selectedTool = null;
    mockConversationValue.addMessage = vi.fn((message) => {
      mockConversationValue.messages = [
        ...mockConversationValue.messages,
        {
          id: `test-message-${mockConversationValue.messages.length + 1}`,
          timestamp: new Date(),
          ...message,
        },
      ];
    });
  });

  it('renders Pulse as the simple home surface', async () => {
    renderDashboard();

    expect(screen.getByRole('heading', { level: 1, name: /home/i })).toBeInTheDocument();
    expect(screen.getByText(/see what matters/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your clinical toolkit/i })).toBeInTheDocument();
    expect(screen.getByText(/profile tool graph card/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plan outreach/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask anything clinical/i)).toBeInTheDocument();
  });

  it('renders the simplified clinical chat shell', async () => {
    renderDashboard('/assistant');

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/chat context/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/suggested actions/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask anything clinical/i)).toBeInTheDocument();
    expect(screen.getByText(/decision support only/i)).toBeInTheDocument();
  });

  it('renders AI foundation route metadata for assistant messages', () => {
    mockConversationValue.messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Route-aware answer',
        timestamp: new Date(),
        aiFoundation: {
          route: 'medical_reference',
          selectedExpert: 'cardiology',
          selectedExperts: [
            {
              expertId: 'cardiology',
              role: 'primary',
              confidence: 0.82,
              score: 6.42,
            },
          ],
          retrievalPolicy: 'guideline',
          confidence: 0.82,
          routeScore: 6.42,
          estimatedCost: 0.14,
          requiresHumanReview: true,
        },
      },
    ];

    renderDashboard('/assistant');

    const routePanel = screen.getByLabelText(/ai routing metadata/i);
    expect(routePanel).toHaveTextContent(/expert: cardiology/i);
    expect(routePanel).toHaveTextContent(/intent: medical reference/i);
    expect(routePanel).toHaveTextContent(/route score/i);
    expect(routePanel).toHaveTextContent(/\$0\.1400/);
    expect(screen.getByText('Route-aware answer')).toBeInTheDocument();
  });

  it('does not show capability-backed button rails when Chat opens', async () => {
    renderDashboard('/assistant');

    expect(screen.queryByLabelText(/suggested actions/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /plan follow-up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /drug checker/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /notification settings/i })).not.toBeInTheDocument();
  });

  it('keeps sensitive capability actions out of the opening Chat chrome', async () => {
    renderDashboard('/assistant');

    expect(screen.queryByRole('button', { name: /request data export/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /confirm compliance export/i })).not.toBeInTheDocument();
  });

  it('does not render a separate Chat composer action bar', async () => {
    renderDashboard('/assistant');

    expect(screen.queryByLabelText(/composer actions/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /plan outreach/i })).not.toBeInTheDocument();
  });

  it('does not render starter prompt cards in Chat mode', async () => {
    renderDashboard('/assistant');

    expect(screen.queryByLabelText(/starter prompts/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check medication safety/i })).not.toBeInTheDocument();
  });

  it('keeps executor workflows off the opening Chat surface', async () => {
    renderDashboard('/assistant');

    expect(screen.queryByRole('button', { name: /drug checker/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/execution card/i)).not.toBeInTheDocument();
  });

  it('keeps raw assistant text and renders tool results as operational cards', async () => {
    mockConversationValue.messages = [
      {
        id: 'result-1',
        role: 'assistant',
        content: 'Drug Checker completed successfully.',
        toolResult: {
          toolId: 'drug-interactions',
          toolName: 'Drug Checker',
          result: {
            success: true,
            data: { interactions: [] },
            warnings: [],
            errors: [],
            timestamp: '2026-05-21T22:00:00.000Z',
          },
        },
        visualizations: [
          {
            type: 'tool-result',
            data: {
              toolId: 'drug-interactions',
              toolName: 'Drug Checker',
              result: { success: true, data: { interactions: [] } },
            },
          },
        ],
        metadata: {
          parameters: {
            medications: ['aspirin', 'warfarin'],
          },
        },
      },
    ];

    renderDashboard('/assistant');

    expect(screen.getByText(/drug checker completed successfully/i)).toBeInTheDocument();
    expect(screen.getAllByText(/operational result/i)).toHaveLength(1);
    expect(screen.getByText(/action performed/i)).toBeInTheDocument();
    expect(screen.getByText(/inputs used/i)).toBeInTheDocument();
    expect(screen.getByText(/aspirin, warfarin/i)).toBeInTheDocument();
    expect(screen.getByText(/output summary/i)).toBeInTheDocument();
    expect(screen.getByText(/no significant interactions were found/i)).toBeInTheDocument();
    expect(screen.getByText('POST /api/tools/drug-interactions/execute')).toBeInTheDocument();
  });

  it('starts with an empty composer instead of starter prompts', async () => {
    renderDashboard('/assistant');

    expect(screen.queryByRole('button', { name: /check medication safety/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/clinical chat message/i).value).toBe('');
  });

  it('makes outreach visible and opens a guided planner', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /plan outreach/i }));

    expect(screen.getByRole('dialog', { name: /plan follow-up outreach/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/outreach workflow steps/i)).toHaveTextContent(/choose intent/i);
    expect(screen.getByRole('group', { name: /choose intent/i })).toBeInTheDocument();
    expect(screen.getByText(/no outreach message will be sent/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/outreach plan preview/i)).toHaveTextContent(/draft a preview through chat/i);
  });

  it('drafts and confirms guided outreach through the existing Chat path', async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /plan outreach/i }));
    fireEvent.click(screen.getByLabelText(/patient outreach/i));
    fireEvent.change(screen.getByLabelText(/target\/context/i), {
      target: { value: 'Mrs. A after discharge' },
    });
    fireEvent.change(screen.getByLabelText(/follow-up reason/i), {
      target: { value: 'symptom check and return precautions' },
    });
    fireEvent.click(screen.getByRole('button', { name: /draft preview with chat/i }));

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Mrs. A after discharge'),
          authToken: 'test-token',
        })
      );
    });
    expect(sendClinicalChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Intent: Patient outreach'),
      })
    );
    expect(await screen.findByLabelText(/outreach plan preview/i)).toHaveTextContent(/draft message/i);

    fireEvent.click(screen.getByRole('button', { name: /confirm creation/i }));

    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('Outreach plan'),
        metadata: expect.objectContaining({
          outreachPlan: expect.objectContaining({
            status: 'confirmed',
            intent: 'Patient outreach',
            target: 'Mrs. A after discharge',
          }),
        }),
      })
    );
  });

  it('can seed outreach context from visible Chat context', async () => {
    const user = userEvent.setup();
    mockConversationValue.messages = [
      { id: 'm1', role: 'user', content: 'Recent discharge summary: pneumonia follow-up needed.' },
    ];
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /plan outreach/i }));
    await user.click(screen.getByRole('button', { name: /use latest visible context/i }));

    expect(screen.getByLabelText(/optional clinical context/i).value).toContain(
      'Recent discharge summary'
    );
  });
});
