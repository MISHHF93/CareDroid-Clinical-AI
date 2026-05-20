/**
 * ChatInterface — NLU/chat integration (Vitest + clinicalChatService mocks).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: (...args) => sendClinicalChatMessage(...args),
  mapChatResponseToAssistantMessage: (...args) => mapChatResponseToAssistantMessage(...args),
}));

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

describe('ChatInterface NLU integration', () => {
  const onAppendMessage = vi.fn();

  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
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
    });
    expect(onAppendMessage).toHaveBeenCalled();
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
});
