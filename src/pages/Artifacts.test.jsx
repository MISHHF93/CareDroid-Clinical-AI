import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import Artifacts from './Artifacts';

const mockData = vi.hoisted(() => ({
  artifacts: [
    {
      id: 'sepsis-escalation-workflow',
      type: 'workflow',
      title: 'Sepsis Escalation Workflow',
      description: 'Stepwise workflow for screening and sepsis escalation.',
      tags: ['workflow', 'sepsis'],
      relationships: [
        {
          artifactId: 'antimicrobial-timeout-protocol',
          type: 'uses',
          label: 'Requires protocol review',
        },
      ],
      version: '2.0.0',
      createdAt: '2026-01-20T10:30:00.000Z',
    },
    {
      id: 'triage-handoff-prompt',
      type: 'prompt',
      title: 'Triage Handoff Prompt',
      description: 'Prompt for acute handoff summaries.',
      tags: ['prompt', 'handoff'],
      relationships: [],
      version: '1.4.1',
      createdAt: '2026-02-03T08:15:00.000Z',
    },
    {
      id: 'antimicrobial-timeout-protocol',
      type: 'protocol',
      title: 'Antimicrobial Timeout Protocol',
      description: 'Medication stewardship protocol.',
      tags: ['protocol', 'medication'],
      relationships: [
        {
          artifactId: 'sepsis-escalation-workflow',
          type: 'governs',
          label: 'Controls workflow checkpoint',
        },
      ],
      version: '3.1.0',
      createdAt: '2026-02-18T16:20:00.000Z',
    },
  ],
}));

vi.mock('../services/artifactsApi', () => ({
  ARTIFACT_TYPE_OPTIONS: [
    { value: 'calculator', label: 'Calculators' },
    { value: 'workflow', label: 'Workflows' },
    { value: 'prompt', label: 'Prompts' },
    { value: 'dashboard', label: 'Dashboards' },
    { value: 'template', label: 'Templates' },
    { value: 'protocol', label: 'Protocols' },
    { value: 'telemetry_schema', label: 'Telemetry schemas' },
    { value: 'map', label: 'Maps' },
    { value: 'ai_output', label: 'AI outputs' },
  ],
  LOCAL_ARTIFACTS: mockData.artifacts,
  fetchArtifacts: vi.fn(),
  fetchArtifactGraph: vi.fn(),
  fetchArtifactVersions: vi.fn(),
}));

import {
  fetchArtifactGraph,
  fetchArtifactVersions,
  fetchArtifacts,
} from '../services/artifactsApi';

function arrangeApi() {
  fetchArtifacts.mockResolvedValue({
    ok: true,
    artifacts: mockData.artifacts,
    count: mockData.artifacts.length,
    filters: { types: [], tags: [] },
    message: '',
  });
  fetchArtifactGraph.mockResolvedValue({
    ok: true,
    nodes: mockData.artifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
      version: artifact.version,
    })),
    edges: [
      {
        source: 'sepsis-escalation-workflow',
        target: 'antimicrobial-timeout-protocol',
        type: 'uses',
        label: 'Requires protocol review',
      },
    ],
    message: '',
  });
  fetchArtifactVersions.mockResolvedValue({
    ok: true,
    artifactId: 'sepsis-escalation-workflow',
    versions: [
      {
        id: 'v2',
        version: '2.0.0',
        changeSummary: 'Updated bundle checkpoint',
        createdAt: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'v1',
        version: '1.0.0',
        changeSummary: 'Initial workflow release',
        createdAt: '2026-01-20T10:30:00.000Z',
      },
    ],
    message: '',
  });
}

async function renderArtifacts() {
  render(<Artifacts />);
  await screen.findByText('Updated bundle checkpoint');
}

describe('Artifacts page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:artifact-csv');
    globalThis.URL.revokeObjectURL = vi.fn();
    arrangeApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the artifact catalog with relationship graph and version history', async () => {
    await renderArtifacts();

    expect(screen.getByRole('heading', { name: /CareDroid Artifacts/i })).toBeVisible();
    expect((await screen.findAllByText('Sepsis Escalation Workflow')).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Artifact relationship graph/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Updated bundle checkpoint')).toBeInTheDocument();
  });

  it('searches artifacts by title and description', async () => {
    await renderArtifacts();

    const input = screen.getByLabelText(/Search artifacts/i);
    fireEvent.change(input, { target: { value: 'handoff' } });

    const results = screen.getByLabelText('Artifact results');
    expect(within(results).getByText('Triage Handoff Prompt')).toBeVisible();
    expect(within(results).queryByText('Antimicrobial Timeout Protocol')).not.toBeInTheDocument();
  });

  it('filters artifacts by type chip and tag select', async () => {
    await renderArtifacts();

    fireEvent.click(screen.getByRole('button', { name: 'Prompts' }));
    let results = screen.getByLabelText('Artifact results');
    expect(within(results).getByText('Triage Handoff Prompt')).toBeVisible();
    expect(within(results).queryByText('Sepsis Escalation Workflow')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'medication' } });

    results = screen.getByLabelText('Artifact results');
    expect(within(results).getByText('Antimicrobial Timeout Protocol')).toBeVisible();
    expect(within(results).queryByText('Triage Handoff Prompt')).not.toBeInTheDocument();
  });

  it('selects related artifacts from the detail relationship list', async () => {
    await renderArtifacts();

    const detail = screen.getByLabelText(/Selected artifact detail/i);
    fireEvent.click(within(detail).getByRole('button', { name: /Antimicrobial Timeout Protocol/i }));

    await waitFor(() =>
      expect(fetchArtifactVersions).toHaveBeenLastCalledWith('antimicrobial-timeout-protocol')
    );
    expect(within(detail).getByRole('heading', { name: /Antimicrobial Timeout Protocol/i })).toBeVisible();
  });

  it('downloads the filtered artifact CSV', async () => {
    await renderArtifacts();

    fireEvent.change(screen.getByLabelText(/Search artifacts/i), { target: { value: 'handoff' } });
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:artifact-csv');
  });
});
