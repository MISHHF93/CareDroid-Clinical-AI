import { Injectable, Optional } from '@nestjs/common';
import type { Patient, Referral, Staff } from '../../../../src/types/emergency';
import { EmergencyPatientService, ReferralService } from './emergency-os.services';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import {
  buildBackendPatientFlowSnapshot,
  type BackendPatientFlowSnapshot,
} from './emergency-os.flow-snapshots';

function envelope<T>(title: string, data: T) {
  return {
    module: 'patient-flow',
    success: true,
    title,
    generatedAt: new Date().toISOString(),
    source: 'backend-fixture',
    status: 'active',
    data,
  };
}

@Injectable()
export class PatientFlowService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly referralService: ReferralService,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
  ) {}

  private buildSnapshot(patientId?: string): BackendPatientFlowSnapshot {
    const patients = this.patientService.listPatients() as unknown as Patient[];
    const referrals =
      (this.referralService.getReferrals().data.referrals as unknown as Referral[]) || [];
    const staff = this.patientService.listStaff() as unknown as Staff[];
    const capacity = this.patientService.computeCapacity();
    const snapshot = buildBackendPatientFlowSnapshot({
      patients,
      staff,
      referrals,
      capacity,
    });

    if (!patientId) return snapshot;

    const patientEntry = snapshot.patients.find((entry) => entry.patientId === patientId);
    return Object.freeze({
      ...snapshot,
      patients: Object.freeze(patientEntry ? [patientEntry] : []),
      detections: Object.freeze(snapshot.detections.filter((entry) => entry.patientId === patientId)),
      aiRecommendations: Object.freeze(
        snapshot.aiRecommendations.filter((entry) => entry.patientId === patientId),
      ),
    });
  }

  getPatientFlow(patientId?: string) {
    const snapshot = this.buildSnapshot(patientId);
    this.realtimeService?.publish({
      type: 'patient_flow_updated',
      payload: { patientFlowSnapshot: snapshot, patientId: patientId || null },
    });
    return envelope('Continuous Patient Flow Engine', {
      patientId: patientId || null,
      patientFlowSnapshot: snapshot,
      metrics: snapshot.metrics,
      detections: snapshot.detections,
      aiRecommendations: snapshot.aiRecommendations,
    });
  }
}