import { Injectable, Logger } from '@nestjs/common';
import {
  UnifiedPatient as Patient,
  type IUnifiedPatient as IPatient,
} from '../models/unified-patient.model';

const logger = new Logger('DischargePredictionService');

type PatientVirtualFollowup = IPatient & {
  virtualRecheckScheduled?: boolean;
  virtualRecheckTime?: Date | string | null;
};

export interface DischargeReadiness {
  patientId: string;
  readinessScore: number;
  criteria: {
    name: string;
    met: boolean;
    confidence: number;
    /** False when this criterion has no backing clinical data yet and was never actually checked. */
    assessed: boolean;
  }[];
  estimatedDischargeTime: Date;
  recommendedAction: 'discharge_now' | 'monitor' | 'prepare_paperwork' | 'not_ready';
  barriersToDischarge: string[];
}

@Injectable()
export class DischargePredictionService {
  async calculateDischargeReadiness(patientId: string): Promise<DischargeReadiness> {
    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error('Patient not found');
    return this.scoreDischargeReadiness(patient);
  }

  // Split out so identifySameDayDischarges (which already has the patient docs from its
  // own query) doesn't re-fetch each one by id right after loading them — that was an N+1
  // on this consultant sweep's candidate loop.
  private async scoreDischargeReadiness(patient: IPatient): Promise<DischargeReadiness> {
    const patientId = String(patient._id);
    const criteria = [
      {
        name: 'Vital signs stable',
        met: await this.checkStableVitals(patient),
        confidence: 0.85,
        assessed: true,
      },
      {
        name: 'Pain controlled',
        met: await this.checkPainControl(patient),
        confidence: 0,
        assessed: false,
      },
      {
        name: 'Able to ambulate',
        met: await this.checkMobility(patient),
        confidence: 0,
        assessed: false,
      },
      {
        name: 'Tolerating oral intake',
        met: await this.checkOralIntake(patient),
        confidence: 0,
        assessed: false,
      },
      {
        name: 'Discharge criteria documented',
        met: await this.checkDischargeCriteria(patient),
        confidence: 0.9,
        assessed: true,
      },
      {
        name: 'Follow-up arranged',
        met: await this.checkFollowup(patient),
        confidence: 0.85,
        assessed: true,
      },
      {
        name: 'Medications reconciled',
        met: await this.checkMedicationReconciliation(patient),
        confidence: 0,
        assessed: false,
      },
      {
        name: 'Transport arranged',
        met: await this.checkTransport(patient),
        confidence: 0,
        assessed: false,
      },
    ];

    const readinessScore = Math.round(
      criteria.reduce((sum, criterion) => {
        return sum + (criterion.met ? (criterion.confidence * 100) / criteria.length : 0);
      }, 0),
    );

    let recommendedAction: DischargeReadiness['recommendedAction'] = 'not_ready';
    let estimatedDischargeTime = new Date(Date.now() + 4 * 60 * 60000);

    if (readinessScore >= 85) {
      recommendedAction = 'discharge_now';
      estimatedDischargeTime = new Date(Date.now() + 30 * 60000);
    } else if (readinessScore >= 70) {
      recommendedAction = 'prepare_paperwork';
      estimatedDischargeTime = new Date(Date.now() + 90 * 60000);
    } else if (readinessScore >= 50) {
      recommendedAction = 'monitor';
      estimatedDischargeTime = new Date(Date.now() + 180 * 60000);
    }

    const barriersToDischarge = criteria
      .filter((criterion) => !criterion.met)
      .map((criterion) =>
        criterion.assessed ? criterion.name : `${criterion.name} (not yet clinically assessed)`,
      );

    patient.dischargeReadinessScore = readinessScore;
    patient.modifiedAt = new Date();
    await patient.save();

    return {
      patientId,
      readinessScore,
      criteria: criteria.map((criterion) => ({
        name: criterion.name,
        met: criterion.met,
        confidence: criterion.confidence,
        assessed: criterion.assessed,
      })),
      estimatedDischargeTime,
      recommendedAction,
      barriersToDischarge,
    };
  }

  /**
   * Consultant-led midday reverse triage sweep for discharge candidates.
   *
   * HEAL-178: this now correctly returns no candidates until pain/mobility/oral-intake/
   * medication-reconciliation/transport get a real clinician-entered assessment field --
   * see scoreDischargeReadiness's checkPainControl comment. That's the safe direction for a
   * gap in the underlying data (silence, not a false recommendation).
   */
  async identifySameDayDischarges(): Promise<IPatient[]> {
    const now = new Date();
    const isMidday = now.getHours() >= 11 && now.getHours() <= 14;
    if (!isMidday) {
      logger.debug('Reverse triage sweep only runs 11am-2pm');
      return [];
    }

    const candidates = await Patient.find({
      current_state: 'DISPOSITION',
      decisionToAdmitTime: null,
      $or: [{ 'vitals.temperature': { $lte: 37.5 } }, { 'vitals.temperature': { $exists: false } }],
    });

    const readinessByPatient = await Promise.all(
      candidates.map((patient) => this.scoreDischargeReadiness(patient)),
    );

    return candidates.filter((_, index) => readinessByPatient[index].readinessScore >= 70);
  }

  async predictDischargeTime(patientId: string): Promise<Date> {
    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error('Patient not found');

    const baseTime = new Date();
    const hoursByDpsScore: Record<number, number> = { 1: 48, 2: 24, 3: 12, 4: 6, 5: 3 };
    baseTime.setHours(baseTime.getHours() + (hoursByDpsScore[patient.dps_score] || 12));

    return baseTime;
  }

  private async checkStableVitals(patient: IPatient): Promise<boolean> {
    const vitals = patient.vitals;
    if (!vitals) return false;

    const hrOk = !vitals.hr || (vitals.hr >= 60 && vitals.hr <= 100);
    const bpOk = !vitals.bp || this.parseBP(vitals.bp).systolic >= 90;
    const o2Ok = !vitals.o2 || vitals.o2 >= 92;
    const tempOk = !vitals.temperature || (vitals.temperature >= 36 && vitals.temperature <= 38);

    return hrOk && bpOk && o2Ok && tempOk;
  }

  // HEAL-178: checkPainControl/checkMobility/checkOralIntake/checkMedicationReconciliation/
  // checkTransport previously hardcoded `return true` with a confident-looking 0.6-0.95
  // "confidence" attached, so calculateDischargeReadiness silently claimed 5 of 8 readiness
  // domains were clinician-confirmed ready when none of them had ever actually been checked --
  // no mobility/oral-intake/transport/medication-reconciliation field exists anywhere on the
  // patient model, and the discharge-prediction UI has zero live callers yet
  // (src/data/frontendApiCallsInventory.ts), so nothing downstream was validating this. Treating
  // an unassessed criterion as "not yet ready" (met: false, confidence: 0, assessed: false) is
  // the safe default for a discharge-readiness score -- unlike guessing "ready", it can't
  // green-light a patient nobody actually evaluated. `vitals.painScore` IS real data that could
  // back checkPainControl, but auto-deriving "controlled" from a bare numeric cutoff (e.g. <=3/10)
  // is a clinical-policy call, not a code-correctness fix, so it's deliberately left unassessed
  // alongside the other 4 rather than guessed. A real fix wires these to actual
  // clinician-entered assessment fields once product defines them; until then this correctly
  // caps readinessScore below the discharge_now/prepare_paperwork/monitor thresholds (max ~33
  // from vitals + documented-criteria + follow-up alone) instead of a fabricated high score.
  private async checkPainControl(_patient: IPatient): Promise<boolean> {
    return false;
  }

  private async checkMobility(_patient: IPatient): Promise<boolean> {
    return false;
  }

  private async checkOralIntake(_patient: IPatient): Promise<boolean> {
    return false;
  }

  private async checkDischargeCriteria(patient: IPatient): Promise<boolean> {
    return Boolean(patient.dischargeCriteriaMet?.length);
  }

  private async checkFollowup(patient: IPatient): Promise<boolean> {
    const followup = patient as PatientVirtualFollowup;
    return Boolean(followup.virtualRecheckScheduled || followup.virtualRecheckTime);
  }

  private async checkMedicationReconciliation(_patient: IPatient): Promise<boolean> {
    return false;
  }

  private async checkTransport(_patient: IPatient): Promise<boolean> {
    return false;
  }

  private parseBP(bp: string): { systolic: number; diastolic: number } {
    const [systolic, diastolic] = bp.split('/').map((part) => Number.parseInt(part, 10) || 0);
    return { systolic, diastolic };
  }
}

export const dischargePredictionService = new DischargePredictionService();
