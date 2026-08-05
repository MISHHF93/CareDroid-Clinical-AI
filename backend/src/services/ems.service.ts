import { Injectable } from '@nestjs/common';
import {
  UnifiedPatient as Patient,
  type IUnifiedPatient as IPatient,
} from '../models/unified-patient.model';

export interface EMSAlert {
  ems_unit_id: string;
  patient: {
    unknown: boolean;
    age?: string;
    sex?: string;
    chief_complaint?: string;
  };
  vitals?: {
    hr?: number;
    bp?: string;
    o2?: number;
    rr?: number;
  };
  eta_minutes: number;
  triage_code: 'CTAS1' | 'CTAS2' | 'CTAS3' | 'CTAS4' | 'CTAS5';
  risk_flags: string[];
  notes?: string;
}

type EMSStatus = 'dispatched' | 'on_scene' | 'en_route' | 'arrived';

@Injectable()
export class EMSService {
  async createPrehospitalAlert(alert: EMSAlert): Promise<IPatient> {
    const dpsScore = this.triageToDPS(alert.triage_code);

    const patient = new Patient({
      name: alert.patient.unknown ? `Unknown Patient ${alert.ems_unit_id}` : 'Pending verification',
      age: alert.patient.age || 'Unknown',
      chief_complaint: alert.patient.chief_complaint || 'Not specified',
      ems_status: 'en_route',
      dispatch_timestamp: new Date(),
      eta_minutes: alert.eta_minutes,
      ems_unit_id: alert.ems_unit_id,
      dps_score: dpsScore,
      triage_code: alert.triage_code,
      current_state: 'EMS_EN_ROUTE',
      state_history: [{ state: 'EMS_EN_ROUTE', timestamp: new Date() }],
      vitals: alert.vitals,
      alerts: [...alert.risk_flags, ...(alert.notes ? [alert.notes] : [])],
      assigned_clinician: null,
    });

    // Calculate initial reassessment due date
    const minutesDue = this.getReassessmentDueMinutes(dpsScore);
    patient.next_reassessment_due = new Date(Date.now() + minutesDue * 60000);

    await patient.save();
    return patient;
  }

  async updateEMSStatus(
    emsUnitId: string,
    status: EMSStatus,
    etaMinutes?: number,
  ): Promise<IPatient | null> {
    const patient = await Patient.findOne({
      ems_unit_id: emsUnitId,
      ems_status: { $ne: 'arrived' },
    });
    if (!patient) return null;

    patient.ems_status = status;
    if (etaMinutes !== undefined) patient.eta_minutes = etaMinutes;

    if (status === 'dispatched') {
      patient.current_state = 'EMS_DISPATCHED';
      patient.state_history.push({ state: 'EMS_DISPATCHED', timestamp: new Date() });
    } else if (status === 'on_scene') {
      patient.current_state = 'EMS_ON_SCENE';
      patient.state_history.push({ state: 'EMS_ON_SCENE', timestamp: new Date() });
    } else if (status === 'en_route') {
      patient.current_state = 'EMS_EN_ROUTE';
      patient.state_history.push({ state: 'EMS_EN_ROUTE', timestamp: new Date() });
    } else if (status === 'arrived') {
      patient.current_state = 'ARRIVAL';
      patient.state_history.push({ state: 'ARRIVAL', timestamp: new Date() });
      patient.ems_status = 'arrived';
    }

    await patient.save();
    return patient;
  }

  async confirmArrival(
    emsUnitId: string,
    realName?: string,
    realAge?: string,
  ): Promise<IPatient | null> {
    const patient = await Patient.findOne({ ems_unit_id: emsUnitId });
    if (!patient) return null;

    if (realName && patient.name.startsWith('Unknown')) {
      patient.name = realName;
    }
    if (realAge && patient.age === 'Unknown') {
      patient.age = realAge;
    }

    patient.current_state = 'ARRIVAL';
    patient.state_history.push({ state: 'ARRIVAL', timestamp: new Date() });
    patient.ems_status = 'arrived';
    await patient.save();

    return patient;
  }

  async getIncomingEMS(): Promise<IPatient[]> {
    return Patient.find({
      ems_status: { $in: ['dispatched', 'on_scene', 'en_route'] },
      current_state: { $in: ['EMS_DISPATCHED', 'EMS_ON_SCENE', 'EMS_EN_ROUTE'] },
    }).sort({ eta_minutes: 1 });
  }

  private triageToDPS(triageCode: string): 1 | 2 | 3 | 4 | 5 {
    const map: Record<string, 1 | 2 | 3 | 4 | 5> = {
      CTAS1: 1,
      CTAS2: 2,
      CTAS3: 3,
      CTAS4: 4,
      CTAS5: 5,
    };
    return map[triageCode] || 4;
  }

  private getReassessmentDueMinutes(dpsScore: number): number {
    const schedule: Record<number, number> = { 1: 5, 2: 15, 3: 60, 4: 120, 5: 999999 };
    return schedule[dpsScore] || 120;
  }
}

export const emsService = new EMSService();
