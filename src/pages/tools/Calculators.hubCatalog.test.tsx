/**
 * Calculator hub — every built-in slug visible, launchable, and renders core UI affordances.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Calculators from './Calculators';
import {
  BUILTIN_CALCULATOR_FORM_SMOKE_ROWS,
  HUB_CHAT_ASSISTED_TOOL_IDS,
  buildBuiltinHubCalculatorCards,
  getHubChatAssistedTools,
} from '../../data/calculatorHubManifest';
import { getCalculatorToolInventory } from '../../data/toolInventory';
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

vi.mock('../../components/clinical/ToolPreflightStatus', () => ({
  default: () => <div data-testid="tool-preflight-status">Preflight ready</div>,
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
    Promise.resolve({ ok: true, data: { id: toolId, name: toolId, parameters: [] } })
  ),
  fetchToolStatistics: vi.fn().mockResolvedValue({
    ok: true,
    data: { totalTools: 3, tools: [{ id: 'sofa-calculator', name: 'SOFA', category: 'calculator' }] },
  }),
  validateClinicalTool: vi.fn().mockResolvedValue({
    ok: true,
    data: { valid: true, errors: [], warnings: [], resolvedToolId: 'sofa-calculator' },
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

  it('derives built-in calculator cards from dedicated calculator inventory records', () => {
    const cards = buildBuiltinHubCalculatorCards();
    const dedicated = getCalculatorToolInventory().filter((record) => record.hasDedicatedForm);

    expect(cards).toHaveLength(dedicated.length);
    for (const record of dedicated) {
      const card = cards.find((candidate) => candidate.id === record.calculatorSlug);
      expect(card, record.id).toBeTruthy();
      if (!card) throw new Error(`expected a hub card for ${record.id}`);
      expect(card.registryId, record.id).toBe(record.id);
      expect(card.route, record.id).toBe(record.route);
    }
  });

  it('shows NLU hub-only chat-assisted calculators', async () => {
    renderHub();
    await screen.findByRole('heading', { name: /screening & severity \(chat\)/i });

    expect(
      screen.getByRole('button', { name: /start guided chat: wells dvt/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start guided chat: hospital command assistant/i })
    ).toBeInTheDocument();
  });

  it('deduplicates calculator-related chat-assisted tools in hub manifest', () => {
    const tools = getHubChatAssistedTools();
    const chatAssistedCalculatorRecords = getCalculatorToolInventory().filter(
      (record) => record.surface === 'chat-assisted'
    );
    const registryIds = tools.map((tool) => tool.registryId);
    expect(tools.length).toBeGreaterThan(0);
    expect(new Set(tools.map((tool) => tool.toolId)).size).toBe(tools.length);
    expect(tools.map((tool) => tool.toolId)).not.toContain('dispatch-ai');
    for (const record of chatAssistedCalculatorRecords) {
      expect(registryIds, record.id).toContain(record.id);
    }
    for (const toolId of NLU_HUB_ONLY_PROFILE_TOOL_IDS) {
      if ((toolId as string) === 'dispatch-ai') continue;
      expect(HUB_CHAT_ASSISTED_TOOL_IDS).toContain(toolId);
    }
  });

  it('renders exactly one hub affordance for every calculator inventory record', async () => {
    const dedicated = getCalculatorToolInventory().filter((record) => record.hasDedicatedForm);
    const chatAssisted = getCalculatorToolInventory().filter((record) => record.surface === 'chat-assisted');
    renderHub();
    await screen.findByRole('heading', { level: 1, name: /medical calculators/i });

    for (const record of dedicated) {
      expect(screen.getByText(record.label, { selector: '.calculator-name' })).toBeInTheDocument();
    }
    for (const record of chatAssisted) {
      const escaped = record.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`^Start guided chat: ${escaped}`, 'i');
      expect(screen.getByRole('button', { name: pattern })).toBeInTheDocument();
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

      // Specialty calculators load via React.lazy + Suspense — wait for the form shell.
      const selector = `.${interfaceClass.split(' ')[0]}`;
      await waitFor(
        () => {
          const el = container.querySelector(selector);
          expect(el).toBeTruthy();
        },
        { timeout: 8_000 },
      );
      const iface = container.querySelector(selector);
      if (!iface) throw new Error(`expected calculator interface element for ${interfaceClass}`);

      const scope = within(iface as HTMLElement);
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
