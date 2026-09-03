import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { buildUnifiedApplicationKnowledgeGraph } from './unifiedApplicationKnowledgeGraphService';
import {
  findKnowledgeGraphNeighbors,
  resolvePatientKnowledgeGraphSubgraph,
} from './unifiedApplicationKnowledgeGraphPresentation';

const patient: Patient = {
  id: 'pt-graph-1',
  mrn: 'MRN-001',
  firstName: 'Alex',
  lastName: 'Rivera',
  dob: '1990-01-01',
  age: 36,
  sex: 'M',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Waiting,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
  arrivalTime: '2026-07-02T10:00:00.000Z',
  assignedStaffId: 'staff-1',
};

describe('unifiedApplicationKnowledgeGraphService', () => {
  it('maps patients, staff, and queues into connected graph nodes', () => {
    const graph = buildUnifiedApplicationKnowledgeGraph({
      patients: [patient],
      staff: [
        {
          id: 'staff-1',
          name: 'Jordan Lee',
          role: 'RN',
          status: 'OnShift',
          active: true,
        },
      ],
      queues: [
        {
          id: 'queue-waiting',
          label: 'Waiting',
          count: 1,
          breached: true,
        },
      ],
      alerts: [
        {
          id: 'alert-1',
          type: 'QueueBreach',
          severity: 'Critical',
          message: 'Waiting queue breached',
          title: 'Queue breach',
          patientId: 'pt-graph-1',
          acknowledged: false,
          dismissed: false,
          createdAt: '2026-07-02T10:05:00.000Z',
          ownerRole: 'triage_nurse',
        },
      ],
    });

    expect(graph.engineId).toBe('unified-application-knowledge-graph');
    expect(graph.metrics.patients).toBe(1);
    expect(graph.metrics.activeAlerts).toBe(1);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.patientIndex['pt-graph-1']?.length).toBeGreaterThan(0);
  });

  it('resolves patient subgraph with alerts and staff neighbors', () => {
    const graph = buildUnifiedApplicationKnowledgeGraph({
      patients: [patient],
      staff: [
        {
          id: 'staff-1',
          name: 'Jordan Lee',
          role: 'RN',
          status: 'OnShift',
          active: true,
        },
      ],
      alerts: [
        {
          id: 'alert-1',
          type: 'QueueBreach',
          severity: 'Critical',
          message: 'Waiting queue breached',
          title: 'Queue breach',
          patientId: 'pt-graph-1',
          acknowledged: false,
          dismissed: false,
          createdAt: '2026-07-02T10:05:00.000Z',
        },
      ],
    });

    const subgraph = resolvePatientKnowledgeGraphSubgraph(graph, 'pt-graph-1');
    expect(subgraph.alerts.length).toBeGreaterThan(0);
    expect(subgraph.staff.length).toBeGreaterThan(0);

    const patientNodeId = 'kg:patient:pt-graph-1';
    const neighbors = findKnowledgeGraphNeighbors(graph, patientNodeId);
    expect(neighbors.some((entry) => entry.node.entityType === 'alert')).toBe(true);
  });

  it('connects EMS arrivals and operational intelligence insights', () => {
    const graph = buildUnifiedApplicationKnowledgeGraph({
      patients: [patient],
      emsArrivals: [
        {
          id: 'ems-1',
          status: 'Inbound',
          eta: 5,
          chiefComplaint: 'Stroke',
          unitName: 'Medic 9',
          patientId: 'pt-graph-1',
        } as never,
      ],
      operationalInsights: [
        {
          id: 'uoi-alert-1',
          domain: 'alerts',
          type: 'alert',
          title: 'Capacity alert',
          summary: 'Capacity watch from backend.',
          severity: 'warning',
          ownerRole: 'ed_manager',
          reasonCodes: ['capacity_watch'],
          confidence: 0.88,
          humanReviewRequired: true,
          advisoryOnly: true,
          source: 'backend',
          updatedAt: '2026-07-03T10:00:00.000Z',
        },
      ],
    });

    expect(graph.nodes.some((node) => node.entityType === 'operational_event')).toBe(true);
    expect(graph.patientIndex['pt-graph-1']?.length).toBeGreaterThan(1);
  });
});
