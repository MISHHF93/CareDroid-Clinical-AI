import { Injectable, Optional } from '@nestjs/common';
import type { ReviewAdministrativeAutomationInput } from '../../../../src/types/administrativeAutomation';
import type { AdministrativeAutomationTask } from '../../../../src/types/administrativeAutomation';
import type { Alert, Patient, Referral, Staff } from '../../../../src/types/emergency';
import { EmergencyPatientService, ReferralService } from './emergency-os.services';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import {
  buildBackendAdministrativeAutomationSnapshot,
  reviewBackendAdministrativeAutomationTask,
} from './emergency-os.flow-snapshots';

function envelope<T>(title: string, data: T) {
  return {
    success: true,
    title,
    generatedAt: new Date().toISOString(),
    data,
  };
}

@Injectable()
export class WorkflowOrchestrationService {
  private taskQueue: AdministrativeAutomationTask[] = [];

  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly referralService: ReferralService,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
  ) {}

  private context() {
    const patients = this.patientService.listPatients() as unknown as Patient[];
    const referrals =
      (this.referralService.getReferrals().data.referrals as unknown as Referral[]) || [];
    const staff = this.patientService.listStaff() as unknown as Staff[];
    const capacity = this.patientService.computeCapacity();
    return { patients, referrals, staff, capacity, alerts: [] as Alert[] };
  }

  getWorkflowOrchestration() {
    const snapshot = buildBackendAdministrativeAutomationSnapshot({
      ...this.context(),
      existingTasks: this.taskQueue,
    });
    this.taskQueue = [...snapshot.tasks];
    this.publish(snapshot);
    return envelope('Unified Clinical Workflow Orchestrator', {
      snapshot,
      tasks: snapshot.tasks,
      metrics: snapshot.metrics,
    });
  }

  reviewTask(input: ReviewAdministrativeAutomationInput) {
    const result = reviewBackendAdministrativeAutomationTask(this.taskQueue, input);
    this.taskQueue = result.tasks;
    const snapshot = buildBackendAdministrativeAutomationSnapshot({
      ...this.context(),
      existingTasks: this.taskQueue,
    });
    this.publish(snapshot);
    return envelope('Automation review recorded', {
      task: result.task,
      snapshot,
    });
  }

  private publish(snapshot: ReturnType<typeof buildBackendAdministrativeAutomationSnapshot>) {
    this.realtimeService?.publish({
      type: 'workflow_orchestration_updated',
      payload: { snapshot, tasks: snapshot.tasks },
    });
  }
}