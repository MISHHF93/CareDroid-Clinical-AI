import { Injectable } from '@nestjs/common';
import type { EmergencyAlert, EmergencyPatient, WorkflowActionLog } from './emergency-os.types';
import {
  EmergencyAnalyticsService,
  EmergencyPatientService,
  EMSIntakeService,
  QueueIntelligenceService,
  ReferralService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { WorkflowOrchestrationService } from './emergency-os.workflow-orchestration.service';
import type { TenantContext } from '../tenant-context/tenant-context.types';

export type OperatingSurfaceId =
  | 'dispatch'
  | 'department-pulse'
  | 'shift-summary'
  | 'diagnostics'
  | 'handoffs'
  | 'reports'
  | 'ed-readiness'
  | 'command-center'
  | 'alerts'
  | 'whiteboard';

function envelope<T>(title: string, surfaceId: OperatingSurfaceId, data: T) {
  return {
    success: true,
    title,
    surfaceId,
    generatedAt: new Date().toISOString(),
    data,
  };
}

type EmsArrivalLike = { status?: string; severity?: string };

function activePatients(patients: EmergencyPatient[]) {
  return patients.filter((patient) => patient.state !== 'Discharge');
}

function inboundEms(emsArrivals: EmsArrivalLike[]) {
  return emsArrivals.filter((arrival) =>
    ['Dispatched', 'Inbound', 'Arrived', 'Handoff', 'Offload'].includes(
      String(arrival.status || ''),
    ),
  );
}

@Injectable()
export class EmergencyOperatingSurfacesService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly emsIntakeService: EMSIntakeService,
    private readonly queueService: QueueIntelligenceService,
    private readonly analyticsService: EmergencyAnalyticsService,
    private readonly referralService: ReferralService,
    private readonly workflowLogService: WorkflowActionLogService,
    private readonly workflowOrchestrationService: WorkflowOrchestrationService,
  ) {}

  // HEAL-347.70: organizationId was already threaded in from getSurface()'s
  // caller and used for listPatients() -- but every other read here ignored
  // it and called its org-scoped-capable sibling with zero args, leaking
  // every other hospital's alerts/EMS/queues/analytics/referrals into all
  // 10 named operating surfaces below. workflowLogs is the one exception,
  // left deliberately unscoped: WorkflowActionLog.tenantId is only ever set
  // from `metadata.tenantId`, which no real call site in this codebase ever
  // populates (grep-confirmed) -- every real log is stamped the literal
  // string 'default-tenant', the same phantom-field shape as HEAL-347.34.
  // Scoping listLogs() properly needs its own pass (stamp real org ids at
  // every record() call site, or scope via patientId like ReferralService
  // does), not a one-line argument thread.
  private baseContext(organizationId?: string) {
    const patients = this.patientService.listPatients(organizationId);
    const alerts = this.patientService.listAlerts(organizationId) as unknown as EmergencyAlert[];
    const capacity = this.patientService.computeCapacity();
    const emsPayload = this.emsIntakeService.getEMSIntake(organizationId).data as {
      emsArrivals?: EmsArrivalLike[];
    };
    const emsArrivals = emsPayload.emsArrivals || [];
    const queues = this.queueService.getQueues(organizationId).data as { queues?: unknown[] };
    const analytics = this.analyticsService.getAnalytics(organizationId).data;
    const referrals = this.referralService.getReferrals(organizationId).data.referrals || [];
    const workflowLogs = this.workflowLogService.listLogs() as unknown as WorkflowActionLog[];
    return {
      patients,
      activePatients: activePatients(patients),
      alerts,
      capacity,
      emsArrivals,
      inboundEms: inboundEms(emsArrivals),
      queues,
      analytics,
      referrals,
      workflowLogs,
    };
  }

  async getSurface(surfaceId: OperatingSurfaceId, tenant?: TenantContext) {
    const context = this.baseContext(tenant?.organizationId);

    switch (surfaceId) {
      case 'dispatch':
        return envelope('Dispatch Console Snapshot', surfaceId, {
          activeCalls: context.inboundEms.length,
          criticalAlerts: context.alerts.filter((alert) => alert.severity === 'Critical').length,
          emsArrivals: context.inboundEms,
          capacityBand: context.capacity.band,
          workflowLogCount: context.workflowLogs.length,
          summary: {
            dispatched: context.inboundEms.filter((a) => a.status === 'Dispatched').length,
            inbound: context.inboundEms.filter((a) => a.status === 'Inbound').length,
            arrived: context.inboundEms.filter((a) => a.status === 'Arrived').length,
          },
        });

      case 'department-pulse':
        return envelope('Department Pulse Snapshot', surfaceId, {
          activePatientCount: context.analytics.activeCensus,
          waiting: context.analytics.waiting,
          highRisk: context.analytics.highRisk,
          boarding: context.analytics.boarding,
          reassessmentDue: context.analytics.reassessmentDue,
          averageWaitMinutes: context.analytics.averageWaitMinutes,
          capacityBand: context.capacity.band,
          inboundEms: context.inboundEms.length,
          queueCounts: context.queues,
          criticalAlerts: context.alerts.filter((alert) => alert.severity === 'Critical').length,
        });

      case 'shift-summary':
        return envelope('Shift Summary Snapshot', surfaceId, {
          activeCensus: context.analytics.activeCensus,
          averageWaitMinutes: context.analytics.averageWaitMinutes,
          boarding: context.analytics.boarding,
          reassessmentDue: context.analytics.reassessmentDue,
          referralsOpen: context.referrals.filter((ref) => ref.status !== 'Completed').length,
          workflowActions: context.workflowLogs.slice(0, 25),
          capacity: context.capacity,
        });

      case 'diagnostics': {
        const pendingOrders = context.activePatients.filter(
          (patient) =>
            Array.isArray(patient.flags) &&
            patient.flags.some((flag) =>
              ['LabPending', 'ImagingPending', 'EcgPending'].includes(String(flag)),
            ),
        );
        const orchestration =
          await this.workflowOrchestrationService.getWorkflowOrchestration(tenant);
        return envelope('Diagnostics Board Snapshot', surfaceId, {
          pendingOrderPatients: pendingOrders.length,
          highRiskPatients: context.analytics.highRisk,
          workflowTasks: orchestration.data?.tasks?.slice(0, 12) || [],
          queuePressure: context.queues,
        });
      }

      case 'handoffs': {
        const orchestration =
          await this.workflowOrchestrationService.getWorkflowOrchestration(tenant);
        return envelope('Handoffs Board Snapshot', surfaceId, {
          emsHandoffsPending: context.inboundEms.filter((a) => a.status !== 'Offload').length,
          referralsOpen: context.referrals.filter((ref) => ref.status !== 'Completed').length,
          boarding: context.analytics.boarding,
          workflowTasks: orchestration.data?.tasks?.slice(0, 12) || [],
          recentLogs: context.workflowLogs.slice(0, 15),
        });
      }

      case 'reports':
        return envelope('Operational Reports Snapshot', surfaceId, {
          analytics: context.analytics,
          workflowLogCount: context.workflowLogs.length,
          complianceBreaches: context.alerts.filter((alert) =>
            /three.?minute|breach/i.test(`${alert.title} ${alert.message}`),
          ).length,
          capacityBand: context.capacity.band,
          referralsCompleted: context.referrals.filter((ref) => ref.status === 'Completed').length,
        });

      case 'ed-readiness':
        return envelope('ED Readiness Snapshot', surfaceId, {
          inboundEms: context.inboundEms.length,
          criticalInbound: context.inboundEms.filter(
            (a) => String((a as { severity?: string }).severity || '') === 'Critical',
          ).length,
          capacityBand: context.capacity.band,
          roomsAvailable: Math.max(
            0,
            Number(context.capacity.totalRooms || 0) - Number(context.capacity.occupiedRooms || 0),
          ),
          staffOnDuty: this.patientService.listStaff().length,
          readinessChecks: [
            {
              id: 'ems-surge',
              label: 'EMS surge watch',
              status: context.inboundEms.length >= 3 ? 'attention' : 'ready',
            },
            {
              id: 'capacity',
              label: 'Capacity headroom',
              status: context.capacity.band === 'Red' ? 'attention' : 'ready',
            },
            {
              id: 'alerts',
              label: 'Critical alerts',
              status: context.alerts.some((a) => a.severity === 'Critical') ? 'attention' : 'ready',
            },
          ],
        });

      case 'command-center': {
        const criticalAlerts = context.alerts.filter((alert) => alert.severity === 'Critical');
        const complianceBreaches = context.alerts.filter((alert) =>
          /three.?minute|breach/i.test(`${alert.title} ${alert.message}`),
        );
        const staff = this.patientService.listStaff();
        return envelope('Hospital Command Center Snapshot', surfaceId, {
          activeCensus: context.analytics.activeCensus,
          waiting: context.analytics.waiting,
          highRisk: context.analytics.highRisk,
          boarding: context.analytics.boarding,
          averageWaitMinutes: context.analytics.averageWaitMinutes,
          capacityBand: context.capacity.band,
          inboundEms: context.inboundEms.length,
          criticalAlerts: criticalAlerts.length,
          unresolvedAlerts: criticalAlerts.filter((alert) => !alert.dismissed).length,
          threeMinuteBreaches: complianceBreaches.length,
          doctorsOnDuty: staff.filter((member) =>
            /physician|doctor|attending/i.test(String(member.role || '')),
          ).length,
          nursesOnDuty: staff.filter((member) => /nurse/i.test(String(member.role || ''))).length,
          queueCounts: context.queues,
          workflowLogCount: context.workflowLogs.length,
        });
      }

      case 'alerts': {
        const criticalAlerts = context.alerts.filter((alert) => alert.severity === 'Critical');
        const warningAlerts = context.alerts.filter((alert) => alert.severity === 'Warning');
        return envelope('Clinical Alerts Snapshot', surfaceId, {
          totalAlerts: context.alerts.length,
          criticalAlerts: criticalAlerts.length,
          warningAlerts: warningAlerts.length,
          unresolvedCritical: criticalAlerts.filter((alert) => !alert.dismissed).length,
          threeMinuteBreaches: context.alerts.filter((alert) =>
            /three.?minute|breach/i.test(`${alert.title} ${alert.message}`),
          ).length,
          recentAlerts: context.alerts.slice(0, 20),
        });
      }

      case 'whiteboard':
        return envelope('Emergency Whiteboard Snapshot', surfaceId, {
          activePatients: context.activePatients.length,
          waiting: context.analytics.waiting,
          highRisk: context.analytics.highRisk,
          boarding: context.analytics.boarding,
          capacityBand: context.capacity.band,
          queueCounts: context.queues,
          inboundEms: context.inboundEms.length,
          criticalAlerts: context.alerts.filter((alert) => alert.severity === 'Critical').length,
        });

      default:
        return envelope('Unknown surface', surfaceId, { supported: false });
    }
  }
}
