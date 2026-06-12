import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClinicalKnowledgeGraph from './ClinicalKnowledgeGraph';
import { sendClinicalChatMessage } from '../services/clinicalChatService';

vi.mock('../data/artifactKnowledgeGraph', () => {
  const nodeTypes = [
    'asset',
    'pack',
    'product',
    'workspace',
    'organization',
    'role',
    'route',
    'simulation',
    'workflow',
    'ai-agent',
    'integration',
  ];
  const relationshipTypes = [
    'USES',
    'DEPENDS_ON',
    'BELONGS_TO',
    'RECOMMENDED_FOR',
    'SIMILAR_TO',
    'LAUNCHED_FROM',
    'PART_OF',
  ];
  const nodes = [
    {
      id: 'asset:triage',
      type: 'asset',
      label: 'Triage Asset',
      summary: 'A connected triage asset.',
      path: '/tools',
      sourceId: 'triage',
      tags: ['clinical'],
    },
    {
      id: 'pack:core-platform',
      type: 'pack',
      label: 'Core Platform',
      summary: 'Core asset pack.',
      path: '/asset-packs',
      sourceId: 'core-platform',
      tags: ['pack'],
    },
    {
      id: 'product:core',
      type: 'product',
      label: 'Core Product',
      summary: 'Core product.',
      path: '/products',
      sourceId: 'core',
      tags: ['product'],
    },
    {
      id: 'workspace:clinical',
      type: 'workspace',
      label: 'Clinical',
      summary: 'Clinical workspace.',
      sourceId: 'clinical',
      tags: ['workspace'],
    },
    {
      id: 'organization:hospital',
      type: 'organization',
      label: 'Hospital',
      summary: 'Hospital organization.',
      sourceId: 'hospital',
      tags: ['organization'],
    },
    {
      id: 'role:clinician',
      type: 'role',
      label: 'Clinician',
      summary: 'Clinician role.',
      sourceId: 'clinician',
      tags: ['role'],
    },
    {
      id: 'route:/knowledge-graph',
      type: 'route',
      label: 'Knowledge Graph',
      summary: 'Graph route.',
      path: '/knowledge-graph',
      sourceId: '/knowledge-graph',
      tags: ['route'],
    },
    {
      id: 'simulation:sepsis',
      type: 'simulation',
      label: 'Sepsis Simulation',
      summary: 'Simulation node.',
      path: '/simulation',
      sourceId: 'sepsis',
      tags: ['simulation'],
    },
    {
      id: 'workflow:chest-pain',
      type: 'workflow',
      label: 'Chest Pain Workflow',
      summary: 'Workflow node.',
      path: '/workflows',
      sourceId: 'chest-pain',
      tags: ['workflow'],
    },
    {
      id: 'ai-agent:clinical-copilot',
      type: 'ai-agent',
      label: 'Clinical Copilot Agent',
      summary: 'AI agent node.',
      path: '/assistant',
      sourceId: 'clinical-copilot',
      tags: ['ai'],
    },
    {
      id: 'integration:fhir',
      type: 'integration',
      label: 'FHIR Integration Connector',
      summary: 'Connects CareDroid to FHIR-capable EHR and clinical data sources.',
      path: '/integrations-marketplace',
      sourceId: 'fhir',
      tags: ['fhir'],
    },
    {
      id: 'integration:sso',
      type: 'integration',
      label: 'SSO Identity Connector',
      summary: 'Adds SSO identity integration.',
      path: '/integrations-marketplace',
      sourceId: 'sso',
      tags: ['sso'],
    },
  ];
  const edges = [
    {
      id: 'asset:triage|BELONGS_TO|pack:core-platform',
      source: 'asset:triage',
      target: 'pack:core-platform',
      type: 'BELONGS_TO',
      rationale: 'Triage Asset belongs to Core Platform.',
    },
    {
      id: 'pack:core-platform|PART_OF|product:core',
      source: 'pack:core-platform',
      target: 'product:core',
      type: 'PART_OF',
      rationale: 'Core Platform composes Core Product.',
    },
    {
      id: 'integration:fhir|LAUNCHED_FROM|route:/knowledge-graph',
      source: 'integration:fhir',
      target: 'route:/knowledge-graph',
      type: 'LAUNCHED_FROM',
      rationale: 'FHIR Integration Connector launches from a route.',
    },
    {
      id: 'ai-agent:clinical-copilot|USES|integration:fhir',
      source: 'ai-agent:clinical-copilot',
      target: 'integration:fhir',
      type: 'USES',
      rationale: 'Clinical Copilot Agent uses FHIR Integration Connector.',
    },
  ];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  function buildSnapshot({ query = '', type = 'all', relationship = 'all', selectedNodeId } = {}) {
    const normalizedQuery = query.toLowerCase();
    const visibleNodes = nodes.filter((node) => {
      const matchesType = type === 'all' || node.type === type;
      const matchesQuery =
        !normalizedQuery ||
        [node.label, node.summary, node.type, ...(node.tags || [])].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
    const visibleIds = new Set(visibleNodes.map((node) => node.id));
    const visibleEdges = edges.filter(
      (edge) =>
        visibleIds.has(edge.source) &&
        visibleIds.has(edge.target) &&
        (relationship === 'all' || edge.type === relationship)
    );
    const selectedNode = nodeById.get(selectedNodeId) || visibleNodes[0] || nodes[0];
    const neighbors = edges
      .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .map((edge) => ({
        edge,
        node: nodeById.get(edge.source === selectedNode.id ? edge.target : edge.source),
      }))
      .filter((entry) => entry.node);

    return {
      nodes: visibleNodes,
      edges: visibleEdges,
      visibleNodeCount: visibleNodes.length,
      matchingNodeCount: visibleNodes.length,
      selectedNode,
      neighbors,
      relationshipRows: edges.map((edge) => ({
        ...edge,
        sourceLabel: nodeById.get(edge.source).label,
        sourceType: nodeById.get(edge.source).type,
        targetLabel: nodeById.get(edge.target).label,
        targetType: nodeById.get(edge.target).type,
      })),
      orphanNodes: [],
      duplicateGroups: [],
      recommendations: neighbors.map(({ edge, node }) => ({
        node,
        relationship: edge.type,
        reason: edge.rationale,
      })),
      counts: Object.fromEntries(nodeTypes.map((nodeType) => [nodeType, nodes.filter((node) => node.type === nodeType).length])),
      relationshipCounts: Object.fromEntries(
        relationshipTypes.map((relationshipType) => [
          relationshipType,
          edges.filter((edge) => edge.type === relationshipType).length,
        ])
      ),
      summary: {
        nodes: nodes.length,
        edges: edges.length,
      },
      coverage: {
        connectedAssetIds: ['asset:triage'],
        totalAssets: 1,
        orphanAssetIds: [],
        allAssetsConnected: true,
      },
    };
  }

  return {
    ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES: nodeTypes,
    ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS: relationshipTypes,
    buildKnowledgeGraphAiPrompt: (node) => `Open the Clinical Knowledge Graph and explain ${node.label}.`,
    createArtifactKnowledgeGraphService: () => ({ buildSnapshot }),
  };
});

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(),
}));

function renderKnowledgeGraph() {
  return render(
    <MemoryRouter initialEntries={['/knowledge-graph']}>
      <ClinicalKnowledgeGraph />
    </MemoryRouter>
  );
}

describe('ClinicalKnowledgeGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendClinicalChatMessage.mockResolvedValue({
      ok: true,
      data: { response: 'AI graph explanation connecting assets, packs, products, roles, routes, and integrations.' },
    });
  });

  it('renders graph explorer, node categories, and relationship visualization', () => {
    renderKnowledgeGraph();

    expect(screen.getByRole('heading', { name: /artifact knowledge graph/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /graph explorer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /normalized relationships/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /orphans and duplicates/i })).toBeInTheDocument();
    expect(screen.getByText(/connected assets/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^asset$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pack$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ai-agent$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/visible graph relationships/i)).toBeInTheDocument();
  });

  it('searches nodes, filters by type, and explores selected neighbors', () => {
    renderKnowledgeGraph();

    fireEvent.change(screen.getByLabelText(/search knowledge graph/i), {
      target: { value: 'fhir' },
    });

    expect(screen.getByRole('button', { name: /fhir integration connector/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sso identity connector/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search knowledge graph/i), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^integration$/i }));
    expect(screen.getByRole('button', { name: /fhir integration connector/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sso identity connector/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fhir integration connector/i }));
    expect(screen.getByRole('heading', { name: /fhir integration connector/i })).toBeInTheDocument();
    expect(screen.getByText(/fhir-capable ehr/i)).toBeInTheDocument();
  });

  it('integrates with AI assistant explanation for selected graph node', async () => {
    renderKnowledgeGraph();

    fireEvent.click(screen.getByRole('button', { name: /^ai-agent$/i }));
    fireEvent.click(screen.getByRole('button', { name: /clinical copilot agent/i }));
    fireEvent.click(screen.getByRole('button', { name: /explain selected with ai/i }));

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'artifact-knowledge-graph',
          message: expect.stringMatching(/Clinical Knowledge Graph/i),
        })
      );
    });
    expect(await screen.findByText(/ai graph explanation/i)).toBeInTheDocument();
  });
});
