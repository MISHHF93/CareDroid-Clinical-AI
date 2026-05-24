/**
 * Tool render / execute smoke — pages render; Tier C uses executor; Tier A stays local.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DrugChecker from '../pages/tools/DrugChecker';
import LabInterpreter from '../pages/tools/LabInterpreter';
import Protocols from '../pages/tools/Protocols';
import DiagnosisAssistant from '../pages/tools/DiagnosisAssistant';
import ProcedureGuide from '../pages/tools/ProcedureGuide';
import ToolsOverview from '../pages/tools/ToolsOverview';
import Calculators from '../pages/tools/Calculators';
import {
  buildRenderExecuteMatrix,
  EXECUTION_MODES,
} from '../data/toolRenderExecuteMatrix';
import {
  expectNonEmptyPage,
  mockConversationValue,
  mockToolPreferencesValue,
  mockUserValue,
} from './testRenderUtils';

vi.mock('../pages/tools/Calculators.css', () => ({}));
vi.mock('../pages/tools/ToolPageLayout.css', () => ({}));
vi.mock('../components/ToolApiErrorBanner.css', () => ({}));

const mockExecuteClinicalTool = vi.fn();
vi.mock('../services/clinicalOrchestratorApi', () => ({
  executeClinicalTool: (...args) => mockExecuteClinicalTool(...args),
  classifyOrchestratorExecution: (toolId) => ({
    status: 'executable',
    requestedId: toolId,
    nluToolId: toolId,
    message: `POST /api/tools/${toolId}/execute`,
  }),
}));

const mockApiFetch = vi.fn();
vi.mock('../services/apiClient', () => ({
  apiFetch: (...args) => mockApiFetch(...args),
  parseApiResponse: vi.fn(async (response) => {
    if (typeof response?._json !== 'undefined') return response._json;
    return response?.json ? await response.json() : {};
  }),
  getApiErrorMessage: vi.fn((_err, res) =>
    res?.status ? `Request failed (${res.status})` : 'Network error'
  ),
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../services/analyticsService', () => ({
  default: { trackEvent: vi.fn() },
}));

vi.mock('../services/offlineService', () => ({
  default: { saveToolResult: vi.fn() },
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    workspaces: [{ id: 'all', name: 'All Tools', toolIds: [] }],
    activeWorkspaceId: 'all',
    setActiveWorkspaceId: vi.fn(),
  }),
}));

vi.mock('../services/clinicalToolsApi', () => ({
  fetchBackendClinicalTools: vi.fn().mockResolvedValue({ ok: true, tools: [] }),
  fetchClinicalToolMetadata: vi.fn((toolId) =>
    Promise.resolve({
      ok: true,
      data: { id: toolId, name: toolId, parameters: [] },
    })
  ),
  fetchToolStatistics: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      totalTools: 3,
      tools: [
        { id: 'drug-interactions', name: 'Drug interactions', category: 'diagnostic' },
        { id: 'lab-interpreter', name: 'Lab interpreter', category: 'diagnostic' },
        { id: 'sofa-calculator', name: 'SOFA calculator', category: 'calculator' },
      ],
    },
  }),
  validateClinicalTool: vi.fn().mockResolvedValue({
    ok: true,
    data: { valid: true, errors: [], warnings: [], resolvedToolId: 'test-tool' },
  }),
}));

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe('toolRenderExecuteSmoke — clinical pages non-empty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteClinicalTool.mockReset();
    mockApiFetch.mockReset();
  });

  it.each([
    ['/tools/drug-checker', DrugChecker, /enter medications/i],
    ['/tools/lab-interpreter', LabInterpreter, /lab values input/i],
    ['/tools/protocols', Protocols, /search for a protocol/i],
    ['/tools/diagnosis', DiagnosisAssistant, /patient presentation/i],
    ['/tools/procedures', ProcedureGuide, /search for a procedure/i],
    ['/tools', ToolsOverview, /^Tool Library$/i],
  ])('%s renders primary UI', async (path, Page, matcher) => {
    const { container } = renderAt(path, <Page />);
    expect(await screen.findByText(matcher)).toBeInTheDocument();
    expectNonEmptyPage(container);
  });
});

describe('toolRenderExecuteSmoke — Tier C executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DrugChecker calls executeClinicalTool and shows results', async () => {
    mockExecuteClinicalTool.mockResolvedValue({
      ok: true,
      data: { interactions: [], summary: 'No interactions found.' },
      raw: { result: { interpretation: 'ok' } },
    });

    renderAt('/tools/drug-checker', <DrugChecker />);
    fireEvent.click(screen.getByRole('button', { name: /add another medication/i }));
    const inputs = screen.getAllByPlaceholderText(/medication name/i);
    fireEvent.change(inputs[0], { target: { value: 'Warfarin' } });
    fireEvent.change(inputs[1], { target: { value: 'Aspirin' } });
    const checkButton = screen.getByRole('button', { name: /check interactions/i });
    await waitFor(() => expect(checkButton).not.toBeDisabled());
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(mockExecuteClinicalTool).toHaveBeenCalledWith(
        'drug-interactions',
        expect.objectContaining({ medications: ['Warfarin', 'Aspirin'] })
      );
    });
    expect(await screen.findByText(/no major interactions detected/i)).toBeInTheDocument();
  });

  it('DrugChecker shows user-visible error when executor fails', async () => {
    mockExecuteClinicalTool.mockResolvedValue({
      ok: false,
      unsupported: true,
      message: 'Tool is not available for server execution.',
    });

    renderAt('/tools/drug-checker', <DrugChecker />);
    fireEvent.click(screen.getByRole('button', { name: /add another medication/i }));
    const inputs = screen.getAllByPlaceholderText(/medication name/i);
    fireEvent.change(inputs[0], { target: { value: 'A' } });
    fireEvent.change(inputs[1], { target: { value: 'B' } });
    const checkButton = screen.getByRole('button', { name: /check interactions/i });
    await waitFor(() => expect(checkButton).not.toBeDisabled());
    fireEvent.click(checkButton);

    expect(await screen.findByText(/not available|unable/i)).toBeInTheDocument();
  });

  it('LabInterpreter shows user-visible unsupported state when executor is unavailable', async () => {
    mockExecuteClinicalTool.mockResolvedValue({
      ok: false,
      unsupported: true,
      message: 'Lab interpreter is not available for server execution.',
    });

    renderAt('/tools/lab-interpreter', <LabInterpreter />);
    fireEvent.click(screen.getByRole('button', { name: /load example/i }));
    const interpretButton = screen.getByRole('button', { name: /interpret lab values/i });
    await waitFor(() => expect(interpretButton).not.toBeDisabled());
    fireEvent.click(interpretButton);

    await waitFor(() => {
      expect(mockExecuteClinicalTool).toHaveBeenCalledWith('lab-interpreter', expect.any(Object));
    });
    expect(await screen.findByText(/not available for server execution/i)).toBeInTheDocument();
  });

  it('SOFA calculator shows user-visible unsupported state when executor is unavailable', async () => {
    mockExecuteClinicalTool.mockResolvedValue({
      ok: false,
      unsupported: true,
      message: 'SOFA calculator is not available for server execution.',
    });

    render(
      <MemoryRouter initialEntries={['/tools/calculator/sofa']}>
        <Calculators initialCalculatorId="sofa" />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '120' } });
    const calculateButton = screen.getByRole('button', { name: /calculate sofa score/i });
    await waitFor(() => expect(calculateButton).not.toBeDisabled());
    fireEvent.click(calculateButton);

    await waitFor(() => {
      expect(mockExecuteClinicalTool).toHaveBeenCalledWith('sofa-calculator', expect.any(Object));
    });
    expect(await screen.findByText(/not available for server execution/i)).toBeInTheDocument();
  });
});

describe('toolRenderExecuteSmoke — chat pages graceful API failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable', _json: {} });
  });

  it('Protocols shows alert on API failure', async () => {
    renderAt('/tools/protocols', <Protocols />);
    fireEvent.click(screen.getByRole('button', { name: /sepsis management/i }));

    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
  });
});

describe('toolRenderExecuteSmoke — Tier A local (no orchestrator on qSOFA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('qSOFA calculate does not call executeClinicalTool', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/tools/calculators/qsofa']}>
        <Calculators initialCalculatorId="qsofa" />
      </MemoryRouter>
    );
    const iface = container.querySelector('.calculator-interface--qsofa');
    expect(iface).toBeTruthy();
    const btn = within(iface).getByRole('button', { name: /calculate qsofa/i });
    fireEvent.click(btn);
    expect(mockExecuteClinicalTool).not.toHaveBeenCalled();
  });
});

describe('toolRenderExecuteSmoke — matrix modes', () => {
  it('every registry row has smoke path and valid execution mode', () => {
    const modes = new Set(Object.values(EXECUTION_MODES));
    for (const row of buildRenderExecuteMatrix()) {
      expect(modes.has(row.executionMode) || row.executionMode === 'other').toBe(true);
      expect(row.checks.nonEmpty).toBe(true);
      if (row.executionMode === EXECUTION_MODES.LOCAL_CALCULATOR) {
        expect(row.checks.usesLocalOnly).toBe(true);
        expect(row.checks.usesPostExecute).toBe(false);
      }
    }
  });
});
