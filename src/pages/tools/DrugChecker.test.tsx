import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DrugChecker from './DrugChecker';

vi.mock('../../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'staff-1', name: 'Demo Physician' } }),
}));

vi.mock('../../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ warning: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('../../services/analyticsService', () => ({ default: { track: vi.fn() } }));
vi.mock('../../services/offlineService', () => ({ default: { isOnline: () => true } }));
vi.mock('../../services/clinicalOrchestratorApi', () => ({ executeClinicalTool: vi.fn() }));
vi.mock('../../components/clinical/ClinicalExecutorFeedback', () => ({
  ClinicalExecutorFeedback: () => null,
}));
vi.mock('../../components/clinical/ToolPreflightStatus', () => ({ default: () => null }));
vi.mock('./ToolPageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('DrugChecker medication row identity (HEAL-222)', () => {
  it('keeps focus on the same logical medication row after an earlier row is removed', () => {
    render(<DrugChecker />);

    fireEvent.click(screen.getByText('+ Add Another Medication'));
    fireEvent.click(screen.getByText('+ Add Another Medication'));

    const inputs = screen.getAllByPlaceholderText(/Enter medication name/i);
    expect(inputs).toHaveLength(3);

    fireEvent.change(inputs[0], { target: { value: 'Warfarin' } });
    fireEvent.change(inputs[1], { target: { value: 'Aspirin' } });
    fireEvent.change(inputs[2], { target: { value: 'Ibuprofen' } });

    const lastInput = screen.getAllByPlaceholderText(/Enter medication name/i)[2];
    lastInput.focus();
    expect(document.activeElement).toBe(lastInput);

    const removeButtons = screen.getAllByTitle('Remove medication');
    fireEvent.click(removeButtons[0]);

    const remainingInputs = screen.getAllByPlaceholderText(/Enter medication name/i);
    expect(remainingInputs).toHaveLength(2);

    // The row that was showing "Ibuprofen" (and held focus) must still be
    // the focused element after an earlier row is removed -- with
    // key={index}, removing row 0 either strands focus on a stale/removed
    // node or silently shows the wrong medication's value in the still-
    // focused slot.
    expect((document.activeElement as HTMLInputElement).value).toBe('Ibuprofen');
  });
});
