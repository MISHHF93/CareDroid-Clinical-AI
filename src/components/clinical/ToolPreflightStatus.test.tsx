import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ToolPreflightStatus from './ToolPreflightStatus';
import {
  fetchClinicalToolMetadata,
  fetchToolStatistics,
  validateClinicalTool,
} from '../../services/clinicalToolsApi';

vi.mock('./ToolPreflightStatus.css', () => ({}));

vi.mock('../../services/clinicalOrchestratorApi', () => ({
  classifyOrchestratorExecution: (toolId) =>
    toolId === 'unsupported-tool'
      ? {
          status: 'unsupported',
          requestedId: toolId,
          errorCode: 'UNSUPPORTED_TOOL',
          message: 'No executor.',
        }
      : {
          status: 'executable',
          requestedId: toolId,
          nluToolId: toolId,
          message: `POST /api/tools/${toolId}/execute`,
        },
}));

vi.mock('../../services/clinicalToolsApi', () => ({
  fetchClinicalToolMetadata: vi.fn(),
  fetchToolStatistics: vi.fn(),
  validateClinicalTool: vi.fn(),
}));

describe('ToolPreflightStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchClinicalToolMetadata.mockResolvedValue({
      ok: true,
      data: {
        id: 'drug-interactions',
        name: 'Drug Interactions',
        parameters: [{ name: 'medications', required: true, description: 'Medication list' }],
      },
    });
    fetchToolStatistics.mockResolvedValue({
      ok: true,
      data: {
        totalTools: 3,
        tools: [{ id: 'drug-interactions', name: 'Drug Interactions', category: 'diagnostic' }],
      },
    });
    validateClinicalTool.mockResolvedValue({
      ok: true,
      data: { valid: true, errors: [], warnings: [], resolvedToolId: 'drug-interactions' },
    });
  });

  it('shows availability, required inputs, validation readiness, and safe execution state', async () => {
    const onReadyChange = vi.fn();

    render(
      <ToolPreflightStatus
        toolId="drug-interactions"
        parameters={{ medications: ['Warfarin', 'Aspirin'], severityFilter: 'all' }}
        requiredInputs={[{ label: 'At least 2 medication names', present: true }]}
        onReadyChange={onReadyChange}
      />
    );

    expect(await screen.findByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Medication list')).toBeInTheDocument();
    expect(screen.getByText('At least 2 medication names')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Ready')).toBeInTheDocument());
    expect(screen.getByText('Safe to execute')).toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it('blocks readiness and shows missing-field warnings before submit', async () => {
    const onReadyChange = vi.fn();

    render(
      <ToolPreflightStatus
        toolId="drug-interactions"
        parameters={{ medications: ['Warfarin'], severityFilter: 'all' }}
        requiredInputs={[{ label: 'At least 2 medication names', present: false }]}
        onReadyChange={onReadyChange}
      />
    );

    expect(await screen.findByText(/missing: at least 2 medication names/i)).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
  });

  it('renders nothing for tools without registered executors', () => {
    const { container } = render(
      <ToolPreflightStatus
        toolId="unsupported-tool"
        parameters={{}}
        requiredInputs={[{ label: 'Some input', present: false }]}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(fetchClinicalToolMetadata).not.toHaveBeenCalled();
    expect(validateClinicalTool).not.toHaveBeenCalled();
  });
});
