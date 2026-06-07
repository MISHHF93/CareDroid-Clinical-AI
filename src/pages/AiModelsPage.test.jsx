import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiModelsPage from './AiModelsPage';

describe('AI model registry page', () => {
  it('renders the unified AI model registry', () => {
    render(<AiModelsPage />);

    expect(screen.getByRole('heading', { name: /AI Model Registry/i })).toBeVisible();
    expect(screen.getByText('AI Gateway')).toBeVisible();
    expect(screen.getByText('Artifact Resonance')).toBeVisible();
    expect(screen.getByText(/does not claim a trained artifact model exists/i)).toBeVisible();
  });

  it('filters AI systems by query and risk', () => {
    render(<AiModelsPage />);

    fireEvent.change(screen.getByLabelText(/Search AI systems/i), {
      target: { value: 'guardrails' },
    });

    expect(screen.getByText('Guardrails')).toBeVisible();
    expect(screen.queryByText('Simulation Tutor')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Search AI systems/i), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText(/Risk/i), {
      target: { value: 'critical' },
    });

    expect(screen.getByText('Guardrails')).toBeVisible();
    expect(screen.queryByText('Cost Optimizer')).not.toBeInTheDocument();
  });
});
