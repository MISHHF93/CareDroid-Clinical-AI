/**
 * Golden fixture: "Why is Room 12 delayed?"
 * Room → Patient → Lab pending → Equipment degraded → Staff load → Queue pressure
 *
 * Used by projector tests and later pathScore / explain_delay fixtures.
 */

import type { NeutralBoardDto } from '../neutralBoardDto';

export const ROOM12_TENANT = 'tenant-ed-demo';
export const ROOM12_GENERATED_AT = '2026-07-16T14:30:00.000Z';

/** Canonical Mode B board snapshot for Room 12 delay chain. */
export function buildRoom12DelayBoardDto(
  overrides?: Partial<NeutralBoardDto>,
): NeutralBoardDto {
  return {
    tenantId: ROOM12_TENANT,
    organizationId: 'org-demo',
    generatedAt: ROOM12_GENERATED_AT,
    snapshotVersion: 7,
    durability: 'session',
    departments: [
      {
        id: 'ed',
        label: 'Emergency Department',
        summary: 'Primary ED department',
      },
    ],
    staff: [
      {
        id: 'nurse-7',
        label: 'Sam Chen',
        role: 'RN',
        status: 'OnShift',
        activePatientCount: 4,
        updatedAt: '2026-07-16T14:00:00.000Z',
      },
      {
        id: 'md-3',
        label: 'Dr. Patel',
        role: 'Attending',
        status: 'OnShift',
        activePatientCount: 3,
        updatedAt: '2026-07-16T14:00:00.000Z',
      },
    ],
    rooms: [
      {
        id: '12',
        label: 'Room 12',
        type: 'Treatment',
        status: 'Occupied',
        patientId: 'pt-room12',
        updatedAt: '2026-07-16T12:00:00.000Z',
      },
    ],
    queues: [
      {
        id: 'results-pending',
        label: 'Results',
        count: 6,
        breached: true,
        oldestWaitMinutes: 95,
        matchState: 'Results',
        updatedAt: '2026-07-16T14:25:00.000Z',
      },
    ],
    patients: [
      {
        id: 'pt-room12',
        label: 'Jordan Blake',
        mrn: 'MRN-4412',
        state: 'Results',
        priority: 'P2',
        chiefComplaint: 'Abdominal pain',
        assignedStaffId: 'nurse-7',
        assignedPhysicianId: 'md-3',
        roomId: '12',
        departmentIds: ['ed'],
        workflowStepId: 'awaiting-results',
        workflowStepLabel: 'Awaiting diagnostics',
        arrivedAt: '2026-07-16T11:00:00.000Z',
        updatedAt: '2026-07-16T13:00:00.000Z',
      },
    ],
    diagnostics: [
      {
        id: 'lab-cbc-pt-room12',
        label: 'CBC — Room 12',
        patientId: 'pt-room12',
        status: 'pending',
        summary: 'Lab result pending analyzer capacity.',
        blocking: true,
        updatedAt: '2026-07-16T13:15:00.000Z',
      },
    ],
    services: [
      {
        id: 'lab-analyzer-a',
        label: 'Lab Analyzer A',
        health: 'degraded',
        latencyMs: 4200,
        errorRate: 0.12,
        version: '2.4.1',
        blocksEntityIds: [{ entityType: 'diagnostic', sourceId: 'lab-cbc-pt-room12' }],
        updatedAt: '2026-07-16T14:10:00.000Z',
      },
    ],
    alerts: [
      {
        id: 'alert-room12-delay',
        label: 'Room 12 delayed',
        summary: 'Disposition blocked on pending lab.',
        severity: 'warning',
        patientId: 'pt-room12',
        acknowledged: false,
        category: 'Throughput',
        ownerRole: 'charge_nurse',
        createdAt: '2026-07-16T14:20:00.000Z',
      },
    ],
    recommendations: [
      {
        id: 'rec-expedite-lab',
        label: 'Expedite lab send-out',
        summary: 'Route CBC to backup analyzer or external lab.',
        patientId: 'pt-room12',
        confidence: 0.78,
        humanReviewRequired: true,
        updatedAt: '2026-07-16T14:28:00.000Z',
      },
    ],
    ...overrides,
  };
}
