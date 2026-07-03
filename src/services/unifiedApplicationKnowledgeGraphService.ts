import {
  UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_SAFETY,
  knowledgeGraphNodeId,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
  type KnowledgeGraphRelationshipType,
  type UnifiedApplicationKnowledgeGraphSnapshot,
} from '../config/unifiedApplicationKnowledgeGraphModel';
import {
  listHospitalDepartments,
  resolvePatientJourneyPosition,
} from '../config/hospitalOperatingSystemModel';
import { resolveWorkflowStepForState } from '../config/unifiedPatientWorkflowModel';
import type {
  UnifiedOperationalIntelligenceDomain,
  UnifiedOperationalIntelligenceInsight,
} from '../config/unifiedOperationalIntelligenceModel';
import type { AiChiefOrchestrationSnapshot } from './aiChiefContinuousMonitoringService';
import { buildBottleneckRegistrySnapshot } from './bottleneckRegistry';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  PatientState,
  type Alert,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type QueueSummary,
  type Referral,
  type Room,
  type Staff,
  type WorkflowActionLog,
} from '../types/emergency';
import type { AdministrativeAutomationTask } from '../types/administrativeAutomation';
import type { ContinuousPatientFlowSnapshot } from '../engine/continuousPatientFlowEngine';

export type BuildUnifiedApplicationKnowledgeGraphInput = Readonly<{
  patients?: readonly Patient[];
  staff?: readonly Staff[];
  alerts?: readonly Alert[];
  rooms?: readonly Room[];
  queues?: readonly QueueSummary[];
  referrals?: readonly Referral[];
  workflowLogs?: readonly WorkflowActionLog[];
  administrativeTasks?: readonly AdministrativeAutomationTask[];
  emsArrivals?: readonly EMSArrival[];
  capacity?: CapacitySnapshot | null;
  patientFlowSnapshot?: ContinuousPatientFlowSnapshot | null;
  aiChiefSnapshot?: AiChiefOrchestrationSnapshot | null;
  operationalInsights?: readonly UnifiedOperationalIntelligenceInsight[];
  now?: Date;
}>;

type MutableGraph = {
  nodes: Map<string, KnowledgeGraphNode>;
  edges: KnowledgeGraphEdge[];
  patientIndex: Map<string, Set<string>>;
};

function addNode(graph: MutableGraph, node: KnowledgeGraphNode): void {
  graph.nodes.set(node.id, node);
}

function addEdge(
  graph: MutableGraph,
  type: KnowledgeGraphRelationshipType,
  fromId: string,
  toId: string,
  sourceModule: string,
  label?: string,
  weight?: number,
): void {
  if (!graph.nodes.has(fromId) || !graph.nodes.has(toId)) return;
  graph.edges.push(
    Object.freeze({
      id: `kge:${type}:${fromId}->${toId}`,
      type,
      fromId,
      toId,
      label,
      weight,
      sourceModule,
    }),
  );
}

function indexPatient(graph: MutableGraph, patientId: string, nodeId: string): void {
  const existing = graph.patientIndex.get(patientId) || new Set<string>();
  existing.add(nodeId);
  graph.patientIndex.set(patientId, existing);
}

function patientLabel(patient: Patient): string {
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  return name || patient.mrn || patient.id;
}

function alertSeverity(alert: Alert): KnowledgeGraphNode['severity'] {
  if (alert.severity === 'Critical') return 'critical';
  if (alert.severity === 'Warning') return 'warning';
  return 'info';
}

function buildDepartmentNodes(graph: MutableGraph): void {
  for (const department of listHospitalDepartments()) {
    const nodeId = knowledgeGraphNodeId('department', department.id);
    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'department',
      sourceId: department.id,
      label: department.label,
      summary: `Participates in ${department.phaseIds.length} journey phases.`,
      route: CANONICAL_ROUTES.emergencyCommandCenter,
      severity: 'neutral',
      sourceModule: 'hospitalOperatingSystemModel',
      metadata: Object.freeze({
        phaseCount: department.phaseIds.length,
        stageCount: department.stageIds.length,
      }),
    }));
  }
}

function buildStaffNodes(graph: MutableGraph, staff: readonly Staff[]): void {
  for (const member of staff) {
    const nodeId = knowledgeGraphNodeId('staff', member.id);
    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'staff',
      sourceId: member.id,
      label: member.name || member.id,
      summary: `${member.role || 'Staff'} — ${member.status || 'active'}.`,
      route: CANONICAL_ROUTES.emergencyWhiteboard,
      severity: member.status === 'Busy' ? 'warning' : 'neutral',
      sourceModule: 'emergencyStore.staff',
      metadata: Object.freeze({
        role: member.role || null,
        status: member.status || null,
      }),
    }));
  }
}

function buildQueueNodes(graph: MutableGraph, queues: readonly QueueSummary[]): void {
  for (const queue of queues) {
    const nodeId = knowledgeGraphNodeId('queue', queue.id);
    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'queue',
      sourceId: queue.id,
      label: queue.label || queue.name || queue.id,
      summary: `${queue.count ?? queue.patientCount ?? 0} patients waiting.`,
      route: `${CANONICAL_ROUTES.emergencyQueues}?queue=${encodeURIComponent(queue.label || queue.id)}`,
      severity: queue.breached ? 'critical' : (queue.oldestWaitMinutes ?? 0) > 30 ? 'warning' : 'neutral',
      sourceModule: 'emergencyStore.queues',
      metadata: Object.freeze({
        count: queue.count ?? queue.patientCount ?? 0,
        breached: queue.breached ?? false,
      }),
    }));
  }
}

function buildRoomAndBedNodes(graph: MutableGraph, rooms: readonly Room[]): void {
  for (const room of rooms) {
    const roomNodeId = knowledgeGraphNodeId('room', room.id);
    const occupantId = room.patientId || room.currentPatientId || null;
    addNode(graph, Object.freeze({
      id: roomNodeId,
      entityType: 'room',
      sourceId: room.id,
      label: room.name || room.id,
      summary: `${room.type} — ${room.status}.`,
      route: CANONICAL_ROUTES.emergencyCapacity,
      severity: room.status === 'Blocked' ? 'warning' : 'neutral',
      sourceModule: 'emergencyStore.rooms',
      metadata: Object.freeze({
        type: room.type,
        status: room.status,
        occupied: room.status === 'Occupied',
      }),
    }));

    if (occupantId) {
      const bedNodeId = knowledgeGraphNodeId('bed', room.id);
      addNode(graph, Object.freeze({
        id: bedNodeId,
        entityType: 'bed',
        sourceId: room.id,
        label: `${room.name} bed`,
        summary: `Occupied bed in ${room.name}.`,
        route: CANONICAL_ROUTES.emergencyCapacity,
        severity: 'warning',
        sourceModule: 'emergencyStore.rooms',
        metadata: Object.freeze({
          roomId: room.id,
          patientId: occupantId,
        }),
      }));
      addEdge(graph, 'part_of', bedNodeId, roomNodeId, 'emergencyStore.rooms', 'bed in room');
    }
  }
}

function buildPatientNodes(
  graph: MutableGraph,
  patients: readonly Patient[],
  staff: readonly Staff[],
  referrals: readonly Referral[],
  queues: readonly QueueSummary[],
): void {
  const staffById = new Map(staff.map((member) => [member.id, member]));
  const queueByState = new Map(
    queues.map((queue) => [String(queue.type || queue.label || '').toLowerCase(), queue]),
  );

  for (const patient of patients) {
    if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) continue;

    const nodeId = knowledgeGraphNodeId('patient', patient.id);
    const journey = resolvePatientJourneyPosition(patient, referrals);
    const workflowStep = resolveWorkflowStepForState(patient.state);

    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'patient',
      sourceId: patient.id,
      label: patientLabel(patient),
      summary: `${patient.priority} — ${patient.state} (${patient.chiefComplaint || 'ED visit'}).`,
      route: `${CANONICAL_ROUTES.emergencyPatients}?patient=${encodeURIComponent(patient.id)}`,
      severity:
        patient.priority === 'P1' ? 'critical' : patient.priority === 'P2' ? 'warning' : 'info',
      sourceModule: 'emergencyStore.patients',
      metadata: Object.freeze({
        mrn: patient.mrn,
        state: patient.state,
        priority: patient.priority,
        workflowStep: workflowStep?.id ?? null,
      }),
    }));
    indexPatient(graph, patient.id, nodeId);

    for (const staffId of [patient.assignedStaffId, patient.assignedPhysicianId]) {
      if (!staffId) continue;
      const staffNodeId = knowledgeGraphNodeId('staff', staffId);
      if (graph.nodes.has(staffNodeId)) {
        addEdge(graph, 'assigned_to', staffNodeId, nodeId, 'emergencyStore.patients', 'assigned clinician');
        indexPatient(graph, patient.id, staffNodeId);
      }
    }

    if (patient.roomId) {
      const roomNodeId = knowledgeGraphNodeId('room', patient.roomId);
      if (graph.nodes.has(roomNodeId)) {
        addEdge(graph, 'located_in', nodeId, roomNodeId, 'emergencyStore.patients', 'in room');
      }
      const bedNodeId = knowledgeGraphNodeId('bed', patient.roomId);
      if (graph.nodes.has(bedNodeId)) {
        addEdge(graph, 'located_in', nodeId, bedNodeId, 'emergencyStore.patients', 'in bed');
      }
    }

    const queueMatch =
      queueByState.get(String(patient.state).toLowerCase()) ||
      queues.find((queue) => String(queue.label).toLowerCase() === String(patient.state).toLowerCase());
    if (queueMatch) {
      const queueNodeId = knowledgeGraphNodeId('queue', queueMatch.id);
      if (graph.nodes.has(queueNodeId)) {
        addEdge(graph, 'waiting_in', nodeId, queueNodeId, 'emergencyStore.queues', 'waiting in queue');
        indexPatient(graph, patient.id, queueNodeId);
      }
    }

    for (const departmentId of journey.departmentIds) {
      const departmentNodeId = knowledgeGraphNodeId('department', departmentId);
      if (graph.nodes.has(departmentNodeId)) {
        addEdge(graph, 'part_of', nodeId, departmentNodeId, 'hospitalOperatingSystemModel', 'journey department');
        indexPatient(graph, patient.id, departmentNodeId);
      }
    }

    if (workflowStep) {
      const workflowNodeId = knowledgeGraphNodeId('workflow', `step-${workflowStep.id}`);
      if (!graph.nodes.has(workflowNodeId)) {
        addNode(graph, Object.freeze({
          id: workflowNodeId,
          entityType: 'workflow',
          sourceId: workflowStep.id,
          label: workflowStep.label,
          summary: workflowStep.primaryAction,
          route: workflowStep.route,
          severity: 'info',
          sourceModule: 'unifiedPatientWorkflowModel',
        }));
      }
      addEdge(graph, 'part_of', nodeId, workflowNodeId, 'unifiedPatientWorkflowModel', 'workflow step');
      indexPatient(graph, patient.id, workflowNodeId);
    }

    if (patient.state === PatientState.Orders || patient.state === PatientState.Results) {
      const diagnosticNodeId = knowledgeGraphNodeId('diagnostic', patient.id);
      addNode(graph, Object.freeze({
        id: diagnosticNodeId,
        entityType: 'diagnostic',
        sourceId: patient.id,
        label: `Diagnostics — ${patientLabel(patient)}`,
        summary:
          patient.state === PatientState.Results
            ? 'Results review in progress.'
            : 'Orders and diagnostics in progress.',
        route: CANONICAL_ROUTES.emergencyPatients,
        severity: patient.state === PatientState.Results ? 'warning' : 'info',
        sourceModule: 'emergencyStore.patients',
        metadata: Object.freeze({
          state: patient.state,
        }),
      }));
      addEdge(graph, 'part_of', diagnosticNodeId, nodeId, 'emergencyStore.patients', 'patient diagnostics');
      indexPatient(graph, patient.id, diagnosticNodeId);
    }
  }
}

function buildAlertNodes(graph: MutableGraph, alerts: readonly Alert[]): void {
  for (const alert of alerts) {
    if (alert.dismissed) continue;
    const nodeId = knowledgeGraphNodeId('alert', alert.id);
    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'alert',
      sourceId: alert.id,
      label: alert.title || 'Alert',
      summary: alert.message || 'Operational alert requires review.',
      route: CANONICAL_ROUTES.emergencyAlerts,
      severity: alertSeverity(alert),
      sourceModule: 'emergencyStore.alerts',
      metadata: Object.freeze({
        acknowledged: alert.acknowledged ?? false,
        category: alert.category || null,
      }),
    }));

    if (alert.patientId) {
      const patientNodeId = knowledgeGraphNodeId('patient', alert.patientId);
      if (graph.nodes.has(patientNodeId)) {
        addEdge(graph, 'affects', nodeId, patientNodeId, 'emergencyStore.alerts', 'alert affects patient');
        indexPatient(graph, alert.patientId, nodeId);
      }
    }

    if (alert.ownerRole) {
      const departmentGuess = alert.ownerRole.includes('nurse')
        ? 'nursing'
        : alert.ownerRole.includes('physician')
          ? 'physician'
          : alert.ownerRole.includes('triage')
            ? 'triage'
            : 'patient-flow';
      const departmentNodeId = knowledgeGraphNodeId('department', departmentGuess);
      if (graph.nodes.has(departmentNodeId)) {
        addEdge(graph, 'escalated_to', nodeId, departmentNodeId, 'emergencyStore.alerts', 'escalated to department');
      }
    }
  }
}

function buildWorkflowLogNodes(graph: MutableGraph, workflowLogs: readonly WorkflowActionLog[]): void {
  const recent = [...workflowLogs].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  ).slice(0, 40);

  for (const log of recent) {
    const eventNodeId = knowledgeGraphNodeId('operational_event', log.id);
    addNode(graph, Object.freeze({
      id: eventNodeId,
      entityType: 'operational_event',
      sourceId: log.id,
      label: log.title || log.type,
      summary: log.summary,
      route: log.patientId
        ? `${CANONICAL_ROUTES.emergencyPatients}?patient=${encodeURIComponent(log.patientId)}`
        : CANONICAL_ROUTES.emergencyCommandCenter,
      severity: log.severity === 'Critical' ? 'critical' : log.severity === 'Warning' ? 'warning' : 'info',
      sourceModule: 'emergencyStore.workflowLogs',
      metadata: Object.freeze({
        type: log.type,
        status: log.status,
      }),
    }));

    if (log.patientId) {
      const patientNodeId = knowledgeGraphNodeId('patient', log.patientId);
      if (graph.nodes.has(patientNodeId)) {
        addEdge(graph, 'connected_to', eventNodeId, patientNodeId, 'emergencyStore.workflowLogs', 'event for patient');
        indexPatient(graph, log.patientId, eventNodeId);
      }
    }

    const workflowNodeId = knowledgeGraphNodeId('workflow', `log-${log.type}`);
    if (!graph.nodes.has(workflowNodeId)) {
      addNode(graph, Object.freeze({
        id: workflowNodeId,
        entityType: 'workflow',
        sourceId: log.type,
        label: log.type.replace(/_/g, ' '),
        summary: 'Workflow action category.',
        route: CANONICAL_ROUTES.emergencyCommandCenter,
        severity: 'neutral',
        sourceModule: 'emergencyStore.workflowLogs',
      }));
    }
    addEdge(graph, 'triggered_by', workflowNodeId, eventNodeId, 'emergencyStore.workflowLogs', 'workflow triggered event');
  }
}

function buildAutomationTaskNodes(
  graph: MutableGraph,
  tasks: readonly AdministrativeAutomationTask[],
): void {
  for (const task of tasks.filter((entry) => entry.status === 'pending_review' || entry.status === 'active')) {
    const nodeId = knowledgeGraphNodeId('workflow', `automation-${task.id}`);
    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'workflow',
      sourceId: task.id,
      label: task.title,
      summary: task.summary,
      route: task.route || CANONICAL_ROUTES.emergencyCommandCenter,
      severity: task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'warning' : 'info',
      sourceModule: 'administrativeAutomationQueue',
      metadata: Object.freeze({
        category: task.category,
        status: task.status,
      }),
    }));

    if (task.patientId) {
      const patientNodeId = knowledgeGraphNodeId('patient', task.patientId);
      if (graph.nodes.has(patientNodeId)) {
        addEdge(graph, 'part_of', nodeId, patientNodeId, 'administrativeAutomationQueue', 'automation for patient');
        indexPatient(graph, task.patientId, nodeId);
      }
    }
  }
}

function mapOperationalDomainToDepartmentId(
  domain: UnifiedOperationalIntelligenceDomain,
): string | null {
  switch (domain) {
    case 'patient_flow':
      return 'nursing';
    case 'staffing':
      return 'nursing';
    case 'capacity':
      return 'physician';
    case 'alerts':
      return 'triage';
    case 'workflow':
      return 'registration';
    case 'service_health':
      return 'dispatch';
    case 'ai_recommendations':
      return 'triage';
    default:
      return null;
  }
}

function buildOperationalInsightNodes(
  graph: MutableGraph,
  operationalInsights: readonly UnifiedOperationalIntelligenceInsight[] | undefined,
): void {
  for (const insight of operationalInsights || []) {
    if (insight.type === 'intervention' || insight.type === 'recommendation') continue;

    const eventNodeId = knowledgeGraphNodeId('operational_event', insight.id);
    if (graph.nodes.has(eventNodeId)) continue;
    addNode(graph, Object.freeze({
      id: eventNodeId,
      entityType: 'operational_event',
      sourceId: insight.id,
      label: insight.title,
      summary: insight.summary,
      route: insight.route || CANONICAL_ROUTES.emergencyCommandCenter,
      severity: insight.severity,
      sourceModule: 'unifiedOperationalIntelligence',
      metadata: Object.freeze({
        domain: insight.domain,
        type: insight.type,
        sourceEventType: insight.sourceEventType ?? null,
      }),
    }));

    if (insight.patientId) {
      const patientNodeId = knowledgeGraphNodeId('patient', insight.patientId);
      if (graph.nodes.has(patientNodeId)) {
        addEdge(graph, 'affects', eventNodeId, patientNodeId, 'unifiedOperationalIntelligence', 'operational insight');
        indexPatient(graph, insight.patientId, eventNodeId);
      }
    }

    const departmentId = mapOperationalDomainToDepartmentId(insight.domain);
    if (departmentId) {
      const departmentNodeId = knowledgeGraphNodeId('department', departmentId);
      if (graph.nodes.has(departmentNodeId)) {
        addEdge(graph, 'connected_to', eventNodeId, departmentNodeId, 'unifiedOperationalIntelligence', 'domain signal');
      }
    }
  }
}

function buildAiRecommendationNodes(
  graph: MutableGraph,
  aiChiefSnapshot: AiChiefOrchestrationSnapshot | null | undefined,
  operationalInsights: readonly UnifiedOperationalIntelligenceInsight[] | undefined,
  patientFlowSnapshot: ContinuousPatientFlowSnapshot | null | undefined,
): void {
  const recommendations = [
    ...(aiChiefSnapshot?.recommendations || []).map((recommendation) =>
      Object.freeze({
        id: recommendation.id,
        action: recommendation.action,
        rationale: recommendation.rationale,
        route: recommendation.route,
        patientId: recommendation.patientId,
        priority: recommendation.priority,
        sourceModule: 'aiChiefOrchestrator',
      }),
    ),
    ...(patientFlowSnapshot?.aiRecommendations || []).map((recommendation) =>
      Object.freeze({
        id: recommendation.id,
        action: recommendation.action,
        rationale: recommendation.rationale,
        route: recommendation.patientId
          ? `${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent(recommendation.patientId)}`
          : CANONICAL_ROUTES.emergencyQueues,
        patientId: recommendation.patientId,
        priority: recommendation.priority || 'P2',
        sourceModule: 'continuousPatientFlowEngine',
      }),
    ),
    ...(operationalInsights || [])
      .filter((insight) => insight.type === 'intervention' || insight.type === 'recommendation')
      .map((insight) =>
        Object.freeze({
          id: insight.id,
          action: insight.title,
          rationale: insight.summary,
          route: insight.route,
          patientId: insight.patientId,
          priority: insight.severity === 'critical' ? 'P0' : 'P1',
          sourceModule: 'unifiedOperationalIntelligence',
        }),
      ),
  ];

  for (const recommendation of recommendations) {
    const nodeId = knowledgeGraphNodeId('ai_recommendation', recommendation.id);
    if (graph.nodes.has(nodeId)) continue;
    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'ai_recommendation',
      sourceId: recommendation.id,
      label: recommendation.action,
      summary: recommendation.rationale,
      route: recommendation.route || CANONICAL_ROUTES.emergencyCopilot,
      severity: recommendation.priority === 'P0' ? 'critical' : recommendation.priority === 'P1' ? 'warning' : 'info',
      sourceModule: recommendation.sourceModule,
      metadata: Object.freeze({
        priority: recommendation.priority,
      }),
    }));

    if (recommendation.patientId) {
      const patientNodeId = knowledgeGraphNodeId('patient', recommendation.patientId);
      if (graph.nodes.has(patientNodeId)) {
        addEdge(
          graph,
          'recommends',
          nodeId,
          patientNodeId,
          recommendation.sourceModule,
          'AI recommends action for patient',
        );
        indexPatient(graph, recommendation.patientId, nodeId);
      }
    }
  }
}

function buildServiceNodes(
  graph: MutableGraph,
  capacity: CapacitySnapshot | null | undefined,
): void {
  const bottleneckSnapshot = buildBottleneckRegistrySnapshot({
    existingServiceSignals: {
      emergencyOperatingSystem: {
        capacity,
      },
    },
  });

  for (const service of bottleneckSnapshot.serviceHealth) {
    const nodeId = knowledgeGraphNodeId('service', service.serviceName);
    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'service',
      sourceId: service.serviceName,
      label: service.serviceName,
      summary: `Service health: ${service.status}.`,
      route: CANONICAL_ROUTES.emergencyCommandCenter,
      severity: service.status === 'down' ? 'critical' : service.status === 'degraded' ? 'warning' : 'neutral',
      sourceModule: 'bottleneckRegistry',
      metadata: Object.freeze({
        status: service.status,
        errorRate: service.errorRate ?? null,
      }),
    }));

    for (const dependency of service.dependencies) {
      const dependencyNodeId = knowledgeGraphNodeId('service', dependency);
      if (!graph.nodes.has(dependencyNodeId)) {
        addNode(graph, Object.freeze({
          id: dependencyNodeId,
          entityType: 'service',
          sourceId: dependency,
          label: dependency,
          summary: 'Service dependency.',
          route: CANONICAL_ROUTES.emergencyCommandCenter,
          severity: 'neutral',
          sourceModule: 'bottleneckRegistry',
        }));
      }
      addEdge(graph, 'depends_on', nodeId, dependencyNodeId, 'bottleneckRegistry', 'depends on');
    }

    for (const bottleneck of service.currentBottlenecks) {
      const bottleneckNodeId = knowledgeGraphNodeId('operational_event', bottleneck.id);
      if (!graph.nodes.has(bottleneckNodeId)) {
        addNode(graph, Object.freeze({
          id: bottleneckNodeId,
          entityType: 'operational_event',
          sourceId: bottleneck.id,
          label: bottleneck.title,
          summary: bottleneck.description,
          route: CANONICAL_ROUTES.emergencyCommandCenter,
          severity: bottleneck.severity === 'critical' ? 'critical' : 'warning',
          sourceModule: 'bottleneckRegistry',
        }));
      }
      addEdge(graph, 'affects', bottleneckNodeId, nodeId, 'bottleneckRegistry', 'bottleneck affects service');

      if (bottleneck.affectedPatientId) {
        const patientNodeId = knowledgeGraphNodeId('patient', bottleneck.affectedPatientId);
        if (graph.nodes.has(patientNodeId)) {
          addEdge(graph, 'affects', bottleneckNodeId, patientNodeId, 'bottleneckRegistry', 'bottleneck affects patient');
          indexPatient(graph, bottleneck.affectedPatientId, bottleneckNodeId);
        }
      }
    }
  }
}

function buildEmsArrivalNodes(
  graph: MutableGraph,
  emsArrivals: readonly EMSArrival[],
): void {
  for (const arrival of emsArrivals) {
    const nodeId = knowledgeGraphNodeId('operational_event', `ems-${arrival.id}`);
    if (graph.nodes.has(nodeId)) continue;
    addNode(graph, Object.freeze({
      id: nodeId,
      entityType: 'operational_event',
      sourceId: arrival.id,
      label: arrival.unitName || `EMS ${arrival.id}`,
      summary: `${arrival.status} — ${arrival.chiefComplaint || 'Inbound ambulance'}.`,
      route: CANONICAL_ROUTES.emergencyEms,
      severity: arrival.priority === 'P1' || arrival.priority === 'P2' ? 'critical' : 'warning',
      sourceModule: 'emergencyStore.emsArrivals',
      metadata: Object.freeze({
        status: arrival.status,
        eta: arrival.eta ?? null,
      }),
    }));

    if (arrival.patientId) {
      const patientNodeId = knowledgeGraphNodeId('patient', arrival.patientId);
      if (graph.nodes.has(patientNodeId)) {
        addEdge(graph, 'connected_to', nodeId, patientNodeId, 'emergencyStore.emsArrivals', 'EMS inbound');
        indexPatient(graph, arrival.patientId, nodeId);
      }
    }

    const emsDepartmentNodeId = knowledgeGraphNodeId('department', 'ems');
    if (graph.nodes.has(emsDepartmentNodeId)) {
      addEdge(graph, 'affects', nodeId, emsDepartmentNodeId, 'emergencyStore.emsArrivals', 'EMS pressure');
    }
  }
}

function buildReferralNodes(graph: MutableGraph, referrals: readonly Referral[]): void {
  for (const referral of referrals.filter(
    (entry) => entry.status !== 'Completed' && entry.status !== 'Closed' && entry.status !== 'Declined',
  )) {
    const workflowNodeId = knowledgeGraphNodeId('workflow', `referral-${referral.id}`);
    const urgency = referral.urgency || 'Routine';
    addNode(graph, Object.freeze({
      id: workflowNodeId,
      entityType: 'workflow',
      sourceId: referral.id,
      label: `Referral — ${referral.targetDepartment || referral.service || 'consult'}`,
      summary: referral.reason || referral.clinicalSummary || referral.status || 'Pending referral workflow.',
      route: CANONICAL_ROUTES.emergencyReferrals,
      severity:
        urgency === 'Stat' || urgency === 'Emergent'
          ? 'critical'
          : urgency === 'Urgent'
            ? 'warning'
            : 'info',
      sourceModule: 'emergencyStore.referrals',
      metadata: Object.freeze({
        status: referral.status,
        department: referral.targetDepartment ?? null,
      }),
    }));

    if (referral.patientId) {
      const patientNodeId = knowledgeGraphNodeId('patient', referral.patientId);
      if (graph.nodes.has(patientNodeId)) {
        addEdge(graph, 'part_of', workflowNodeId, patientNodeId, 'emergencyStore.referrals', 'referral for patient');
        indexPatient(graph, referral.patientId, workflowNodeId);
      }
    }
  }
}

function buildPatientFlowConnections(
  graph: MutableGraph,
  patientFlowSnapshot: ContinuousPatientFlowSnapshot | null | undefined,
): void {
  if (!patientFlowSnapshot) return;

  for (const detection of patientFlowSnapshot.detections) {
    const eventNodeId = knowledgeGraphNodeId('operational_event', detection.id);
    if (graph.nodes.has(eventNodeId)) continue;
    addNode(graph, Object.freeze({
      id: eventNodeId,
      entityType: 'operational_event',
      sourceId: detection.id,
      label: detection.title,
      summary: detection.message,
      route: CANONICAL_ROUTES.emergencyCommandCenter,
      severity: detection.severity === 'critical' ? 'critical' : detection.severity === 'warning' ? 'warning' : 'info',
      sourceModule: 'continuousPatientFlowEngine',
      metadata: Object.freeze({
        type: detection.type,
        stageId: detection.stageId ?? null,
      }),
    }));

    if (detection.patientId) {
      const patientNodeId = knowledgeGraphNodeId('patient', detection.patientId);
      if (graph.nodes.has(patientNodeId)) {
        addEdge(graph, 'affects', eventNodeId, patientNodeId, 'continuousPatientFlowEngine', 'flow detection');
        indexPatient(graph, detection.patientId, eventNodeId);
      }
    }
  }
}

export function buildUnifiedApplicationKnowledgeGraph(
  input: BuildUnifiedApplicationKnowledgeGraphInput = {},
): UnifiedApplicationKnowledgeGraphSnapshot {
  const patients = input.patients ?? [];
  const staff = input.staff ?? [];
  const alerts = input.alerts ?? [];
  const rooms = input.rooms ?? [];
  const queues = input.queues ?? [];
  const referrals = input.referrals ?? [];
  const workflowLogs = input.workflowLogs ?? [];
  const administrativeTasks = input.administrativeTasks ?? [];
  const emsArrivals = input.emsArrivals ?? [];

  const graph: MutableGraph = {
    nodes: new Map(),
    edges: [],
    patientIndex: new Map(),
  };

  buildDepartmentNodes(graph);
  buildStaffNodes(graph, staff);
  buildQueueNodes(graph, queues);
  buildRoomAndBedNodes(graph, rooms);
  buildPatientNodes(graph, patients, staff, referrals, queues);
  buildAlertNodes(graph, alerts);
  buildWorkflowLogNodes(graph, workflowLogs);
  buildAutomationTaskNodes(graph, administrativeTasks);
  buildReferralNodes(graph, referrals);
  buildEmsArrivalNodes(graph, emsArrivals);
  buildOperationalInsightNodes(graph, input.operationalInsights);
  buildAiRecommendationNodes(
    graph,
    input.aiChiefSnapshot,
    input.operationalInsights,
    input.patientFlowSnapshot,
  );
  buildServiceNodes(graph, input.capacity);
  buildPatientFlowConnections(graph, input.patientFlowSnapshot);

  const nodes = Object.freeze([...graph.nodes.values()]);
  const patientIndex = Object.freeze(
    Object.fromEntries(
      [...graph.patientIndex.entries()].map(([patientId, nodeSet]) => [patientId, Object.freeze([...nodeSet])]),
    ),
  );

  const activeAlerts = alerts.filter((alert) => !alert.dismissed).length;
  const openWorkflows = administrativeTasks.filter(
    (task) => task.status === 'pending_review' || task.status === 'active',
  ).length;
  const aiRecommendations = nodes.filter((node) => node.entityType === 'ai_recommendation').length;
  const connectedServices = nodes.filter((node) => node.entityType === 'service').length;
  const occupiedBeds = nodes.filter((node) => node.entityType === 'bed').length;

  return Object.freeze({
    engineId: 'unified-application-knowledge-graph',
    generatedAt: (input.now ?? new Date()).toISOString(),
    nodes,
    edges: Object.freeze(graph.edges),
    metrics: Object.freeze({
      nodeCount: nodes.length,
      edgeCount: graph.edges.length,
      patients: nodes.filter((node) => node.entityType === 'patient').length,
      staff: nodes.filter((node) => node.entityType === 'staff').length,
      departments: nodes.filter((node) => node.entityType === 'department').length,
      activeAlerts,
      openWorkflows,
      aiRecommendations,
      connectedServices,
      occupiedBeds,
    }),
    patientIndex,
    safetyStatement: UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_SAFETY.statement,
  });
}

export default {
  buildUnifiedApplicationKnowledgeGraph,
};