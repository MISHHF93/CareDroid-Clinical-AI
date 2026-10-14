import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobilityAiOperationsAssistant from './MobilityAiOperationsAssistant';

describe('MobilityAiOperationsAssistant', () => {
  it('renders AI assistant recommendations and advice triggers', () => {
    render(<MobilityAiOperationsAssistant />);

    expect(
      screen.getByText(/Mobility AI Operations Assistant & Decision Support/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pre-position eVTOL Falcon at Helipad 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Cold-Chain Ambient Warning/i)).toBeInTheDocument();
  });

  it('marks recommendation as applied when clicking apply button', () => {
    const onApply = vi.fn();
    render(<MobilityAiOperationsAssistant onApplyRecommendation={onApply} />);

    const applyBtns = screen.getAllByRole('button', { name: /Apply Advice/i });
    fireEvent.click(applyBtns[0]);

    expect(onApply).toHaveBeenCalledWith('rec-01');
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });
});
