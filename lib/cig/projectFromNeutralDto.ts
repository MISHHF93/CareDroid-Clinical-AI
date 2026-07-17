/**
 * Pure CIG projector: NeutralBoardDto → CigGraphSnapshot (PR-2a).
 *
 * No window / Zustand / Vite / Nest. FE and Nest adapters supply the DTO.
 * @see docs/architecture/clinical-intelligence-graph-design.md
 */

import {
  CARE_DROID_CIG_LAYER,
  CIG_DISCHARGED_RETENTION_MS,
  CIG_PROJECTOR_GENERATION,
} from './constants';
import { makeCigEdgeId, makeCigNodeId } from './ids';
import type { NeutralBoardDto, NeutralBoardPatient } from './neutralBoardDto';
import type {
  CigDurability,
  CigEdge,
  CigEntityType,
  CigGraphSnapshot,
  CigNode,
  CigNodeState,
  CigPhiClass,
  CigRelationshipType,
  CigSeverity,
} from './types';

type MutableGraph = {
  nodes: Map<string, CigNode>;
  edges: CigEdge[];
};

function defaultState(partial: Partial<CigNodeState> & { status: string }): CigNodeState {
  return {
    humanReviewRequired: partial.humanReviewRequired ?? false,
    ...partial,
  };
}

function prioritySeverity(priority: string | null | undefined): CigSeverity {
  if (priority === 'P1') return 'critical';
  if (priority === 'P2') return 'warning';
  if (priority) return 'info';
  return 'neutral';
}

function timeInStateMs(sinceIso: string | null | undefined, nowMs: number): number | null {
  if (!sinceIso) return null;
  const t = Date.parse(sinceIso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, nowMs - t);
}

function simpleHash(parts: readonly (string | number | boolean | null | undefined)[]): string {
  const raw = parts.map((p) => (p == null ? '' : String(p))).join('|');
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function isTerminalState(state: string): boolean {
  const s = state.toLowerCase();
  return s === 'discharge' || s === 'discharged' || s === 'deceased' || s === 'left_without_being_seen';
}

function shouldIncludePatient(
  patient: NeutralBoardPatient,
  nowMs: number,
  retentionMs: number,
): { include: boolean; archivedAt: string | null } {
  if (!patient.discharged && !isTerminalState(patient.state)) {
    return { include: true, archivedAt: null };
  }
  const dischargedAt = patient.dischargedAt || patient.updatedAt;
  if (!dischargedAt) {
    // Unknown discharge time → exclude from hot graph (conservative)
    return { include: false, archivedAt: null };
  }
  const t = Date.parse(dischargedAt);
  if (!Number.isFinite(t)) return { include: false, archivedAt: null };
  if (nowMs - t <= retentionMs) {
    return { include: true, archivedAt: dischargedAt };
  }
  return { include: false, archivedAt: null };
}

function makeNode(input: {
  tenantId: string;
  entityType: CigEntityType;
  sourceId: string;
  sourceModule: string;
  label: string;
  summary?: string;
  route?: string;
  severity?: CigSeverity;
  state: CigNodeState;
  metadata: Record<string, string | number | boolean | null>;
  phiClass: CigPhiClass;
  durability: CigDurability;
  sourceUpdatedAt: string;
  projectorGeneration: string;
  snapshotVersion: number;
  nowIso: string;
  archivedAt?: string | null;
}): CigNode {
  const id = makeCigNodeId(input.tenantId, input.entityType, input.sourceId);
  return {
    id,
    tenantId: input.tenantId,
    entityType: input.entityType,
    sourceId: input.sourceId,
    sourceModule: input.sourceModule,
    label: input.label,
    summary: input.summary,
    route: input.route,
    severity: input.severity,
    state: input.state,
    metadata: input.metadata,
    phiClass: input.phiClass,
    durability: input.durability,
    sourceUpdatedAt: input.sourceUpdatedAt,
    version: 1,
    projectorGeneration: input.projectorGeneration,
    contentHash: simpleHash([
      input.entityType,
      input.sourceId,
      input.state.status,
      input.severity ?? '',
      JSON.stringify(input.metadata),
      input.archivedAt ?? '',
    ]),
    lastGraphVersion: input.snapshotVersion,
    updatedAt: input.nowIso,
    createdAt: input.sourceUpdatedAt,
    archivedAt: input.archivedAt ?? null,
  };
}

function addEdge(
  graph: MutableGraph,
  tenantId: string,
  type: CigRelationshipType,
  fromId: string,
  toId: string,
  sourceModule: string,
  durability: CigDurability,
  nowIso: string,
  label?: string,
  weight?: number,
): void {
  if (!graph.nodes.has(fromId) || !graph.nodes.has(toId)) return;
  const id = makeCigEdgeId(tenantId, type, fromId, toId);
  // Deduplicate current edges by id
  if (graph.edges.some((e) => e.id === id && e.validTo == null)) return;
  graph.edges.push({
    id,
    tenantId,
    type,
    fromId,
    toId,
    label,
    weight,
    validFrom: nowIso,
    validTo: null,
    sourceModule,
    durability,
  });
}

/**
 * Project a neutral operational board into a CIG snapshot.
 * Mode B callers must pass durability: 'session'.
 */
export function projectFromNeutralDto(dto: NeutralBoardDto): CigGraphSnapshot {
  const tenantId = dto.tenantId;
  if (!tenantId) {
    throw new Error('projectFromNeutralDto requires tenantId');
  }
  const nowIso = dto.generatedAt || new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const clockMs = Number.isFinite(nowMs) ? nowMs : Date.now();
  const durability = dto.durability;
  const projectorGeneration = dto.projectorGeneration ?? CIG_PROJECTOR_GENERATION;
  const snapshotVersion = dto.snapshotVersion;
  const graph: MutableGraph = { nodes: new Map(), edges: [] };

  const put = (node: CigNode): void => {
    graph.nodes.set(node.id, node);
  };

  // —— Departments ——
  for (const dept of dto.departments ?? []) {
    const sourceUpdatedAt = dept.updatedAt || nowIso;
    put(
      makeNode({
        tenantId,
        entityType: 'department',
        sourceId: dept.id,
        sourceModule: 'neutralBoard.departments',
        label: dept.label,
        summary: dept.summary ?? undefined,
        severity: 'neutral',
        state: defaultState({ status: 'active' }),
        metadata: {},
        phiClass: 'none',
        durability,
        sourceUpdatedAt,
        projectorGeneration,
        snapshotVersion,
        nowIso,
      }),
    );
  }

  // —— Staff ——
  for (const member of dto.staff ?? []) {
    const sourceUpdatedAt = member.updatedAt || nowIso;
    const load = member.activePatientCount ?? 0;
    put(
      makeNode({
        tenantId,
        entityType: 'staff',
        sourceId: member.id,
        sourceModule: 'neutralBoard.staff',
        label: member.label,
        summary: `${member.role || 'Staff'} — ${member.status || 'active'}.`,
        severity: load > 2 ? 'warning' : 'neutral',
        state: defaultState({
          status: member.status || 'active',
          ownerRole: member.role ?? null,
        }),
        metadata: {
          role: member.role ?? null,
          status: member.status ?? null,
          activePatientCount: load,
        },
        phiClass: 'indirect',
        durability,
        sourceUpdatedAt,
        projectorGeneration,
        snapshotVersion,
        nowIso,
      }),
    );
  }

  // —— Rooms + beds ——
  for (const room of dto.rooms ?? []) {
    const sourceUpdatedAt = room.updatedAt || nowIso;
    const roomNode = makeNode({
      tenantId,
      entityType: 'room',
      sourceId: room.id,
      sourceModule: 'neutralBoard.rooms',
      label: room.label,
      summary: `${room.type || 'room'} — ${room.status}.`,
      severity: room.status === 'Blocked' ? 'warning' : 'neutral',
      state: defaultState({
        status: room.status,
        blockingIssues: room.status === 'Blocked' ? ['room_blocked'] : undefined,
      }),
      metadata: {
        type: room.type ?? null,
        status: room.status,
        occupied: room.status === 'Occupied' || Boolean(room.patientId),
        // occupant as sourceId only — redaction layer strips without READ_PHI
        patientId: room.patientId ?? null,
      },
      phiClass: room.patientId ? 'direct' : 'none',
      durability,
      sourceUpdatedAt,
      projectorGeneration,
      snapshotVersion,
      nowIso,
    });
    put(roomNode);

    if (room.patientId) {
      const bedNode = makeNode({
        tenantId,
        entityType: 'bed',
        sourceId: room.id,
        sourceModule: 'neutralBoard.rooms',
        label: `${room.label} bed`,
        summary: `Occupied bed in ${room.label}.`,
        severity: 'warning',
        state: defaultState({ status: 'Occupied' }),
        metadata: {
          roomId: room.id,
          patientId: room.patientId,
        },
        phiClass: 'direct',
        durability,
        sourceUpdatedAt,
        projectorGeneration,
        snapshotVersion,
        nowIso,
      });
      put(bedNode);
      addEdge(
        graph,
        tenantId,
        'part_of',
        bedNode.id,
        roomNode.id,
        'neutralBoard.rooms',
        durability,
        nowIso,
        'bed in room',
      );
    }
  }

  // —— Queues ——
  for (const queue of dto.queues ?? []) {
    const sourceUpdatedAt = queue.updatedAt || nowIso;
    put(
      makeNode({
        tenantId,
        entityType: 'queue',
        sourceId: queue.id,
        sourceModule: 'neutralBoard.queues',
        label: queue.label,
        summary: `${queue.count} patients waiting.`,
        severity: queue.breached
          ? 'critical'
          : (queue.oldestWaitMinutes ?? 0) > 30
            ? 'warning'
            : 'neutral',
        state: defaultState({
          status: queue.breached ? 'breached' : 'open',
          blockingIssues: queue.breached ? ['queue_breached'] : undefined,
        }),
        metadata: {
          count: queue.count,
          breached: queue.breached ?? false,
          oldestWaitMinutes: queue.oldestWaitMinutes ?? null,
          matchState: queue.matchState ?? null,
        },
        phiClass: 'none',
        durability,
        sourceUpdatedAt,
        projectorGeneration,
        snapshotVersion,
        nowIso,
      }),
    );
  }

  // —— Workflow steps (optional catalogue) ——
  for (const step of dto.workflowSteps ?? []) {
    const sourceUpdatedAt = step.updatedAt || nowIso;
    put(
      makeNode({
        tenantId,
        entityType: 'workflow_step',
        sourceId: step.id,
        sourceModule: 'neutralBoard.workflowSteps',
        label: step.label,
        summary: step.summary ?? undefined,
        route: step.route ?? undefined,
        severity: 'info',
        state: defaultState({ status: 'active' }),
        metadata: {},
        phiClass: 'none',
        durability,
        sourceUpdatedAt,
        projectorGeneration,
        snapshotVersion,
        nowIso,
      }),
    );
  }

  // —— Patients ——
  for (const patient of dto.patients ?? []) {
    const { include, archivedAt } = shouldIncludePatient(
      patient,
      clockMs,
      CIG_DISCHARGED_RETENTION_MS,
    );
    if (!include) continue;

    const sourceUpdatedAt = patient.updatedAt || patient.arrivedAt || nowIso;
    const patientNode = makeNode({
      tenantId,
      entityType: 'patient',
      sourceId: patient.id,
      sourceModule: 'neutralBoard.patients',
      label: patient.label,
      summary: `${patient.priority || 'P?'} — ${patient.state} (${patient.chiefComplaint || 'ED visit'}).`,
      severity: prioritySeverity(patient.priority),
      state: defaultState({
        status: patient.state,
        priority: patient.priority ?? null,
        timeInStateMs: timeInStateMs(patient.updatedAt || patient.arrivedAt, clockMs),
        ownerId: patient.assignedStaffId ?? patient.assignedPhysicianId ?? null,
        humanReviewRequired: false,
      }),
      metadata: {
        mrn: patient.mrn ?? null,
        state: patient.state,
        priority: patient.priority ?? null,
        workflowStepId: patient.workflowStepId ?? null,
      },
      phiClass: 'direct',
      durability,
      sourceUpdatedAt,
      projectorGeneration,
      snapshotVersion,
      nowIso,
      archivedAt,
    });
    put(patientNode);

    for (const staffId of [patient.assignedStaffId, patient.assignedPhysicianId]) {
      if (!staffId) continue;
      const staffNodeId = makeCigNodeId(tenantId, 'staff', staffId);
      addEdge(
        graph,
        tenantId,
        'assigned_to',
        staffNodeId,
        patientNode.id,
        'neutralBoard.patients',
        durability,
        nowIso,
        'assigned clinician',
      );
    }

    if (patient.roomId) {
      const roomNodeId = makeCigNodeId(tenantId, 'room', patient.roomId);
      addEdge(
        graph,
        tenantId,
        'located_in',
        patientNode.id,
        roomNodeId,
        'neutralBoard.patients',
        durability,
        nowIso,
        'in room',
      );
      const bedNodeId = makeCigNodeId(tenantId, 'bed', patient.roomId);
      addEdge(
        graph,
        tenantId,
        'located_in',
        patientNode.id,
        bedNodeId,
        'neutralBoard.patients',
        durability,
        nowIso,
        'in bed',
      );
    }

    let queueId = patient.queueId;
    if (!queueId) {
      const match = (dto.queues ?? []).find(
        (q) =>
          (q.matchState && q.matchState.toLowerCase() === patient.state.toLowerCase()) ||
          q.label.toLowerCase() === patient.state.toLowerCase(),
      );
      queueId = match?.id;
    }
    if (queueId) {
      const queueNodeId = makeCigNodeId(tenantId, 'queue', queueId);
      addEdge(
        graph,
        tenantId,
        'waiting_in',
        patientNode.id,
        queueNodeId,
        'neutralBoard.queues',
        durability,
        nowIso,
        'waiting in queue',
      );
    }

    for (const departmentId of patient.departmentIds ?? []) {
      const departmentNodeId = makeCigNodeId(tenantId, 'department', departmentId);
      addEdge(
        graph,
        tenantId,
        'part_of',
        patientNode.id,
        departmentNodeId,
        'neutralBoard.patients',
        durability,
        nowIso,
        'journey department',
      );
    }

    if (patient.workflowStepId) {
      const stepId = makeCigNodeId(tenantId, 'workflow_step', patient.workflowStepId);
      if (!graph.nodes.has(stepId) && patient.workflowStepLabel) {
        put(
          makeNode({
            tenantId,
            entityType: 'workflow_step',
            sourceId: patient.workflowStepId,
            sourceModule: 'neutralBoard.patients',
            label: patient.workflowStepLabel,
            severity: 'info',
            state: defaultState({ status: 'active' }),
            metadata: {},
            phiClass: 'none',
            durability,
            sourceUpdatedAt,
            projectorGeneration,
            snapshotVersion,
            nowIso,
          }),
        );
      }
      addEdge(
        graph,
        tenantId,
        'part_of',
        patientNode.id,
        stepId,
        'neutralBoard.patients',
        durability,
        nowIso,
        'workflow step',
      );
    }
  }

  // —— Diagnostics ——
  for (const diag of dto.diagnostics ?? []) {
    const sourceUpdatedAt = diag.updatedAt || nowIso;
    const diagNode = makeNode({
      tenantId,
      entityType: 'diagnostic',
      sourceId: diag.id,
      sourceModule: 'neutralBoard.diagnostics',
      label: diag.label,
      summary: diag.summary ?? undefined,
      severity: diag.blocking || diag.status === 'pending' ? 'warning' : 'info',
      state: defaultState({
        status: diag.status,
        blockingIssues: diag.blocking ? ['diagnostic_pending'] : undefined,
      }),
      metadata: {
        status: diag.status,
        patientId: diag.patientId,
        blocking: diag.blocking ?? false,
      },
      phiClass: 'direct',
      durability,
      sourceUpdatedAt,
      projectorGeneration,
      snapshotVersion,
      nowIso,
    });
    put(diagNode);
    const patientNodeId = makeCigNodeId(tenantId, 'patient', diag.patientId);
    addEdge(
      graph,
      tenantId,
      'part_of',
      diagNode.id,
      patientNodeId,
      'neutralBoard.diagnostics',
      durability,
      nowIso,
      'patient diagnostics',
    );
    if (diag.blocking || diag.status === 'pending') {
      addEdge(
        graph,
        tenantId,
        'blocks',
        diagNode.id,
        patientNodeId,
        'neutralBoard.diagnostics',
        durability,
        nowIso,
        'pending result blocks progress',
        1.5,
      );
    }
  }

  // —— Alerts ——
  for (const alert of dto.alerts ?? []) {
    if (alert.dismissed) continue;
    const sourceUpdatedAt = alert.updatedAt || alert.createdAt || nowIso;
    const alertNode = makeNode({
      tenantId,
      entityType: 'alert',
      sourceId: alert.id,
      sourceModule: 'neutralBoard.alerts',
      label: alert.label,
      summary: alert.summary ?? undefined,
      severity: alert.severity,
      state: defaultState({
        status: alert.acknowledged ? 'acknowledged' : 'open',
        ownerRole: alert.ownerRole ?? null,
      }),
      metadata: {
        acknowledged: alert.acknowledged ?? false,
        category: alert.category ?? null,
        patientId: alert.patientId ?? null,
      },
      phiClass: alert.patientId ? 'direct' : 'indirect',
      durability,
      sourceUpdatedAt,
      projectorGeneration,
      snapshotVersion,
      nowIso,
    });
    put(alertNode);
    if (alert.patientId) {
      const patientNodeId = makeCigNodeId(tenantId, 'patient', alert.patientId);
      addEdge(
        graph,
        tenantId,
        'affects',
        alertNode.id,
        patientNodeId,
        'neutralBoard.alerts',
        durability,
        nowIso,
        'alert affects patient',
      );
    }
  }

  // —— EMS ——
  for (const unit of dto.emsUnits ?? []) {
    const sourceUpdatedAt = unit.updatedAt || nowIso;
    const emsNode = makeNode({
      tenantId,
      entityType: 'ems_unit',
      sourceId: unit.id,
      sourceModule: 'neutralBoard.emsUnits',
      label: unit.label,
      summary: unit.chiefComplaint
        ? `${unit.status} — ${unit.chiefComplaint}`
        : unit.status,
      severity: unit.status === 'Inbound' ? 'warning' : 'info',
      state: defaultState({
        status: unit.status,
        timeInStateMs: null,
      }),
      metadata: {
        status: unit.status,
        etaMinutes: unit.etaMinutes ?? null,
        patientId: unit.patientId ?? null,
      },
      phiClass: unit.patientId ? 'direct' : 'indirect',
      durability,
      sourceUpdatedAt,
      projectorGeneration,
      snapshotVersion,
      nowIso,
    });
    put(emsNode);
    if (unit.patientId) {
      const patientNodeId = makeCigNodeId(tenantId, 'patient', unit.patientId);
      addEdge(
        graph,
        tenantId,
        'arrives_as',
        emsNode.id,
        patientNodeId,
        'neutralBoard.emsUnits',
        durability,
        nowIso,
        'EMS linked patient',
      );
    }
  }

  // —— Services (infra / lab equipment) ——
  for (const service of dto.services ?? []) {
    const sourceUpdatedAt = service.updatedAt || nowIso;
    const serviceNode = makeNode({
      tenantId,
      entityType: 'service',
      sourceId: service.id,
      sourceModule: 'neutralBoard.services',
      label: service.label,
      severity:
        service.health === 'critical'
          ? 'critical'
          : service.health === 'degraded'
            ? 'warning'
            : 'neutral',
      state: defaultState({
        status: service.health,
        health: service.health,
        latencyMs: service.latencyMs ?? null,
      }),
      metadata: {
        status: service.health,
        latencyMs: service.latencyMs ?? null,
        errorRate: service.errorRate ?? null,
        version: service.version ?? null,
      },
      phiClass: 'none',
      durability,
      sourceUpdatedAt,
      projectorGeneration,
      snapshotVersion,
      nowIso,
    });
    put(serviceNode);
    for (const target of service.blocksEntityIds ?? []) {
      const targetId = makeCigNodeId(tenantId, target.entityType, target.sourceId);
      if (service.health === 'degraded' || service.health === 'critical') {
        addEdge(
          graph,
          tenantId,
          'affects',
          serviceNode.id,
          targetId,
          'neutralBoard.services',
          durability,
          nowIso,
          'service affects entity',
          1.2,
        );
        addEdge(
          graph,
          tenantId,
          'blocks',
          serviceNode.id,
          targetId,
          'neutralBoard.services',
          durability,
          nowIso,
          'service blocks entity',
          1.8,
        );
      }
    }
  }

  // —— AI recommendations ——
  for (const rec of dto.recommendations ?? []) {
    const sourceUpdatedAt = rec.updatedAt || nowIso;
    const recNode = makeNode({
      tenantId,
      entityType: 'ai_recommendation',
      sourceId: rec.id,
      sourceModule: 'neutralBoard.recommendations',
      label: rec.label,
      summary: rec.summary ?? undefined,
      severity: 'info',
      state: defaultState({
        status: 'advisory',
        aiConfidence: rec.confidence ?? null,
        confidence: rec.confidence ?? null,
        humanReviewRequired: rec.humanReviewRequired ?? true,
      }),
      metadata: {
        patientId: rec.patientId ?? null,
        confidence: rec.confidence ?? null,
      },
      phiClass: rec.patientId ? 'direct' : 'indirect',
      durability,
      sourceUpdatedAt,
      projectorGeneration,
      snapshotVersion,
      nowIso,
    });
    put(recNode);
    if (rec.patientId) {
      const patientNodeId = makeCigNodeId(tenantId, 'patient', rec.patientId);
      addEdge(
        graph,
        tenantId,
        'recommends',
        recNode.id,
        patientNodeId,
        'neutralBoard.recommendations',
        durability,
        nowIso,
        'recommendation for patient',
      );
    }
  }

  const nodes = Object.freeze([...graph.nodes.values()]);
  const edges = Object.freeze([...graph.edges]);
  const generatedAt = nowIso;

  return {
    layer: CARE_DROID_CIG_LAYER,
    meta: {
      tenantId,
      snapshotVersion,
      generatedAt,
      freshnessMs: 0,
      projectorGeneration,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
    nodes,
    edges,
    durability,
    degraded: durability !== 'durable',
    degradeReason:
      durability !== 'durable'
        ? 'Mode B session projection — multi-user durable twin not claimed'
        : undefined,
  };
}

/** Locate a node by entity type + source id within a snapshot. */
export function findCigNode(
  snapshot: CigGraphSnapshot,
  entityType: string,
  sourceId: string,
): CigNode | undefined {
  const id = makeCigNodeId(snapshot.meta.tenantId, entityType, sourceId);
  return snapshot.nodes.find((n) => n.id === id);
}

/** Outgoing + incoming current edges for a node. */
export function findCigNeighbors(
  snapshot: CigGraphSnapshot,
  nodeId: string,
): { edge: CigEdge; node: CigNode }[] {
  const byId = new Map(snapshot.nodes.map((n) => [n.id, n]));
  const out: { edge: CigEdge; node: CigNode }[] = [];
  for (const edge of snapshot.edges) {
    if (edge.validTo != null) continue;
    if (edge.fromId === nodeId) {
      const node = byId.get(edge.toId);
      if (node) out.push({ edge, node });
    } else if (edge.toId === nodeId) {
      const node = byId.get(edge.fromId);
      if (node) out.push({ edge, node });
    }
  }
  return out;
}
