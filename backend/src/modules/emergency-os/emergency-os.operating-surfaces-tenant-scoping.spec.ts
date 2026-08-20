import {
  EmergencyPatientService,
  EMSIntakeService,
  QueueIntelligenceService,
  EmergencyAnalyticsService,
  ReferralService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { EmergencyOperatingSurfacesService } from './emergency-os.operating-surfaces.service';
import { WorkflowOrchestrationService } from './emergency-os.workflow-orchestration.service';
import type { TenantContext } from '../tenant-context/tenant-context.types';

// HEAL-347.70: EmergencyOperatingSurfacesService.baseContext() and
// WorkflowOrchestrationService.operationalContext() both already received a
// real organizationId (threaded in from their public entry points, and
// already used for listPatients()), but called every other org-scoped-
// capable sibling (listAlerts/getEMSIntake/getQueues/getAnalytics/
// getReferrals) with zero args -- silently leaking every other hospital's
// alerts/EMS/queues/analytics/referrals into all 10 named operating
// surfaces, and into workflow-orchestration's automation snapshot.

function makeContext(organizationId: string): TenantContext {
  return {
    organizationId,
    workspaceId: 'workspace-1',
    userId: 'user-1',
    role: 'physician',
    subscriptionPlan: 'enterprise',
    source: 'resolved',
    isDemoTenant: false,
  };
}

describe('EmergencyOperatingSurfacesService — organization tenant scoping (HEAL-347.70)', () => {
  function makeService() {
    const workflowLogService = {
      record: jest.fn(() => ({ id: 'log-1' })),
      listLogs: () => [],
    } as unknown as WorkflowActionLogService;
    const patientService = new EmergencyPatientService(workflowLogService as any);
    const emsIntakeService = new EMSIntakeService(patientService, workflowLogService as any);
    const queueService = new QueueIntelligenceService(patientService);
    const analyticsService = new EmergencyAnalyticsService(patientService);
    const referralService = new ReferralService(patientService);
    const workflowOrchestrationService = new WorkflowOrchestrationService(
      patientService,
      referralService,
      emsIntakeService,
      workflowLogService as any,
    );
    const service = new EmergencyOperatingSurfacesService(
      patientService,
      emsIntakeService,
      queueService,
      analyticsService,
      referralService,
      workflowLogService as any,
      workflowOrchestrationService,
    );
    return { patientService, referralService, service };
  }

  it("the 'alerts' surface's recentAlerts excludes a different org's alert, and includes the caller's own", async () => {
    const { patientService, service } = makeService();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org' } as any,
      'org-b',
    );
    patientService.escalatePatient(patientA.id, 'actor', 'org-a');
    patientService.escalatePatient(patientB.id, 'actor', 'org-b');

    const scoped = await service.getSurface('alerts', makeContext('org-a'));
    const recentAlerts = (scoped.data as any).recentAlerts as Array<{ patientId?: string }>;
    expect(recentAlerts.some((alert) => alert.patientId === patientA.id)).toBe(true);
    expect(recentAlerts.some((alert) => alert.patientId === patientB.id)).toBe(false);
  });

  it("the 'dispatch' surface's inbound EMS list excludes a different org's EMS-flagged patient", async () => {
    const { patientService, service } = makeService();
    // 'Arrival' state is what makes getEMSIntake() classify a row as
    // pre-arrival (i.e. included in emsArrivals) rather than
    // converted-to-patient.
    const patientA = patientService.createPatient(
      { firstName: 'EMS', lastName: 'OrgA', flags: ['EMSArrival'], state: 'Arrival' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'EMS', lastName: 'OrgB', flags: ['EMSArrival'], state: 'Arrival' } as any,
      'org-b',
    );

    const scoped = await service.getSurface('dispatch', makeContext('org-a'));
    // buildInboundEmsRecord() flattens the row -- no nested .patient object,
    // and patientId is explicitly undefined -- but the patient's own id is
    // still encoded in the record's own id as `ems-arrival-${patient.id}`.
    const emsArrivals = (scoped.data as any).emsArrivals as Array<{ id?: string }>;
    expect(emsArrivals.some((row) => row.id === `ems-arrival-${patientA.id}`)).toBe(true);
    expect(emsArrivals.some((row) => row.id === `ems-arrival-${patientB.id}`)).toBe(false);
  });

  it("the 'shift-summary' surface's open-referral count excludes a different org's referrals", async () => {
    const { patientService, referralService, service } = makeService();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org' } as any,
      'org-b',
    );

    // Legacy/unscoped fixture-seeded referrals are visible under any org's
    // filter (same pattern as patients elsewhere in this file), so assert
    // on the before/after delta rather than an absolute count.
    const before = ((await service.getSurface('shift-summary', makeContext('org-a'))).data as any)
      .referralsOpen as number;

    referralService.createReferral({ patientId: patientA.id, status: 'Sent' }, 'org-a');
    referralService.createReferral({ patientId: patientB.id, status: 'Sent' }, 'org-b');
    referralService.createReferral({ patientId: patientB.id, status: 'Sent' }, 'org-b');

    const after = ((await service.getSurface('shift-summary', makeContext('org-a'))).data as any)
      .referralsOpen as number;

    // Only org-a's own 1 new referral should count -- if scoping were
    // broken, org-b's 2 referrals would inflate this delta to 3.
    expect(after - before).toBe(1);
  });
});

describe('WorkflowOrchestrationService.operationalContext — organization tenant scoping (HEAL-347.70)', () => {
  function makeService() {
    const workflowLogService = {
      record: jest.fn(() => ({ id: 'log-1' })),
      listLogs: () => [],
    } as unknown as WorkflowActionLogService;
    const patientService = new EmergencyPatientService(workflowLogService as any);
    const emsIntakeService = new EMSIntakeService(patientService, workflowLogService as any);
    const referralService = new ReferralService(patientService);
    const service = new WorkflowOrchestrationService(
      patientService,
      referralService,
      emsIntakeService,
      workflowLogService as any,
    );
    return { patientService, referralService, service };
  }

  it("operationalContext(organizationId) scopes referrals/alerts/emsArrivals to the caller's org, same as it already scoped patients", () => {
    const { patientService, referralService, service } = makeService();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org', flags: ['EMSArrival'], state: 'Arrival' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org', flags: ['EMSArrival'], state: 'Arrival' } as any,
      'org-b',
    );
    referralService.createReferral({ patientId: patientA.id, status: 'Sent' }, 'org-a');
    referralService.createReferral({ patientId: patientB.id, status: 'Sent' }, 'org-b');
    patientService.escalatePatient(patientA.id, 'actor', 'org-a');
    patientService.escalatePatient(patientB.id, 'actor', 'org-b');

    // operationalContext is private -- the same low-risk direct-call
    // technique used to test a private method's behavior without changing
    // its visibility just for tests.
    const scoped = (
      service as unknown as { operationalContext: (organizationId?: string) => any }
    ).operationalContext('org-a');

    expect(scoped.referrals.some((r: { patientId?: string }) => r.patientId === patientA.id)).toBe(
      true,
    );
    expect(scoped.referrals.some((r: { patientId?: string }) => r.patientId === patientB.id)).toBe(
      false,
    );
    expect(scoped.alerts.some((a: { patientId?: string }) => a.patientId === patientA.id)).toBe(
      true,
    );
    expect(scoped.alerts.some((a: { patientId?: string }) => a.patientId === patientB.id)).toBe(
      false,
    );
    expect(
      scoped.emsArrivals.some((row: { id?: string }) => row.id === `ems-arrival-${patientA.id}`),
    ).toBe(true);
    expect(
      scoped.emsArrivals.some((row: { id?: string }) => row.id === `ems-arrival-${patientB.id}`),
    ).toBe(false);
  });
});
