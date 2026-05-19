/**
 * Calculator hub — every built-in slug visible, launchable, and renders core UI affordances.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Calculators from './Calculators';
import {
  BUILTIN_CALCULATOR_FORM_SMOKE_ROWS,
  HUB_CHAT_ASSISTED_TOOL_IDS,
  buildBuiltinHubCalculatorCards,
} from '../../data/calculatorHubManifest';
import { NLU_HUB_ONLY_PROFILE_TOOL_IDS } from '../../data/clinicalToolIdContract';
import { mockCompactViewport, mockConversationValue, mockToolPreferencesValue } from '../../test/testRenderUtils';

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

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/tools/calculators']}>
      <Calculators />
    </MemoryRouter>
  );
}

function renderCalculatorAtPath(path, slug) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Calculators initialCalculatorId={slug} />
    </MemoryRouter>
  );
}

describe('Calculators hub catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(false);
  });

  it('shows every built-in calculator card on the hub', async () => {
    renderHub();
    await screen.findByRole('heading', { level: 1, name: /medical calculators/i });

    const cards = buildBuiltinHubCalculatorCards();
    for (const calc of cards) {
      expect(screen.getByText(calc.name, { selector: '.calculator-name' })).toBeInTheDocument();
    }
  });

  it('shows NLU hub-only chat-assisted calculators', async () => {
    renderHub();
    await screen.findByRole('heading', { name: /screening & severity \(chat\)/i });

    expect(screen.getByRole('button', { name: /start guided chat: apache-ii/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start guided chat: curb-65/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start guided chat: gcs/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start guided chat: wells dvt/i })
    ).toBeInTheDocument();
  });

  it('includes thirteen chat-assisted tools in hub manifest', () => {
    expect(HUB_CHAT_ASSISTED_TOOL_IDS.length).toBe(13);
    for (const toolId of NLU_HUB_ONLY_PROFILE_TOOL_IDS) {
      expect(HUB_CHAT_ASSISTED_TOOL_IDS).toContain(toolId);
    }
  });

  it('renders fallback UI for unknown calculator slug', async () => {
    render(
      <MemoryRouter>
        <Calculators initialCalculatorId="zz-hub-unknown-slug-999" />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /calculator not found/i })).toBeInTheDocument();
    expect(screen.getByText(/zz-hub-unknown-slug-999/i)).toBeInTheDocument();
  });
});

describe('Calculators — every built-in slug form shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(false);
  });

  it.each(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS)(
    '$slug renders form, calculate action, decision support, and results panel',
    async ({ slug, route, interfaceClass }) => {
      const path = route || `/tools/calculators/${slug}`;
      const { container } = renderCalculatorAtPath(path, slug);

      const iface = container.querySelector(`.${interfaceClass.split(' ')[0]}`);
      expect(iface).toBeTruthy();

      const scope = within(iface);
      expect(
        iface.querySelector(
          '.calc-input-group, .calc-has-bled-fieldset, .calc-timi-criteria, .calc-input-grid, select, input'
        )
      ).toBeTruthy();
      expect(scope.getByRole('button', { name: /calculate/i })).toBeInTheDocument();
      expect(scope.getByText(/decision support only/i)).toBeInTheDocument();
      expect(iface.querySelector('.calculator-results')).toBeTruthy();
    }
  );
});
