import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import { UnifiedPatient as Patient } from '../models/unified-patient.model';

export interface SurgeResourceStatus {
  traumaBedsAvailable: number;
  traumaBedsTotal: number;
  surgeonsAvailable: number;
  surgeonsTotal: number;
  anaesthetistsAvailable: number;
  anaesthetistsTotal: number;
  bloodUnitsAvailable: number;
  bloodUnitsTotal: number;
  ventilatorsAvailable: number;
  ventilatorsTotal: number;
}

export interface SurgeEvent {
  id: string;
  type: 'mci' | 'disaster' | 'local_surge';
  estimatedPatientCount: number;
  actualPatientCount: number;
  activationTime: Date;
  deactivationTime?: Date;
  status: 'activated' | 'deactivated';
  resourceStatus: SurgeResourceStatus;
  communicationLog: Array<{
    timestamp: Date;
    message: string;
    recipient: string;
  }>;
}

export interface BatchEMSPatient {
  patientId?: string;
  temporaryId: string;
  age?: string;
  sex?: string;
  chiefComplaint: string;
  triageColor: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
  etaMinutes: number;
  mechanismOfInjury: string;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    gcs?: number;
  };
}

type SurgeEventInput = Omit<SurgeEvent, 'id' | 'activationTime' | 'status' | 'communicationLog'>;
type DepletableResource =
  | 'surgeonsAvailable'
  | 'anaesthetistsAvailable'
  | 'bloodUnitsAvailable'
  | 'ventilatorsAvailable';

const totalKeyByResource: Record<DepletableResource, keyof SurgeResourceStatus> = {
  surgeonsAvailable: 'surgeonsTotal',
  anaesthetistsAvailable: 'anaesthetistsTotal',
  bloodUnitsAvailable: 'bloodUnitsTotal',
  ventilatorsAvailable: 'ventilatorsTotal',
};

function getMongoDb() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Mongoose database is not connected');
  }
  return db;
}

@Injectable()
export class SurgeCapacityService extends EventEmitter {
  private activeSurgeEvent: SurgeEvent | null = null;

  /**
   * Activate surge mode for mass casualty incident.
   * Based on surge testing literature where early estimated patient count drives resource recall.
   */
  async activateSurgeMode(event: SurgeEventInput): Promise<SurgeEvent> {
    const surgeEvent: SurgeEvent = {
      id: `surge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...event,
      actualPatientCount: event.actualPatientCount ?? 0,
      activationTime: new Date(),
      status: 'activated',
      communicationLog: [
        {
          timestamp: new Date(),
          message: `SURGE ACTIVATED: ${event.type.toUpperCase()} - Estimated ${event.estimatedPatientCount} patients`,
          recipient: 'all_staff',
        },
      ],
    };

    this.activeSurgeEvent = surgeEvent;
    await this.saveSurgeEvent(surgeEvent);
    this.emit('surge_activated', surgeEvent);
    await this.reallocateResources(surgeEvent);
    await this.createSurgeAuditTrail(surgeEvent);

    return surgeEvent;
  }

  /**
   * Batch EMS intake for multiple patients during MCI.
   */
  async batchEMSIntake(
    patients: BatchEMSPatient[],
    surgeEventId: string,
    organizationId?: string,
  ): Promise<BatchEMSPatient[]> {
    const surgeEvent = await this.getSurgeEvent(surgeEventId);
    if (!surgeEvent || surgeEvent.status !== 'activated') {
      throw new Error('No active surge event. Activate surge mode first.');
    }

    // HEAL-232: previously read surgeEvent.actualPatientCount once into
    // memory, computed each patientNumber locally, then overwrote the
    // *whole* surge_events document with a full $set at the end. Two
    // concurrent batch intakes for the same surgeEventId (the realistic
    // scenario this endpoint exists for -- multiple EMS crews/intake
    // staff submitting during an active MCI) read the same starting
    // count, so both assigned DUPLICATE mciPatientNumber values to
    // different patients, and whichever request's full-document $set
    // landed last silently clobbered the other's actualPatientCount
    // increment (and any other concurrent field change) -- a lost
    // update. findOneAndUpdate's $inc is atomic at the DB level, so each
    // concurrent request reserves a disjoint number range no matter how
    // requests interleave.
    const reserved = await getMongoDb()
      .collection('surge_events')
      .findOneAndUpdate(
        { id: surgeEventId },
        { $inc: { actualPatientCount: patients.length } },
        { returnDocument: 'before' },
      );
    const startingPatientCount =
      (reserved as { actualPatientCount?: number } | null)?.actualPatientCount ??
      surgeEvent.actualPatientCount;

    const createdPatients: BatchEMSPatient[] = [];

    for (const patient of patients) {
      const patientNumber = startingPatientCount + createdPatients.length + 1;
      const newPatient = await Patient.create({
        // HEAL-347.49: the highest-priority instance of the Mongoose Patient
        // model's tenant-scoping gap -- this is a LIVE, frontend-reachable
        // MCI batch-intake write path (surgeApi.ts -> SurgeController ->
        // here) with zero organizationId anywhere before this fix. Same
        // nullable/optional-param convention as the TypeORM side (HEAL-343).
        organizationId: organizationId ?? null,
        name: `MCI-${surgeEventId}-${patient.temporaryId}`,
        age: patient.age || 'Unknown',
        sex: patient.sex || null,
        chief_complaint: patient.chiefComplaint,
        mciBatchId: surgeEventId,
        mciPatientNumber: patientNumber,
        surgeActivationId: surgeEventId,
        triageColor: patient.triageColor,
        fieldTriageTime: new Date(),
        current_state: 'EMS_EN_ROUTE',
        state_history: [{ state: 'EMS_EN_ROUTE', timestamp: new Date() }],
        ems_status: 'en_route',
        eta_minutes: patient.etaMinutes,
        vitals: {
          hr: patient.vitalSigns?.heartRate,
          bp: patient.vitalSigns?.bloodPressure,
          o2: patient.vitalSigns?.oxygenSaturation,
          rr: patient.vitalSigns?.respiratoryRate,
        },
        alerts: [`MCI Patient - Mechanism: ${patient.mechanismOfInjury}`],
        lastModifiedBy: 'surge-capacity-service',
        modifiedAt: new Date(),
      });

      createdPatients.push({
        ...patient,
        patientId: String(newPatient._id),
      });
    }

    // actualPatientCount was already incremented atomically above; a
    // trailing full-document $set here would overwrite it with the
    // stale pre-increment value captured in the outer `surgeEvent`
    // snapshot, undoing the atomic reservation.
    this.emit('batch_ems_intake', {
      surgeEventId,
      patientCount: createdPatients.length,
      triageBreakdown: this.getTriageBreakdown(createdPatients),
    });

    return createdPatients;
  }

  async assessResourceBottlenecks(): Promise<{
    criticalResources: string[];
    estimatedTimeToDepletion: Record<string, number>;
    recommendations: string[];
  }> {
    const surgeEvent = this.activeSurgeEvent || (await this.getLatestActiveSurgeEvent());
    if (!surgeEvent) {
      return { criticalResources: [], estimatedTimeToDepletion: {}, recommendations: [] };
    }

    const bottlenecks: string[] = [];
    const estimatedTimeToDepletion: Record<string, number> = {};
    const recommendations: string[] = [];

    const surgeonUtilization =
      1 -
      surgeEvent.resourceStatus.surgeonsAvailable /
        Math.max(surgeEvent.resourceStatus.surgeonsTotal, 1);
    if (surgeonUtilization > 0.8) {
      bottlenecks.push('surgeons');
      estimatedTimeToDepletion.surgeons = this.estimateResourceDepletion(
        surgeEvent,
        'surgeonsAvailable',
      );
      recommendations.push(
        'Activate surgeon recall protocol. Contact on-call surgeons immediately.',
      );
    }

    const anaesthetistUtilization =
      1 -
      surgeEvent.resourceStatus.anaesthetistsAvailable /
        Math.max(surgeEvent.resourceStatus.anaesthetistsTotal, 1);
    if (anaesthetistUtilization > 0.8) {
      bottlenecks.push('anaesthetists');
      estimatedTimeToDepletion.anaesthetists = this.estimateResourceDepletion(
        surgeEvent,
        'anaesthetistsAvailable',
      );
      recommendations.push('Request anaesthetist backup from other departments.');
    }

    const bloodUtilization =
      1 -
      surgeEvent.resourceStatus.bloodUnitsAvailable /
        Math.max(surgeEvent.resourceStatus.bloodUnitsTotal, 1);
    if (bloodUtilization > 0.7) {
      bottlenecks.push('blood_units');
      estimatedTimeToDepletion.blood_units = this.estimateResourceDepletion(
        surgeEvent,
        'bloodUnitsAvailable',
      );
      recommendations.push(
        'Request blood supply from regional blood bank. Consider O-negative protocol.',
      );
    }

    const ventilatorUtilization =
      1 -
      surgeEvent.resourceStatus.ventilatorsAvailable /
        Math.max(surgeEvent.resourceStatus.ventilatorsTotal, 1);
    if (ventilatorUtilization > 0.8) {
      bottlenecks.push('ventilators');
      estimatedTimeToDepletion.ventilators = this.estimateResourceDepletion(
        surgeEvent,
        'ventilatorsAvailable',
      );
      recommendations.push('Prepare for manual ventilation if ventilator shortage occurs.');
    }

    return { criticalResources: bottlenecks, estimatedTimeToDepletion, recommendations };
  }

  async deactivateSurgeMode(
    surgeEventId: string,
    debriefNotes: string,
  ): Promise<SurgeEvent | null> {
    const surgeEvent = await this.getSurgeEvent(surgeEventId);
    if (!surgeEvent) return null;

    surgeEvent.status = 'deactivated';
    surgeEvent.deactivationTime = new Date();
    surgeEvent.communicationLog.push({
      timestamp: new Date(),
      message: `SURGE DEACTIVATED. Debrief: ${debriefNotes}`,
      recipient: 'all_staff',
    });

    await this.updateSurgeEvent(surgeEvent);
    this.emit('surge_deactivated', surgeEvent);
    this.activeSurgeEvent = null;
    await this.generatePostEventReport(surgeEvent);

    return surgeEvent;
  }

  async getCurrentSurgeStatus(): Promise<{
    active: boolean;
    surgeEvent?: SurgeEvent;
    bottlenecks?: Awaited<ReturnType<SurgeCapacityService['assessResourceBottlenecks']>>;
  }> {
    const surgeEvent = this.activeSurgeEvent || (await this.getLatestActiveSurgeEvent());
    if (!surgeEvent) return { active: false };

    this.activeSurgeEvent = surgeEvent;
    return {
      active: true,
      surgeEvent,
      bottlenecks: await this.assessResourceBottlenecks(),
    };
  }

  private async saveSurgeEvent(event: SurgeEvent): Promise<void> {
    await getMongoDb().collection('surge_events').insertOne(event);
  }

  private async getSurgeEvent(id: string): Promise<SurgeEvent | null> {
    return (await getMongoDb()
      .collection('surge_events')
      .findOne({ id })) as unknown as SurgeEvent | null;
  }

  private async getLatestActiveSurgeEvent(): Promise<SurgeEvent | null> {
    return (await getMongoDb()
      .collection('surge_events')
      .findOne(
        { status: 'activated' },
        { sort: { activationTime: -1 } },
      )) as unknown as SurgeEvent | null;
  }

  private async updateSurgeEvent(event: SurgeEvent): Promise<void> {
    await getMongoDb().collection('surge_events').updateOne({ id: event.id }, { $set: event });
  }

  private async reallocateResources(event: SurgeEvent): Promise<void> {
    await getMongoDb().collection('protocol_audit').insertOne({
      eventType: 'surge_resource_reallocation_recommended',
      surgeEventId: event.id,
      triggeredAt: new Date(),
      resourceStatus: event.resourceStatus,
    });
  }

  private async createSurgeAuditTrail(event: SurgeEvent): Promise<void> {
    await getMongoDb().collection('protocol_audit').insertOne({
      eventType: 'surge_activated',
      surgeEventId: event.id,
      protocolId: 'surge-capacity',
      triggeredAt: event.activationTime,
      payload: event,
    });
  }

  private async generatePostEventReport(event: SurgeEvent): Promise<void> {
    await getMongoDb()
      .collection('protocol_audit')
      .insertOne({
        eventType: 'surge_deactivated',
        surgeEventId: event.id,
        protocolId: 'surge-capacity',
        triggeredAt: event.deactivationTime || new Date(),
        payload: event,
      });
  }

  private getTriageBreakdown(patients: BatchEMSPatient[]): Record<string, number> {
    return patients.reduce(
      (acc, patient) => {
        acc[patient.triageColor] = (acc[patient.triageColor] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private estimateResourceDepletion(event: SurgeEvent, resource: DepletableResource): number {
    const remaining = event.resourceStatus[resource];
    const total = event.resourceStatus[totalKeyByResource[resource]];
    const utilizationRate = 1 - remaining / Math.max(total, 1);
    const estimatedPatientsRemaining = Math.max(
      event.estimatedPatientCount - event.actualPatientCount,
      0,
    );
    const consumptionRate = utilizationRate / Math.max(event.actualPatientCount, 1);

    return Math.max(0, Math.floor(estimatedPatientsRemaining * consumptionRate * 30));
  }
}

export const surgeCapacityService = new SurgeCapacityService();
