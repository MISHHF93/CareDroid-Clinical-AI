import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  sendClinicalChatMessage: vi.fn().mockResolvedValue({ ok: true, data: { content: 'ok' } }),
  mapChatResponseToAssistantMessage: vi.fn(() => ({ role: 'assistant', content: 'ok' })),
  registryIdToChatToolParam: vi.fn(() => null),
}));

vi.mock('../utils/toolRecommendations', () => ({
  getToolRecommendationsNLU: vi.fn().mockResolvedValue([]),
  recordRecommendationFeedback: vi.fn(),
}));

function renderDashboard(route = '/dashboard') {
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
  });

  it('renders Pulse as the simple home surface', async () => {
    renderDashboard();

    expect(screen.getByRole('heading', { level: 1, name: /pulse/i })).toBeInTheDocument();
    expect(screen.getByText(/see what matters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /outreach and follow-up/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask anything clinical/i)).toBeInTheDocument();
  });

  it('renders a complete clinical chat shell', async () => {
    renderDashboard('/chat');

    expect(screen.getByRole('heading', { level: 1, name: /caredroid clinical chat/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/chat context/i)).toHaveTextContent(/online/i);
    expect(screen.getByPlaceholderText(/ask anything clinical/i)).toBeInTheDocument();
    expect(screen.getByText(/decision support only/i)).toBeInTheDocument();
  });

  it('prefills the composer from starter prompts', async () => {
    const user = userEvent.setup();
    renderDashboard('/chat');

    await user.click(screen.getByRole('button', { name: /check medication safety/i }));

    expect(screen.getByLabelText(/clinical chat message/i).value).toMatch(/check for drug interactions/i);
  });

  it('makes outreach visible and opens a guided planner', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /outreach and follow-up/i }));

    expect(screen.getByRole('dialog', { name: /plan follow-up outreach/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/outreach workflow steps/i)).toHaveTextContent(/choose target/i);
    expect(screen.getByText(/no outreach message will be sent/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/outreach chat preview/i)).toHaveTextContent(/do not send/i);
  });

  it('confirms guided outreach through the existing Chat path', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /outreach and follow-up/i }));
    await user.type(screen.getByLabelText(/patient or cohort target/i), 'Mrs. A after discharge');
    await user.type(screen.getByLabelText(/follow-up reason/i), 'symptom check and return precautions');
    await user.click(screen.getByRole('button', { name: /confirm and ask chat/i }));

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
        message: expect.stringContaining('Do not send any message'),
      })
    );
  });
});
