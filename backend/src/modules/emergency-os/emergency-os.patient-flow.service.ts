import { Injectable, Optional } from '@nestjs/common';
import type { Patient, Referral, Staff } from '../../../../src/types/emergency';
import { EmergencyPatientService, ReferralService } from './emergency-os.services';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import { OperationalIntelligenceService } from './emergency-os.operational-intelligence.service';
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
    @Optional() private readonly operationalIntelligenceService?: OperationalIntelligenceService,
  ) {}

  // HEAL-347.91: listPatients()/getReferrals() were called with no organizationId
  // at all -- this service's own REST endpoints (GET /emergency-os/patient-flow[/:id])
  // and its realtime broadcast both returned every org's full patient roster
  // (names, chief complaints, detections, AI recommendations), found while
  // auditing the same gap class in the /emergency/realtime SSE stream.
  private buildSnapshot(patientId?: string, organizationId?: string): BackendPatientFlowSnapshot {
    const patients = this.patientService.listPatients(organizationId) as unknown as Patient[];
    const referrals =
      (this.referralService.getReferrals(organizationId).data.referrals as unknown as Referral[]) ||
      [];
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
      detections: Object.freeze(
        snapshot.detections.filter((entry) => entry.patientId === patientId),
      ),
      aiRecommendations: Object.freeze(
        snapshot.aiRecommendations.filter((entry) => entry.patientId === patientId),
      ),
    });
  }

  getPatientFlow(patientId?: string, organizationId?: string) {
    const snapshot = this.buildSnapshot(patientId, organizationId);
    this.realtimeService?.publish(
      {
        type: 'patient_flow_updated',
        payload: { patientFlowSnapshot: snapshot, patientId: patientId || null },
      },
      organizationId,
    );
    this.operationalIntelligenceService?.publishRealtimeSignals('patient_flow_updated');
    return envelope('Continuous Patient Flow Engine', {
      patientId: patientId || null,
      patientFlowSnapshot: snapshot,
      metrics: snapshot.metrics,
      detections: snapshot.detections,
      aiRecommendations: snapshot.aiRecommendations,
    });
  }
}
