import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DependencyMap from './DependencyMap';

describe('DependencyMap', () => {
  it('renders wiring stages and issue categories', () => {
    render(<DependencyMap />);

    expect(screen.getByRole('heading', { name: /platform wiring map/i })).toBeInTheDocument();
    expect(screen.getByText(/frontend routes connect to inventory entries/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /dependency health/i })).toBeInTheDocument();
    expect(screen.getAllByText(/orphan ui/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/orphan backend/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/broken dependency/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/duplicate dependency/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/frontend route/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/inventory entry/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/api client/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/backend endpoint/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^service$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^executor$/i).length).toBeGreaterThan(0);
  });

  it('filters dependency issues by issue type', async () => {
    const user = userEvent.setup();
    render(<DependencyMap />);

    await user.selectOptions(screen.getByLabelText(/issue type/i), 'orphan-ui');

    expect(screen.getByLabelText(/issue type/i)).toHaveValue('orphan-ui');
    expect(screen.getAllByText(/orphan ui/i).length).toBeGreaterThan(0);
  });
});
