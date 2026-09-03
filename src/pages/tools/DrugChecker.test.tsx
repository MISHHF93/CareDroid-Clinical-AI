import { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DrugChecker from './DrugChecker';
import { executeClinicalTool } from '../../services/clinicalOrchestratorApi';

vi.mock('../../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'staff-1', name: 'Demo Physician' } }),
}));

vi.mock('../../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../../services/analyticsService', () => ({ default: { track: vi.fn() } }));
vi.mock('../../services/offlineService', () => ({ default: { isOnline: () => true } }));
vi.mock('../../services/clinicalOrchestratorApi', () => ({ executeClinicalTool: vi.fn() }));
vi.mock('../../components/clinical/ClinicalExecutorFeedback', () => ({
  ClinicalExecutorFeedback: () => null,
}));
vi.mock('../../components/clinical/ToolPreflightStatus', () => ({
  default: ({ onReadyChange }: any) => {
    useEffect(() => {
      onReadyChange?.(true);
    }, [onReadyChange]);
    return null;
  },
}));
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

describe('DrugChecker patient allergies (HEAL-309)', () => {
  it('lets a clinician add allergy rows and sends them to the backend alongside medications', async () => {
    vi.mocked(executeClinicalTool).mockResolvedValue({
      ok: true,
      data: { interactions: [], groupedBySeverity: { contraindicated: [] } },
    } as any);

    render(<DrugChecker />);

    const medInputs = screen.getAllByPlaceholderText(/Enter medication name/i);
    fireEvent.change(medInputs[0], { target: { value: 'Amoxicillin' } });
    fireEvent.click(screen.getByText('+ Add Another Medication'));
    const medInputsAfter = screen.getAllByPlaceholderText(/Enter medication name/i);
    fireEvent.change(medInputsAfter[1], { target: { value: 'Metoprolol' } });

    // Before HEAL-309 there was no allergy input on this page at all --
    // this placeholder/button did not exist and the tool never sent an
    // `allergies` parameter no matter what the clinician knew about the
    // patient.
    const allergyInputs = screen.getAllByPlaceholderText(/Enter allergy/i);
    fireEvent.change(allergyInputs[0], { target: { value: 'Penicillin' } });

    fireEvent.click(screen.getByText('🔍 Check Interactions'));

    await screen.findByText('🔍 Check Interactions');

    expect(executeClinicalTool).toHaveBeenCalledWith(
      'drug-interactions',
      expect.objectContaining({
        medications: ['Amoxicillin', 'Metoprolol'],
        allergies: ['Penicillin'],
      }),
    );
  });
});
