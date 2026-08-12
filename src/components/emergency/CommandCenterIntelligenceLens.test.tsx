import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommandCenterIntelligenceLens from './CommandCenterIntelligenceLens';

// Reached via the "Predictive AI" nav item's ?view=predictive redirect. The
// underlying DEMO_PREDICTIVE_ANALYTICS_MODELS data is explicitly authored fixture
// data (every entry carries modelStatus: 'demo-model' and a hand-picked, not
// computed, confidence score) -- the full PredictiveAnalyticsDashboard.tsx page this
// lens links to already discloses "Demo models -- predictions shown are not live",
// but this condensed lens (the more likely first stop from the nav item) rendered
// the same fabricated-looking scores with zero such disclosure.
describe('CommandCenterIntelligenceLens', () => {
  it('discloses that the predictive lens shows demo, not live, model output', () => {
    render(
      <MemoryRouter>
        <CommandCenterIntelligenceLens view="predictive" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Demo models', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/not live predictions/i)).toBeInTheDocument();
  });

  it('does not show the demo-model disclosure on the executive lens (its data comes from real fetch calls, not a hardcoded fixture)', () => {
    render(
      <MemoryRouter>
        <CommandCenterIntelligenceLens view="executive" />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Demo models', { exact: false })).not.toBeInTheDocument();
  });
});
