/**
 * Tier-A calculator forms — input sections and calculate actions render.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Calculators from './Calculators';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from '../../data/calculatorHubManifest';
import { mockCompactViewport, mockConversationValue, mockToolPreferencesValue } from '../../test/testRenderUtils';

/** Avoid jsdom/cssstyle crash on `border-left: 4px solid var(--primary-color)` in ToolPageLayout.css */
vi.mock('./Calculators.css', () => ({}));
vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../services/apiClient', () => ({
  apiFetch: vi.fn(),
  parseApiResponse: vi.fn(),
}));

vi.mock('../../services/clinicalOrchestratorApi', () => ({
  executeClinicalTool: vi.fn().mockResolvedValue({
    ok: true,
    data: { totalScore: 0, score: 0, severity: 'low' },
  }),
}));

function renderCalculator(slug) {
  return render(
    <MemoryRouter initialEntries={[`/tools/calculators/${slug}`]}>
      <Calculators initialCalculatorId={slug} />
    </MemoryRouter>
  );
}

describe('Calculators — hub shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(false);
  });

  it('renders calculators hub with chat-assisted section and selection cards', async () => {
    render(
      <MemoryRouter initialEntries={['/tools/calculators']}>
        <Calculators />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /medical calculators/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /chat-assisted clinical decision support/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start guided chat/i }).length).toBeGreaterThan(0);
  });
});

describe('Calculators — Tier-A form sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(false);
  });

  it.each(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS)(
    '$slug renders calculator interface, inputs, and calculate action',
    async ({ slug, interfaceClass }) => {
      const { container } = renderCalculator(slug);
      const iface = container.querySelector(`.${interfaceClass.split(' ')[0]}`);

      expect(iface).toBeTruthy();
      expect(
        iface.querySelector(
          '.calc-input-group, .calc-has-bled-fieldset, .calc-timi-criteria, .calc-input-grid, select, input'
        )
      ).toBeTruthy();
      expect(within(iface).getByRole('button', { name: /calculate/i })).toBeInTheDocument();
      expect(within(iface).getByText(/decision support only/i)).toBeInTheDocument();
    }
  );
});

describe('Calculators — compact viewport mock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(true);
  });

  it('renders qSOFA form without crashing at compact viewport', async () => {
    const { container } = renderCalculator('qsofa');
    const iface = container.querySelector('.calculator-interface--qsofa');
    expect(iface).toBeTruthy();
    expect(within(iface).getByRole('button', { name: /calculate qsofa/i })).toBeInTheDocument();
  });
});
