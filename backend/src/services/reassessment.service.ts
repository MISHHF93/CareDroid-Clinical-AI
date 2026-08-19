import { Injectable } from '@nestjs/common';
import {
  UnifiedPatient as Patient,
  type IUnifiedPatient as IPatient,
} from '../models/unified-patient.model';

/**
 * KNOWN DUPLICATE, NOT CANONICAL (found 2026-08-12, repo-wide export-collision audit): the real
 * frontend consumer (ReassessmentEngine.ts / the reassessment-due UI) reads
 * `GET /emergency/reassessment`, served by the OTHER `ReassessmentService` in
 * `modules/emergency-os/emergency-os.services.ts` (TypeORM-backed, against
 * `EmergencyPatientService`). This class is Mongoose-backed against a separate `UnifiedPatient`
 * model -- kept mounted via `ReassessmentModule` in AppModule but not the path real traffic
 * takes. See docs/architecture/CARE_DROID_MASTER_BACKLOG.md for the full finding.
 */
@Injectable()
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

  // HEAL-347.54: this class is the non-canonical duplicate (see the class
  // doc comment above), but its GET /emergency/reassessment/due controller
  // route is still live and mounted, gated only by READ_PHI -- not by
  // tenant. Before this fix it returned every organization's overdue
  // patients to any authenticated user holding that one permission,
  // regardless of which hospital they belonged to -- the same class of gap
  // HEAL-343/347.4-8 already closed on the canonical TypeORM path, and that
  // HEAL-347.49 just closed on this model's OTHER live write path
  // (surge-capacity's batchEMSIntake). Same own-org-or-legacy-null
  // convention as HEAL-347.49/mpi.service.ts: omitting organizationId keeps
  // every existing internal caller (the cron below included) unchanged.
  async getPatientsNeedingReassessment(organizationId?: string | null): Promise<IPatient[]> {
    const now = new Date();
    const dueClause = {
      $or: [
        { next_reassessment_due: { $lte: now } },
        {
          dps_score: { $in: [1, 2] },
          last_reassessment: { $lt: new Date(now.getTime() - 30 * 60000) },
        },
      ],
    };
    // A sibling `$or` key here would silently overwrite dueClause's own
    // `$or` (later key wins in a JS object literal) -- combine the two
    // independent $or clauses via $and instead of spreading them into one
    // object. Mongoose's generated FilterQuery type can't cleanly infer
    // through this nested $and/$or shape (isn't exported the same way
    // across mongoose versions either) -- cast at the one call site rather
    // than fighting the generic; the shape itself is covered by the
    // dedicated query-shape test in reassessment.service.spec.ts.
    const orgClause = organizationId
      ? { $or: [{ organizationId }, { organizationId: null }] }
      : null;
    return Patient.find({
      current_state: { $nin: ['DISCHARGE', 'ADMISSION'] },
      $and: orgClause ? [dueClause, orgClause] : [dueClause],
    } as Record<string, unknown>);
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
        // HEAL-254: same gap already found and fixed elsewhere in this
        // codebase (vitalsAlertPipeline.ts HEAL-237, deterioration-
        // prediction-v3.service.ts HEAL-253) -- a hypertensive-emergency
        // reading previously triggered no reassessment alert at all,
        // however extreme.
        if (systolic > 200) patient.alerts.push('Hypertensive crisis >200 - reassessment completed');
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
