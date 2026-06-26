import { getCanonicalWorkspaceRegistry } from './workspaceArchitecture';

export const WORKSPACE_DEPENDENCY_TYPES = Object.freeze({
  HANDOFF: 'handoff',
  SIGNAL: 'signal',
  WORKFLOW: 'workflow',
  OPERATIONAL_DEPENDENCY: 'operational-dependency',
});

export const WORKSPACE_DEPENDENCY_EDGES = Object.freeze([
  {
    id: 'emergency-to-icu',
    source: 'emergency',
    target: 'icu',
    type: WORKSPACE_DEPENDENCY_TYPES.HANDOFF,
    strength: 94,
    evidence: [
      'Deteriorating ED patients escalate to ICU workflows',
      'SOFA, NEWS2, sepsis, and ventilator context continue across the handoff',
    ],
    outcome: 'Faster critical-care escalation and continuity from triage to ICU.',
  },
  {
    id: 'laboratory-to-cardiology',
    source: 'laboratory',
    target: 'cardiology',
    type: WORKSPACE_DEPENDENCY_TYPES.SIGNAL,
    strength: 88,
    evidence: [
      'Troponin, BNP, electrolyte, and abnormal lab signals affect cardiology decisions',
      'Lab interpretation feeds chest pain and ACS workflows',
    ],
    outcome: 'Lab turnaround and interpretation quality directly improve cardiac decision support.',
  },
  {
    id: 'medical-iot-to-fleet',
    source: 'medical-iot',
    target: 'fleet',
    type: WORKSPACE_DEPENDENCY_TYPES.SIGNAL,
    strength: 82,
    evidence: [
      'Device telemetry and battery state can affect transport readiness',
      'Stale or offline device alerts inform fleet dispatch preparation',
    ],
    outcome: 'Fleet teams see device readiness signals before transport and logistics decisions.',
  },
  {
    id: 'fleet-to-operations',
    source: 'fleet',
    target: 'operations',
    type: WORKSPACE_DEPENDENCY_TYPES.OPERATIONAL_DEPENDENCY,
    strength: 90,
    evidence: [
      'Fleet ETA, route risk, and vehicle status affect hospital throughput',
      'Operations needs transport visibility for capacity, staffing, and incident response',
    ],
    outcome: 'Operations can coordinate capacity and staffing with live fleet constraints.',
  },
]);

function workspaceNode(workspace) {
  return {
    id: workspace.id,
    label: workspace.label,
    type: workspace.id.includes('iot') || workspace.id === 'fleet' ? 'operational' : 'clinical',
    description: workspace.description,
    outcomeFocus: workspace.defaultDashboardWidgets?.[0] || workspace.defaultNavigationGroups?.[0] || 'workspace',
    primarySignals: [
      ...(workspace.defaultDashboardWidgets || []),
      ...(workspace.defaultAssetPacks || []),
    ].slice(0, 4),
  };
}

function edgeWithLabels(edge, nodeById) {
  return {
    ...edge,
    sourceLabel: nodeById.get(edge.source)?.label || edge.source,
    targetLabel: nodeById.get(edge.target)?.label || edge.target,
    highStrength: edge.strength >= 85,
  };
}

export function buildWorkspaceDependencyGraph({
  workspaces = getCanonicalWorkspaceRegistry(),
  edges = WORKSPACE_DEPENDENCY_EDGES,
}: any = {}) {
  const referencedIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const nodes = workspaces
    .filter((workspace) => referencedIds.has(workspace.id))
    .map(workspaceNode)
    .sort((a, b) => a.label.localeCompare(b.label));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const dependencyEdges = edges.map((edge) => edgeWithLabels(edge, nodeById));

  return {
    generatedAt: new Date().toISOString(),
    nodes,
    edges: dependencyEdges,
    chains: [
      {
        id: 'emergency-icu',
        label: 'Emergency -> ICU',
        workspaceIds: ['emergency', 'icu'],
        edgeIds: ['emergency-to-icu'],
      },
      {
        id: 'laboratory-cardiology',
        label: 'Laboratory -> Cardiology',
        workspaceIds: ['laboratory', 'cardiology'],
        edgeIds: ['laboratory-to-cardiology'],
      },
      {
        id: 'iot-fleet-operations',
        label: 'Medical IoT -> Fleet -> Operations',
        workspaceIds: ['medical-iot', 'fleet', 'operations'],
        edgeIds: ['medical-iot-to-fleet', 'fleet-to-operations'],
      },
    ],
    summary: {
      workspaceCount: nodes.length,
      dependencyCount: dependencyEdges.length,
      highStrengthDependencyCount: dependencyEdges.filter((edge) => edge.highStrength).length,
      chainCount: 3,
    },
  };
}

export function getWorkspaceDependencyChain(graph, chainId) {
  return graph.chains.find((chain) => chain.id === chainId) || null;
}
