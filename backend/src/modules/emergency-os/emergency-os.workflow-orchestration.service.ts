import { Injectable, Optional } from '@nestjs/common';
import type { ReviewAdministrativeAutomationInput } from '../../../../src/types/administrativeAutomation';
import type {
  AdministrativeAutomationSnapshot,
  AdministrativeAutomationTask,
} from '../../../../src/types/administrativeAutomation';
import type { Alert, EMSArrival, Patient, Referral, Staff } from '../../../../src/types/emergency';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import type { EmergencyModuleEnvelope } from './emergency-os.types';
import type { TenantContext } from '../tenant-context/tenant-context.types';
import {
  buildBackendEnrichedAdministrativeAutomationSnapshot,
  resolveBackendTenantScope,
  reviewBackendAdministrativeAutomationWithExecution,
  type AutomationEngineRuntimeContext,
} from './administrative-automation-orchestration.lib';
import { AdministrativeAutomationQueueService } from './administrative-automation-queue.service';
import {
  EMSIntakeService,
  EmergencyPatientService,
  ReferralService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import { OperationalIntelligenceService } from './emergency-os.operational-intelligence.service';

function envelope<T>(data: T, remainingGaps: string[] = []): EmergencyModuleEnvelope<T> {
  return {
    module: 'workflow-orchestration',
    generatedAt: new Date().toISOString(),
    source: 'backend-fixture',
    status: remainingGaps.length ? 'placeholder' : 'active',
    data,
    remainingGaps,
  };
}

@Injectable()
export class WorkflowOrchestrationService {
  private readonly fallbackQueues = new Map<string, AdministrativeAutomationTask[]>();

  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly referralService: ReferralService,
    private readonly emsIntakeService: EMSIntakeService,
    private readonly workflowLogService: WorkflowActionLogService,
    @Optional() private readonly platformAssetsService?: PlatformAssetsService,
    @Optional() private readonly queueService?: AdministrativeAutomationQueueService,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
    @Optional() private readonly operationalIntelligenceService?: OperationalIntelligenceService,
  ) {}

  private operationalContext() {
    const patients = this.patientService.listPatients() as unknown as Patient[];
    const referrals =
      (this.referralService.getReferrals().data.referrals as unknown as Referral[]) || [];
    const staff = this.patientService.listStaff() as unknown as Staff[];
    const capacity = this.patientService.computeCapacity();
    const alerts = this.patientService.listAlerts() as unknown as Alert[];
    const emsPayload = this.emsIntakeService.getEMSIntake().data as unknown as {
      emsArrivals?: EMSArrival[];
    };
    const emsArrivals = (emsPayload.emsArrivals || []) as EMSArrival[];
    return { patients, referrals, staff, capacity, alerts, emsArrivals };
  }

  private queueKey(organizationId: string, workspaceId: string) {
    return `${organizationId}::${workspaceId}`;
  }

  private async resolveEntitlementContext(
    tenant?: TenantContext,
  ): Promise<AutomationEngineRuntimeContext> {
    if (!this.platformAssetsService || !tenant?.organizationId) {
      return { strictEntitlements: false };
    }

    const entitledAssetIds = await this.platformAssetsService.resolveEntitledAssetIds({
      organizationId: tenant.organizationId,
    });

    return {
      entitledAssetIds,
      strictEntitlements: this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
      subscriptionTier: String(tenant.subscriptionPlan || 'professional'),
      workspaceId: tenant.workspaceId,
      tenant: {
        id: tenant.organizationId,
        name: tenant.organizationName,
      },
    };
  }

  private async loadExistingTasks(
    organizationId: string,
    workspaceId: string,
  ): Promise<AdministrativeAutomationTask[]> {
    const key = this.queueKey(organizationId, workspaceId);
    if (!this.queueService) return [...(this.fallbackQueues.get(key) || [])];
    try {
      const persisted = await this.queueService.listActiveTasks(organizationId, workspaceId);
      if (persisted.length) return persisted;
    } catch {
      // Fall back to in-memory queue when persistence is unavailable.
    }
    return [...(this.fallbackQueues.get(key) || [])];
  }

  private async persistTasks(
    organizationId: string,
    workspaceId: string,
    tasks: AdministrativeAutomationTask[],
  ) {
    const key = this.queueKey(organizationId, workspaceId);
    this.fallbackQueues.set(key, [...tasks]);
    if (!this.queueService) return;
    try {
      await this.queueService.replaceSnapshot(organizationId, workspaceId, tasks);
    } catch {
      // In-memory fallback remains authoritative for this request.
    }
  }

  private async buildSnapshot(
    existingTasks: readonly AdministrativeAutomationTask[],
    tenant?: TenantContext,
  ): Promise<AdministrativeAutomationSnapshot> {
    const entitlementContext = await this.resolveEntitlementContext(tenant);
    return buildBackendEnrichedAdministrativeAutomationSnapshot({
      ...this.operationalContext(),
      existingTasks,
      entitlementContext,
      tenant,
    });
  }

  async getWorkflowOrchestration(tenant?: TenantContext) {
    const { organizationId, workspaceId } = resolveBackendTenantScope(tenant);
    const existingTasks = await this.loadExistingTasks(organizationId, workspaceId);
    const snapshot = await this.buildSnapshot(existingTasks, tenant);
    await this.persistTasks(organizationId, workspaceId, [...snapshot.tasks]);
    this.publish(snapshot, tenant);
    return envelope({
      snapshot,
      tasks: snapshot.tasks,
      metrics: snapshot.metrics,
      tenant: { organizationId, workspaceId },
    });
  }

  async reviewTask(input: ReviewAdministrativeAutomationInput, tenant?: TenantContext) {
    const { organizationId, workspaceId } = resolveBackendTenantScope(tenant);
    const existingTasks = await this.loadExistingTasks(organizationId, workspaceId);
    const reviewResult = reviewBackendAdministrativeAutomationWithExecution(
      existingTasks,
      input,
      this.patientService,
      this.workflowLogService,
      tenant,
    );
    const snapshot = await this.buildSnapshot(reviewResult.tasks, tenant);
    await this.persistTasks(organizationId, workspaceId, [...snapshot.tasks]);
    this.publish(snapshot, tenant);
    return envelope({
      task: reviewResult.task,
      execution: reviewResult.execution,
      snapshot,
      tenant: { organizationId, workspaceId },
    });
  }

  private publish(snapshot: AdministrativeAutomationSnapshot, tenant?: TenantContext) {
    const scope = resolveBackendTenantScope(tenant);
    this.realtimeService?.publish({
      type: 'workflow_orchestration_updated',
      payload: {
        snapshot,
        tasks: snapshot.tasks,
        tenant: scope,
      },
    });
    this.operationalIntelligenceService?.publishRealtimeSignals('workflow_orchestration_updated');
  }
}
