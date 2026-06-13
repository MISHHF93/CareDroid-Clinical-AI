import {
  UnifiedPatient as Patient,
  type IUnifiedPatient as IPatient,
} from '../models/unified-patient.model';

export class ReassessmentService {
  getReassessmentDueMinutes(dpsScore: number): number {
    const schedule: Record<number, number> = {
      1: 5, // Continuous, but minimum 5 min check
      2: 15,
      3: 60,
      4: 120,
      5: 999999, // Before discharge only
    };
    return schedule[dpsScore] || 120;
  }

  async calculateNextDueDate(patient: IPatient): Promise<Date> {
    const minutesDue = this.getReassessmentDueMinutes(patient.dps_score);
    if (minutesDue === 999999) {
      return new Date(8640000000000000); // Far future
    }
    return new Date(Date.now() + minutesDue * 60000);
  }

  async getPatientsNeedingReassessment(): Promise<IPatient[]> {
    const now = new Date();
    return Patient.find({
      current_state: { $nin: ['DISCHARGE', 'ADMISSION'] },
      $or: [
        { next_reassessment_due: { $lte: now } },
        {
          dps_score: { $in: [1, 2] },
          last_reassessment: { $lt: new Date(now.getTime() - 30 * 60000) },
        },
      ],
    });
  }

  async reassessPatient(
    patientId: string,
    newDpsScore: number | null,
    notes: string,
    _findings: unknown,
    clinician: string,
  ): Promise<IPatient> {
    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error('Patient not found');

    const oldDpsScore = patient.dps_score;
    const finalDpsScore = newDpsScore !== null ? newDpsScore : oldDpsScore;
    if (!this.isValidDpsScore(finalDpsScore)) {
      throw new Error('new_dps_score must be 1, 2, 3, 4, 5, or null');
    }

    // Add to history
    patient.reassessment_history.push({
      score: finalDpsScore,
      reason: notes,
      clinician,
      timestamp: new Date(),
    });

    // Update DPS if changed
    if (newDpsScore !== null && newDpsScore !== oldDpsScore) {
      patient.dps_score = finalDpsScore;
      patient.alerts.push(`DPS changed from ${oldDpsScore} to ${newDpsScore} by ${clinician}`);
    }

    patient.last_reassessment = new Date();
    patient.next_reassessment_due = await this.calculateNextDueDate(patient);

    // Check for abnormal vitals trigger
    if (patient.vitals) {
      const { hr, bp, o2, rr } = patient.vitals;
      if (hr && hr > 120) patient.alerts.push('Tachycardia >120 - reassessment completed');
      if (o2 && o2 < 92) patient.alerts.push('Hypoxia O2 <92% - reassessment completed');
      if (rr && rr > 24) patient.alerts.push('Tachypnea >24 - reassessment completed');
      if (bp) {
        const [systolic] = bp.split('/').map(Number);
        if (systolic < 90) patient.alerts.push('Hypotension <90 - reassessment completed');
      }
    }

    await patient.save();
    return patient;
  }

  async dismissReassessment(
    patientId: string,
    reason: string,
    clinician: string,
  ): Promise<IPatient> {
    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error('Patient not found');

    const validReasons = ['transferred', 'discharged', 'clinical_decision', 'already_assessed'];
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid dismissal reason. Must be one of: ${validReasons.join(', ')}`);
    }

    patient.next_reassessment_due = await this.calculateNextDueDate(patient);
    patient.alerts.push(`Reassessment dismissed by ${clinician}: ${reason}`);
    await patient.save();
    return patient;
  }

  private isValidDpsScore(score: number): score is 1 | 2 | 3 | 4 | 5 {
    return [1, 2, 3, 4, 5].includes(score);
  }
}

export const reassessmentService = new ReassessmentService();
