import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import DataLineageExplorer from './DataLineageExplorer';

describe('DataLineageExplorer', () => {
  it('renders lineage stages, metadata, transformations, and timestamps', () => {
    render(<DataLineageExplorer />);

    expect(screen.getByRole('heading', { name: /data lineage explorer/i })).toBeInTheDocument();
    expect(screen.getByText(/input -> ai -> tool -> backend -> output/i)).toBeInTheDocument();

    for (const label of [/input/i, /^ai$/i, /^tool$/i, /^backend$/i, /^output$/i]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getAllByText(/model/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/calculator/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/source/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Normalize clinical question/i)).toBeInTheDocument();
  });

  it('filters lineage flows by category and search query', async () => {
    const user = userEvent.setup();
    render(<DataLineageExplorer />);

    await user.selectOptions(screen.getByLabelText(/category/i), 'Calculator');
    expect(screen.getByRole('heading', { name: /news2 calculator escalation context/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /guideline rag evidence answer/i })
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/category/i), 'all');
    await user.type(screen.getByLabelText(/search lineage/i), 'order set');

    const flows = screen.getByRole('region', { name: /lineage flows/i });
    expect(within(flows).getByRole('heading', { name: /order set ai draft/i })).toBeInTheDocument();
  });
});
