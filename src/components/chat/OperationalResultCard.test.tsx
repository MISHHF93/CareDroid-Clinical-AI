import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperationalResultCard from './OperationalResultCard';

vi.mock('./OperationalResultCard.css', () => ({}));
vi.mock('../ToolCard.css', () => ({}));

describe('OperationalResultCard', () => {
  it('renders route-backed recommended next actions after a successful result', () => {
    render(
      <MemoryRouter>
        <OperationalResultCard
          toolResult={{
            toolId: 'lab-interpreter',
            toolName: 'Lab Interpreter',
            result: {
              success: true,
              data: { summary: { abnormal: 2, total: 8, critical: 1 } },
            },
          }}
        />
      </MemoryRouter>
    );

    const actions = screen.getByText(/next best actions/i).closest('.operational-result-card__section');
    expect(within(actions).getByRole('link', { name: /review detailed output/i })).toHaveAttribute(
      'href',
      '/timeline'
    );
    expect(within(actions).getByRole('link', { name: /open recommended next actions/i })).toHaveAttribute(
      'href',
      '/recommendations'
    );
  });
});
