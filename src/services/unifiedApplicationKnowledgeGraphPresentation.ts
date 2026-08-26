import {
  KNOWLEDGE_GRAPH_ENTITY_TYPES,
  parseKnowledgeGraphNodeId,
  type KnowledgeGraphEntityType,
  type KnowledgeGraphNode,
  type UnifiedApplicationKnowledgeGraphSnapshot,
} from '../config/unifiedApplicationKnowledgeGraphModel';
import type { PatientTimelineContext, PatientTimelineItem } from '../utils/patientTimeline';

export type KnowledgeGraphNeighbor = Readonly<{
  node: KnowledgeGraphNode;
  edgeType: string;
  direction: 'incoming' | 'outgoing';
}>;

export type PatientKnowledgeGraphContext = Readonly<{
  patientId: string;
  nodeIds: readonly string[];
  neighbors: readonly KnowledgeGraphNeighbor[];
  alerts: readonly KnowledgeGraphNode[];
  recommendations: readonly KnowledgeGraphNode[];
  workflows: readonly KnowledgeGraphNode[];
  departments: readonly KnowledgeGraphNode[];
  staff: readonly KnowledgeGraphNode[];
}>;

export type DashboardKnowledgeGraphSummary = Readonly<{
  topConnectedPatients: readonly Readonly<{ patientId: string; connectionCount: number; label: string }>[];
  criticalNodes: readonly KnowledgeGraphNode[];
  recentOperationalEvents: readonly KnowledgeGraphNode[];
  departmentLoad: readonly Readonly<{ departmentId: string; label: string; patientCount: number }>[];
  entityCounts: Readonly<Partial<Record<KnowledgeGraphEntityType, number>>>;
}>;

export type AnalyticsKnowledgeGraphSummary = Readonly<{
  nodeCount: number;
  edgeCount: number;
  entityCounts: Readonly<Partial<Record<KnowledgeGraphEntityType, number>>>;
  topDepartments: readonly Readonly<{ departmentId: string; label: string; patientCount: number }>[];
  connectedCriticalSignals: number;
}>;

export type CopilotKnowledgeGraphContext = Readonly<{
  nodeCount: number;
  edgeCount: number;
  selectedPatientConnections?: Readonly<{
    alertCount: number;
    recommendationCount: number;
    workflowCount: number;
    departmentIds: readonly string[];
    staffIds: readonly string[];
  }>;
  criticalNodeLabels: readonly string[];
  recentEventLabels: readonly string[];
}>;

function nodeMap(graph: UnifiedApplicationKnowledgeGraphSnapshot): Map<string, KnowledgeGraphNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

export function listKnowledgeGraphNodesByType(
  graph: UnifiedApplicationKnowledgeGraphSnapshot,
  entityType: KnowledgeGraphEntityType,
): readonly KnowledgeGraphNode[] {
  return graph.nodes.filter((node) => node.entityType === entityType);
}

export function findKnowledgeGraphNeighbors(
  graph: UnifiedApplicationKnowledgeGraphSnapshot,
  nodeId: string,
): readonly KnowledgeGraphNeighbor[] {
  const nodes = nodeMap(graph);
  const neighbors: KnowledgeGraphNeighbor[] = [];

  for (const edge of graph.edges) {
    if (edge.fromId === nodeId) {
      const node = nodes.get(edge.toId);
      if (node) {
        neighbors.push(Object.freeze({ node, edgeType: edge.type, direction: 'outgoing' }));
      }
    } else if (edge.toId === nodeId) {
      const node = nodes.get(edge.fromId);
      if (node) {
        neighbors.push(Object.freeze({ node, edgeType: edge.type, direction: 'incoming' }));
      }
    }
  }

  return Object.freeze(neighbors);
}

export function resolvePatientKnowledgeGraphSubgraph(
  graph: UnifiedApplicationKnowledgeGraphSnapshot,
  patientId: string,
): PatientKnowledgeGraphContext {
  const nodeIds = graph.patientIndex[patientId] || [];
  const neighborMap = new Map<string, KnowledgeGraphNeighbor>();

  for (const connectedNodeId of nodeIds) {
    for (const neighbor of findKnowledgeGraphNeighbors(graph, connectedNodeId)) {
      neighborMap.set(neighbor.node.id, neighbor);
    }
  }

  const neighbors = Object.freeze([...neighborMap.values()]);
  const pick = (entityType: KnowledgeGraphEntityType) =>
    Object.freeze(neighbors.filter((entry) => entry.node.entityType === entityType).map((entry) => entry.node));

  return Object.freeze({
    patientId,
    nodeIds,
    neighbors,
    alerts: pick('alert'),
    recommendations: pick('ai_recommendation'),
    workflows: pick('workflow'),
    departments: pick('department'),
    staff: pick('staff'),
  });
}

export function resolveAlertKnowledgeGraphContext(
  graph: UnifiedApplicationKnowledgeGraphSnapshot,
  alertId: string,
): Readonly<{
  alert: KnowledgeGraphNode | null;
  affectedPatients: readonly KnowledgeGraphNode[];
  escalatedDepartments: readonly KnowledgeGraphNode[];
}> {
  const alertNodeId = `kg:alert:${alertId}`;
  const nodes = nodeMap(graph);
  const alert = nodes.get(alertNodeId) ?? null;
  if (!alert) {
    return Object.freeze({
      alert: null,
      affectedPatients: Object.freeze([]),
      escalatedDepartments: Object.freeze([]),
    });
  }

  const neighbors = findKnowledgeGraphNeighbors(graph, alertNodeId);
  return Object.freeze({
    alert,
    affectedPatients: Object.freeze(
      neighbors.filter((entry) => entry.node.entityType === 'patient').map((entry) => entry.node),
    ),
    escalatedDepartments: Object.freeze(
      neighbors.filter((entry) => entry.node.entityType === 'department').map((entry) => entry.node),
    ),
  });
}

export function buildDashboardKnowledgeGraphSummary(
  graph: UnifiedApplicationKnowledgeGraphSnapshot,
): DashboardKnowledgeGraphSummary {
  const nodes = nodeMap(graph);
  const topConnectedPatients = Object.freeze(
    Object.entries(graph.patientIndex)
      .map(([patientId, nodeIds]) => {
        const patientNode = nodes.get(`kg:patient:${patientId}`);
        return Object.freeze({
          patientId,
          connectionCount: nodeIds.length,
          label: patientNode?.label || patientId,
        });
      })
      .sort((left, right) => right.connectionCount - left.connectionCount)
      .slice(0, 8),
  );

  const criticalNodes = Object.freeze(
    graph.nodes.filter((node) => node.severity === 'critical').slice(0, 12),
  );

  const recentOperationalEvents = Object.freeze(
    listKnowledgeGraphNodesByType(graph, 'operational_event').slice(0, 10),
  );

  const departmentLoad = Object.freeze(
    listKnowledgeGraphNodesByType(graph, 'department').map((department) => {
      const patientCount = graph.edges.filter(
        (edge) => edge.toId === department.id && edge.type === 'part_of',
      ).length;
      return Object.freeze({
        departmentId: department.sourceId,
        label: department.label,
        patientCount,
      });
    }),
  );

  const entityCounts = Object.freeze(
    KNOWLEDGE_GRAPH_ENTITY_TYPES.reduce(
      (counts, entityType) => {
        counts[entityType] = listKnowledgeGraphNodesByType(graph, entityType).length;
        return counts;
      },
      {} as Partial<Record<KnowledgeGraphEntityType, number>>,
    ),
  ) as Readonly<Partial<Record<KnowledgeGraphEntityType, number>>>;

  return Object.freeze({
    topConnectedPatients,
    criticalNodes,
    recentOperationalEvents,
    departmentLoad,
    entityCounts,
  });
}

export function buildAnalyticsKnowledgeGraphSummary(
  graph: UnifiedApplicationKnowledgeGraphSnapshot,
): AnalyticsKnowledgeGraphSummary {
  const dashboard = buildDashboardKnowledgeGraphSummary(graph);
  return Object.freeze({
    nodeCount: graph.metrics.nodeCount,
    edgeCount: graph.metrics.edgeCount,
    entityCounts: dashboard.entityCounts,
    topDepartments: dashboard.departmentLoad
      .filter((entry) => entry.patientCount > 0)
      .sort((left, right) => right.patientCount - left.patientCount)
      .slice(0, 6),
    connectedCriticalSignals: dashboard.criticalNodes.length,
  });
}

export function buildCopilotKnowledgeGraphContext(
  graph: UnifiedApplicationKnowledgeGraphSnapshot,
  selectedPatientId?: string | null,
): CopilotKnowledgeGraphContext {
  const selectedPatientConnections = selectedPatientId
    ? (() => {
        const subgraph = resolvePatientKnowledgeGraphSubgraph(graph, selectedPatientId);
        return Object.freeze({
          alertCount: subgraph.alerts.length,
          recommendationCount: subgraph.recommendations.length,
          workflowCount: subgraph.workflows.length,
          departmentIds: subgraph.departments.map((node) => node.sourceId),
          staffIds: subgraph.staff.map((node) => node.sourceId),
        });
      })()
    : undefined;

  const dashboard = buildDashboardKnowledgeGraphSummary(graph);
  return Object.freeze({
    nodeCount: graph.metrics.nodeCount,
    edgeCount: graph.metrics.edgeCount,
    selectedPatientConnections,
    criticalNodeLabels: Object.freeze(dashboard.criticalNodes.slice(0, 6).map((node) => node.label)),
    recentEventLabels: Object.freeze(
      dashboard.recentOperationalEvents.slice(0, 4).map((node) => node.label),
    ),
  });
}

export function enrichPatientTimelineContextFromKnowledgeGraph(
  patientId: string,
  graph: UnifiedApplicationKnowledgeGraphSnapshot | null | undefined,
  baseContext: PatientTimelineContext = {},
): PatientTimelineContext {
  if (!graph) return baseContext;
  const subgraph = resolvePatientKnowledgeGraphSubgraph(graph, patientId);
  return Object.freeze({
    ...baseContext,
    alerts: baseContext.alerts,
    staff: baseContext.staff,
    workflowLogs: baseContext.workflowLogs,
    knowledgeGraph: Object.freeze({
      connectedNodeCount: subgraph.nodeIds.length,
      alertCount: subgraph.alerts.length,
      recommendationCount: subgraph.recommendations.length,
      workflowCount: subgraph.workflows.length,
      departmentIds: subgraph.departments.map((node) => node.sourceId),
      staffIds: subgraph.staff.map((node) => node.sourceId),
    }),
  });
}

export function buildKnowledgeGraphTimelineItems(
  patientId: string,
  graph: UnifiedApplicationKnowledgeGraphSnapshot | null | undefined,
): PatientTimelineItem[] {
  if (!graph) return [];
  const subgraph = resolvePatientKnowledgeGraphSubgraph(graph, patientId);
  const items: PatientTimelineItem[] = [];
  const timestamp = graph.generatedAt;

  for (const alert of subgraph.alerts) {
    items.push({
      id: `kg-timeline-alert-${alert.sourceId}`,
      category: 'ai-copilot',
      label: 'Connected alert',
      summary: alert.summary || alert.label,
      timestamp,
      source: 'derived',
      severity: alert.severity === 'critical' ? 'Critical' : alert.severity === 'warning' ? 'Warning' : 'Info',
      metadata: Object.freeze({
        graphNodeId: alert.id,
        entityType: alert.entityType,
      }),
    });
  }

  for (const recommendation of subgraph.recommendations) {
    items.push({
      id: `kg-timeline-rec-${recommendation.sourceId}`,
      category: 'ai-copilot',
      label: 'AI recommendation',
      summary: recommendation.summary || recommendation.label,
      timestamp,
      source: 'derived',
      metadata: Object.freeze({
        graphNodeId: recommendation.id,
        route: recommendation.route ?? null,
      }),
    });
  }

  for (const workflow of subgraph.workflows.slice(0, 4)) {
    items.push({
      id: `kg-timeline-workflow-${workflow.sourceId}`,
      category: 'state-transition',
      label: 'Connected workflow',
      summary: workflow.summary || workflow.label,
      timestamp,
      source: 'derived',
      metadata: Object.freeze({
        graphNodeId: workflow.id,
      }),
    });
  }

  return items;
}

export function resolveKnowledgeGraphNodeLabel(nodeId: string, graph: UnifiedApplicationKnowledgeGraphSnapshot): string {
  const parsed = parseKnowledgeGraphNodeId(nodeId);
  const node = graph.nodes.find((entry) => entry.id === nodeId);
  return node?.label || parsed?.sourceId || nodeId;
}