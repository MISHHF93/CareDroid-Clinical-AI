import { Patient, IPatient } from '../models/Patient';
import { capacityService } from './capacity.service';
import { reassessmentService } from './reassessment.service';
import { emsService } from './ems.service';

interface CopilotQuery {
  query: string;
  user_role: string;
}

interface CopilotResponse {
  suggestion: string;
  data: unknown;
  requires_review: boolean;
  safety_check_passed: boolean;
  safety_message?: string;
  timestamp: Date;
}

const HUMAN_REVIEW_REQUIRED =
  'Human review required. This is not a replacement for clinical judgment.';

export class CopilotService {
  private safetyRules = {
    cannotLowerPriorityFor: [
      'DPS1',
      'DPS2',
      'abnormal_vitals',
      'stroke_protocol',
      'sepsis_protocol',
      'chest_pain_protocol',
    ],
  };

  async processQuery(query: CopilotQuery): Promise<CopilotResponse> {
    const lowerQuery = query.query.toLowerCase();

    // Route to appropriate handler
    if (lowerQuery.includes('waited longest') || lowerQuery.includes('longest wait')) {
      return this.getLongestWait(query);
    }
    if (lowerQuery.includes('reassessment') || lowerQuery.includes('needs reassessment')) {
      return this.getNeedsReassessment(query);
    }
    if (lowerQuery.includes('ems inbound') || lowerQuery.includes('incoming ems')) {
      return this.getEMSInbound(query);
    }
    if (lowerQuery.includes('capacity')) {
      return this.getCapacity(query);
    }
    if (lowerQuery.includes('bottleneck')) {
      return this.getBottleneck(query);
    }
    if (lowerQuery.includes('chest pain')) {
      return this.getChestPainWorkflow(query);
    }
    if (lowerQuery.includes('sepsis')) {
      return this.getSepsisWorkflow(query);
    }
    if (lowerQuery.includes('stroke')) {
      return this.getStrokeWorkflow(query);
    }
    if (lowerQuery.includes('move patient') || lowerQuery.includes('change priority')) {
      return this.handlePriorityChange(query);
    }

    return {
      suggestion:
        'Query not recognized. Try: "Who waited longest?", "Which patients need reassessment?", "How many EMS inbound?", "What is the bottleneck?"',
      data: null,
      requires_review: false,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async getLongestWait(_query: CopilotQuery): Promise<CopilotResponse> {
    const patients = await Patient.find({
      current_state: { $nin: ['DISCHARGE', 'ADMISSION'] },
    })
      .sort({ wait_time_minutes: -1 })
      .limit(1);

    const longest = patients[0];
    return {
      suggestion: `Patient ${longest?.name || 'N/A'} has waited ${longest?.wait_time_minutes || 0} minutes`,
      data: longest,
      requires_review: false,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async getNeedsReassessment(_query: CopilotQuery): Promise<CopilotResponse> {
    const due = await reassessmentService.getPatientsNeedingReassessment();
    return {
      suggestion: `${due.length} patients need reassessment`,
      data: due,
      requires_review: true,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async getEMSInbound(_query: CopilotQuery): Promise<CopilotResponse> {
    const incoming = await emsService.getIncomingEMS();
    return {
      suggestion: `${incoming.length} EMS units inbound`,
      data: incoming,
      requires_review: false,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async getCapacity(_query: CopilotQuery): Promise<CopilotResponse> {
    const dashboard = await capacityService.getCapacityDashboard();
    return {
      suggestion: `Current capacity is ${dashboard.color} with score ${dashboard.score}`,
      data: dashboard,
      requires_review: false,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async getBottleneck(_query: CopilotQuery): Promise<CopilotResponse> {
    const counts = {
      waiting: await Patient.countDocuments({ current_state: 'WAITING' }),
      assessment: await Patient.countDocuments({ current_state: 'ASSESSMENT' }),
      results: await Patient.countDocuments({ current_state: 'RESULTS' }),
      discharge: await Patient.countDocuments({ current_state: 'DISPOSITION' }),
    };

    let bottleneck = '';
    if (counts.waiting > 5) bottleneck = 'Waiting area - patients backed up at triage';
    else if (counts.assessment > 3) bottleneck = 'Assessment - provider capacity limited';
    else if (counts.results > 4) bottleneck = 'Results pending - lab/radiology delay';
    else if (counts.discharge > 3) bottleneck = 'Discharge - transport or paperwork delay';
    else bottleneck = 'No clear bottleneck detected';

    return {
      suggestion: bottleneck,
      data: counts,
      requires_review: false,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async getChestPainWorkflow(_query: CopilotQuery): Promise<CopilotResponse> {
    return {
      suggestion: `Chest Pain Workflow: 1) ECG within 10min, 2) Troponin, 3) Aspirin if not contraindicated, 4) Consider Cardiology consult, 5) TIMI score calculation. ${HUMAN_REVIEW_REQUIRED}`,
      data: { protocol: 'chest_pain', steps: ['ECG', 'Troponin', 'Aspirin', 'Cardiology', 'TIMI'] },
      requires_review: true,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async getSepsisWorkflow(_query: CopilotQuery): Promise<CopilotResponse> {
    return {
      suggestion: `Sepsis Workflow: 1) Lactate, 2) Blood cultures before antibiotics, 3) Broad spectrum antibiotics, 4) IVF 30ml/kg, 5) qSOFA score, 6) Consider vasopressors if hypotensive. ${HUMAN_REVIEW_REQUIRED}`,
      data: {
        protocol: 'sepsis',
        steps: ['Lactate', 'Cultures', 'Antibiotics', 'IVF', 'qSOFA', 'Vasopressors'],
      },
      requires_review: true,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async getStrokeWorkflow(_query: CopilotQuery): Promise<CopilotResponse> {
    return {
      suggestion: `Stroke Workflow: 1) Last known well time, 2) NIHSS, 3) Non-contrast CT, 4) CTA if candidate, 5) tPA if <4.5h, 6) Thrombectomy if large vessel occlusion. ${HUMAN_REVIEW_REQUIRED}`,
      data: {
        protocol: 'stroke',
        steps: ['Last known well', 'NIHSS', 'CT', 'CTA', 'tPA', 'Thrombectomy'],
      },
      requires_review: true,
      safety_check_passed: true,
      timestamp: new Date(),
    };
  }

  private async handlePriorityChange(query: CopilotQuery): Promise<CopilotResponse> {
    // Check if this is an unsafe priority change attempt
    const patientMatch = query.query.match(/patient\s+([A-Za-z0-9_-]+)/i);
    if (!patientMatch) {
      return {
        suggestion:
          'Please specify which patient. Example: "Move patient 64b... to higher priority"',
        data: null,
        requires_review: true,
        safety_check_passed: false,
        safety_message:
          'Priority changes require an explicit patient identifier and clinician review.',
        timestamp: new Date(),
      };
    }

    const patient = await Patient.findById(patientMatch[1]);
    if (!patient) {
      return {
        suggestion: 'Patient not found. No priority change was made.',
        data: null,
        requires_review: true,
        safety_check_passed: false,
        safety_message: 'Priority changes cannot proceed without a valid patient record.',
        timestamp: new Date(),
      };
    }

    const requestedDps = this.extractRequestedDps(query.query);
    if (!requestedDps) {
      return {
        suggestion: 'No DPS target was detected. Use DPS 1 through DPS 5.',
        data: patient,
        requires_review: true,
        safety_check_passed: false,
        safety_message: 'Priority changes require a target DPS score.',
        timestamp: new Date(),
      };
    }

    const safety = this.evaluatePrioritySafety(patient, requestedDps);
    if (!safety.ok) {
      patient.safety_override = false;
      patient.last_safety_violation = new Date();
      patient.alerts.push(safety.message);
      await patient.save();

      return {
        suggestion: 'Priority change blocked by safety floor. No autonomous change was made.',
        data: patient,
        requires_review: true,
        safety_check_passed: false,
        safety_message: safety.message,
        timestamp: new Date(),
      };
    }

    return {
      suggestion: `Safety check passed for changing ${patient.name} to DPS ${requestedDps}. Human review is required before applying.`,
      data: { patient, requested_dps_score: requestedDps },
      requires_review: true,
      safety_check_passed: true,
      safety_message: HUMAN_REVIEW_REQUIRED,
      timestamp: new Date(),
    };
  }

  private extractRequestedDps(query: string): 1 | 2 | 3 | 4 | 5 | null {
    const match = query.match(/(?:dps|priority)\s*([1-5])/i);
    if (!match) return null;
    const score = Number(match[1]);
    return [1, 2, 3, 4, 5].includes(score) ? (score as 1 | 2 | 3 | 4 | 5) : null;
  }

  private evaluatePrioritySafety(
    patient: IPatient,
    requestedDps: 1 | 2 | 3 | 4 | 5,
  ): { ok: boolean; message: string } {
    if (requestedDps <= patient.dps_score) {
      return {
        ok: true,
        message: 'Priority escalation or equivalent priority is allowed for human review.',
      };
    }

    const safetyReasons = this.safetyFloorReasons(patient);
    if (safetyReasons.length > 0) {
      return {
        ok: false,
        message: `Cannot lower priority for ${patient.name}: ${safetyReasons.join(', ')}.`,
      };
    }

    return { ok: true, message: 'No safety-floor blocker detected.' };
  }

  private safetyFloorReasons(patient: IPatient): string[] {
    const reasons: string[] = [];
    if (patient.dps_score <= 2) reasons.push(`DPS${patient.dps_score}`);
    if (this.hasAbnormalVitals(patient)) reasons.push('abnormal_vitals');
    const text = `${patient.chief_complaint} ${patient.alerts.join(' ')}`.toLowerCase();
    if (text.includes('stroke')) reasons.push('stroke_protocol');
    if (text.includes('sepsis')) reasons.push('sepsis_protocol');
    if (text.includes('chest pain')) reasons.push('chest_pain_protocol');
    return reasons.filter((reason) => this.safetyRules.cannotLowerPriorityFor.includes(reason));
  }

  private hasAbnormalVitals(patient: IPatient): boolean {
    const vitals = patient.vitals;
    if (!vitals) return false;
    if (vitals.hr && (vitals.hr > 120 || vitals.hr < 50)) return true;
    if (vitals.o2 && vitals.o2 < 92) return true;
    if (vitals.rr && vitals.rr > 24) return true;
    if (vitals.bp) {
      const [systolic] = vitals.bp.split('/').map(Number);
      if (Number.isFinite(systolic) && systolic < 90) return true;
    }
    return false;
  }
}

export const copilotService = new CopilotService();
