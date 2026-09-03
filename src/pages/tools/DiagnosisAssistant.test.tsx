import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DiagnosisAssistant from './DiagnosisAssistant';
import { mockConversationValue, mockToolPreferencesValue } from '../../test/testRenderUtils';
import { sendClinicalChatMessage } from '../../services/clinicalChatService';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/diagnosis']}>
      <DiagnosisAssistant />
    </MemoryRouter>,
  );
}

// Regression coverage: this page hand-rolled its own error box with no retry
// affordance, unlike every sibling AI tool page (DifferentialAi, GuidelineRag,
// OrderSetAi, etc.), which use ApiStateBanner/ToolApiErrorBanner's onRetry to
// let a clinician re-run a failed request without re-typing the whole form.
describe('DiagnosisAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers a "Try again" retry action when generation fails, and re-submits the same request on click', async () => {
    vi.mocked(sendClinicalChatMessage)
      .mockResolvedValueOnce({
        ok: false,
        data: { message: 'Model temporarily unavailable' },
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        data: { response: 'Differential: ACS, PE, aortic dissection.' },
      } as any);

    renderPage();

    fireEvent.change(screen.getByLabelText(/presenting symptoms/i), {
      target: { value: 'Chest pain with diaphoresis' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate ddx/i }));

    const retryButton = await screen.findByRole('button', { name: /try again/i });
    expect(screen.getByText(/model temporarily unavailable/i)).toBeInTheDocument();

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText(/Differential: ACS, PE, aortic dissection\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/model temporarily unavailable/i)).not.toBeInTheDocument();
  });

  it('does not offer retry when there is nothing to retry (no symptoms entered yet)', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});
