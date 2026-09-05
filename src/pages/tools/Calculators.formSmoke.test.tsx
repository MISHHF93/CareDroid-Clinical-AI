/**
 * Tier-A calculator forms — input sections and calculate actions render.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Calculators from './Calculators';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from '../../data/calculatorHubManifest';
import { PR1_PR5_TIER_A_FORM_SLUGS } from '../../data/pr1Pr5CalculatorMobile.test';
import { getCalculatorToolInventory } from '../../data/toolInventory';
import { CALCULATOR_ROUTE_DEFS } from '../../routes/clinicalToolRoutes';
import {
  mockCompactViewport,
  mockConversationValue,
  mockToolPreferencesValue,
} from '../../test/testRenderUtils';

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
  classifyOrchestratorExecution: (toolId) => ({
    status: 'executable',
    requestedId: toolId,
    nluToolId: toolId,
    message: `POST /api/tools/${toolId}/execute`,
  }),
}));

vi.mock('../../services/clinicalToolsApi', () => ({
  fetchClinicalToolMetadata: vi.fn((toolId) =>
    Promise.resolve({ ok: true, data: { id: toolId, name: toolId, parameters: [] } }),
  ),
  fetchToolStatistics: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      totalTools: 3,
      tools: [{ id: 'sofa-calculator', name: 'SOFA', category: 'calculator' }],
    },
  }),
  validateClinicalTool: vi.fn().mockResolvedValue({
    ok: true,
    data: { valid: true, errors: [], warnings: [], resolvedToolId: 'sofa-calculator' },
  }),
}));

function renderCalculator(slug) {
  return render(
    <MemoryRouter initialEntries={[`/tools/calculators/${slug}`]}>
      <Calculators initialCalculatorId={slug} />
    </MemoryRouter>,
  );
}

/**
 * Every calculator interface below arrives through a React.lazy boundary, so
 * these waits are covering a dynamic import, not a re-render.
 * testing-library's default waitFor timeout is 1000ms while this file's tests
 * get 30_000ms, and under `npm run test:run:parallel` (4 workers, 1073 files)
 * this one file takes ~42s wall — a lazy chunk routinely needs longer than a
 * second to resolve under that load. That mismatch is what made
 * 'duke-treadmill-score renders calculator interface' fail with
 * "expected null to be truthy" in a full-suite run on 2026-09-05 while passing
 * 235/235 in isolation. Ten seconds is still well inside the per-test budget,
 * so a genuinely stuck import still fails the test rather than hanging.
 */
const LAZY_INTERFACE_TIMEOUT_MS = 10_000;

async function waitForSofaPreflight(iface, calculatorSlug) {
  if (calculatorSlug !== 'sofa') return;
  await waitFor(() => {
    expect(
      within(iface).getByText(/missing: at least 1 sofa clinical parameter/i),
    ).toBeInTheDocument();
  });
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
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /medical calculators/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /chat-assisted clinical decision support/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start guided chat/i }).length).toBeGreaterThan(0);
  }, 20000);
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
      // Specialty families resolve via React.lazy (Cycle 67); the interface node
      // is not present on the synchronous first render, only after Suspense resolves.
      const iface = await waitFor(
        () => {
          const el = container.querySelector(
            `.${interfaceClass.split(' ')[0]}`,
          ) as HTMLElement | null;
          expect(el).toBeTruthy();
          return el as HTMLElement;
        },
        { timeout: LAZY_INTERFACE_TIMEOUT_MS },
      );
      expect(
        iface.querySelector(
          '.calc-input-group, .calc-has-bled-fieldset, .calc-timi-criteria, .calc-input-grid, select, input',
        ),
      ).toBeTruthy();
      expect(within(iface).getByRole('button', { name: /calculate/i })).toBeInTheDocument();
      expect(within(iface).getByText(/decision support only/i)).toBeInTheDocument();
      await waitForSofaPreflight(iface, slug);
    },
  );

  it('covers every dedicated calculator inventory route with a form smoke row', () => {
    const smokeSlugs = new Set(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS.map((row) => row.slug));
    for (const record of getCalculatorToolInventory().filter((tool) => tool.hasDedicatedForm)) {
      expect(smokeSlugs.has(record.calculatorSlug), record.id).toBe(true);
      expect(record.route, record.id).toBeTruthy();
    }
  });

  it.each(CALCULATOR_ROUTE_DEFS)(
    '$path route renders non-empty usable calculator form',
    async ({ path, calculatorSlug }) => {
      const smokeRow = BUILTIN_CALCULATOR_FORM_SMOKE_ROWS.find(
        (row) => row.slug === calculatorSlug,
      );
      expect(smokeRow, calculatorSlug).toBeTruthy();
      if (!smokeRow) throw new Error(`expected form smoke row for ${calculatorSlug}`);

      const { container } = render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path} element={<Calculators initialCalculatorId={calculatorSlug} />} />
          </Routes>
        </MemoryRouter>,
      );
      const iface = await waitFor(
        () => {
          const el = container.querySelector(
            `.${smokeRow.interfaceClass.split(' ')[0]}`,
          ) as HTMLElement | null;
          expect(el).toBeTruthy();
          return el as HTMLElement;
        },
        { timeout: LAZY_INTERFACE_TIMEOUT_MS },
      );
      expect(iface.querySelector('input, select, textarea, .calc-checkbox-group')).toBeTruthy();
      expect(within(iface).getByRole('button', { name: /calculate/i })).toBeInTheDocument();
      expect(iface.querySelector('.calculator-results')).toBeTruthy();
      await waitForSofaPreflight(iface, calculatorSlug);
    },
  );
});

describe('Calculators — compact viewport mock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(true);
  });

  it('renders qSOFA form without crashing at compact viewport', async () => {
    const { container } = renderCalculator('qsofa');
    const iface = container.querySelector('.calculator-interface--qsofa') as HTMLElement | null;
    expect(iface).toBeTruthy();
    if (!iface) throw new Error('expected qSOFA calculator interface');
    expect(within(iface).getByRole('button', { name: /calculate qsofa/i })).toBeInTheDocument();
  });

  it.each(PR1_PR5_TIER_A_FORM_SLUGS)(
    '%s exposes reset control for mobile form completion',
    async (slug) => {
      const { container } = renderCalculator(slug);
      const root = await waitFor(
        () => {
          const el = container.querySelector(
            `[class*="calculator-interface"]`,
          ) as HTMLElement | null;
          expect(el).toBeTruthy();
          return el as HTMLElement;
        },
        { timeout: LAZY_INTERFACE_TIMEOUT_MS },
      );
      expect(within(root).getByRole('button', { name: /reset/i })).toBeInTheDocument();
    },
  );
});
