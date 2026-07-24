import { Injectable } from '@nestjs/common';

export interface HandoverSummaryV2 {
  patientId: string;
  generatedAt: Date;
  generationTimeSeconds: number;
  summary: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  };
  keyVitals: string;
  abnormalLabs: string[];
  imagingFindings: string[];
  pendingActions: string[];
  riskAlerts: string[];
  patientEducationMaterials: string[];
  warningIndicators: string[];
}

interface ClinicalVital {
  hr?: number;
  bp?: string;
  sbp?: number;
  dbp?: number;
  spo2?: number;
  rr?: number;
  temp?: number;
  gcs?: number;
}

interface ClinicalLab {
  name: string;
  value: number | string;
  unit?: string;
  abnormal?: boolean;
  referenceRange?: string;
}

interface ClinicalImagingStudy {
  modality: string;
  bodyPart?: string;
  impression: string;
  critical?: boolean;
}

interface ERPulsePatientContext {
  patientId: string;
  name?: string;
  age?: number;
  mrn?: string;
  chiefComplaint?: string;
  hpi?: string;
  pmh?: string[];
  medications?: string[];
  allergies?: string[];
  vitals?: ClinicalVital[];
  labs?: ClinicalLab[];
  imaging?: ClinicalImagingStudy[];
  consults?: string[];
}

interface HydratedPatientContext extends ERPulsePatientContext {
  pmh: string[];
  medications: string[];
  allergies: string[];
  vitals: ClinicalVital[];
  labs: ClinicalLab[];
  imaging: ClinicalImagingStudy[];
  consults: string[];
}

interface StructuredSummaryInput extends HydratedPatientContext {
  latestVital: ClinicalVital;
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function compactList(values: Array<string | undefined | null>, fallback: string): string {
  const clean = values.filter(Boolean) as string[];
  return clean.length ? clean.join('; ') : fallback;
}

@Injectable()
export class ERPulseHandoverService {
  private readonly promptFeedback: Array<{
    clinicalContext: string;
    feedback: string;
    recordedAt: Date;
  }> = [];

  async generateHandoverSummary(
    patientId: string,
    context: Partial<ERPulsePatientContext> = {},
  ): Promise<HandoverSummaryV2> {
    const startTime = Date.now();
    const patient = this.buildPatientContext(patientId, context);
    const summary = await this.generateStructuredSummary({
      ...patient,
      latestVital: patient.vitals[0],
    });
    const educationMaterials = await this.generatePatientEducation(patient);
    const warningIndicators = await this.generateWarningIndicators(patient);

    return {
      patientId,
      generatedAt: new Date(),
      generationTimeSeconds: round((Date.now() - startTime) / 1000, 3),
      summary: summary.sbar,
      keyVitals: this.formatKeyVitals(patient.vitals[0]),
      abnormalLabs: this.extractAbnormalLabs(patient.labs),
      imagingFindings: summary.imagingFindings,
      pendingActions: summary.pendingActions,
      riskAlerts: summary.riskAlerts,
      patientEducationMaterials: educationMaterials,
      warningIndicators,
    };
  }

  async fineTunePrompt(clinicalContext: string, feedback: string): Promise<void> {
    await this.storePromptFeedback(clinicalContext, feedback);
    await this.adjustPromptParameters(feedback);
  }

  getPromptFeedback() {
    return [...this.promptFeedback];
  }

  private buildPatientContext(
    patientId: string,
    context: Partial<ERPulsePatientContext>,
  ): HydratedPatientContext {
    return {
      patientId,
      name: context.name || 'Demo Emergency Patient',
      age: context.age ?? 67,
      mrn: context.mrn || `MRN-${patientId}`,
      chiefComplaint: context.chiefComplaint || 'Chest pain with shortness of breath',
      hpi:
        context.hpi ||
        'Arrived by EMS with acute symptoms requiring expedited physician reassessment.',
      pmh: context.pmh || ['Hypertension', 'Type 2 diabetes'],
      medications: context.medications || ['Metformin 500 mg BID', 'Amlodipine 5 mg daily'],
      allergies: context.allergies || ['No known drug allergies'],
      vitals: context.vitals?.length
        ? context.vitals
        : [{ hr: 112, bp: '168/94', spo2: 92, rr: 24, temp: 37.8, gcs: 15 }],
      labs: context.labs?.length
        ? context.labs
        : [
            { name: 'Troponin', value: 0.09, unit: 'ng/mL', abnormal: true },
            { name: 'Lactate', value: 2.7, unit: 'mmol/L', abnormal: true },
            { name: 'Hemoglobin', value: 128, unit: 'g/L' },
          ],
      imaging: context.imaging?.length
        ? context.imaging
        : [{ modality: 'CXR', impression: 'Mild pulmonary congestion, no pneumothorax.' }],
      consults: context.consults || ['Cardiology consult pending callback'],
    };
  }

  private async generateStructuredSummary(input: StructuredSummaryInput) {
    const abnormalLabs = this.extractAbnormalLabs(input.labs);
    const imagingFindings = input.imaging.map(
      (study) =>
        `${study.modality}${study.bodyPart ? ` ${study.bodyPart}` : ''}: ${study.impression}`,
    );
    const riskAlerts = this.deriveRiskAlerts(input, abnormalLabs);
    const pendingActions = [
      ...input.consults,
      abnormalLabs.length ? 'Trend abnormal labs and document clinician review.' : undefined,
      riskAlerts.length ? 'Escalate risk alerts during handover huddle.' : undefined,
    ].filter(Boolean) as string[];

    return {
      sbar: {
        situation: `${input.name} (${input.age}y, ${input.mrn}) presents with ${input.chiefComplaint}. Current status: ${this.formatKeyVitals(input.latestVital)}.`,
        background: compactList(
          [
            `HPI: ${input.hpi}`,
            `PMH: ${(input.pmh || []).join(', ')}`,
            `Meds: ${(input.medications || []).join(', ')}`,
            `Allergies: ${(input.allergies || []).join(', ')}`,
          ],
          'Background requires EMR review.',
        ),
        assessment: compactList(
          [
            abnormalLabs.length
              ? `Abnormal labs: ${abnormalLabs.join(', ')}`
              : 'No critical labs flagged.',
            imagingFindings.length
              ? `Imaging: ${imagingFindings.join('; ')}`
              : 'No imaging findings available.',
          ],
          'Assessment requires clinician completion.',
        ),
        recommendation: compactList(
          [
            pendingActions.length
              ? `Pending: ${pendingActions.join('; ')}`
              : 'Continue routine ED pathway.',
            riskAlerts.length
              ? `Risks: ${riskAlerts.join('; ')}`
              : 'No automated high-risk alerts.',
          ],
          'Confirm plan with responsible clinician.',
        ),
      },
      imagingFindings,
      pendingActions,
      riskAlerts,
    };
  }

  private formatKeyVitals(vital: ClinicalVital = {}): string {
    const bp = vital.bp || [vital.sbp, vital.dbp].filter(Boolean).join('/');
    return compactList(
      [
        vital.hr !== undefined ? `HR ${vital.hr}` : undefined,
        bp ? `BP ${bp}` : undefined,
        vital.spo2 !== undefined ? `SpO2 ${vital.spo2}%` : undefined,
        vital.rr !== undefined ? `RR ${vital.rr}` : undefined,
        vital.temp !== undefined ? `Temp ${vital.temp}C` : undefined,
        vital.gcs !== undefined ? `GCS ${vital.gcs}` : undefined,
      ],
      'Vitals unavailable',
    );
  }

  private extractAbnormalLabs(labs: ClinicalLab[] = []): string[] {
    return labs
      .filter((lab) => lab.abnormal)
      .map((lab) => `${lab.name} ${lab.value}${lab.unit ? ` ${lab.unit}` : ''}`);
  }

  private deriveRiskAlerts(input: StructuredSummaryInput, abnormalLabs: string[]): string[] {
    const alerts: string[] = [];
    if ((input.latestVital.spo2 ?? 100) < 94) alerts.push('Hypoxia risk');
    if ((input.latestVital.hr ?? 0) > 110) alerts.push('Tachycardia requiring reassessment');
    if (abnormalLabs.some((lab) => /troponin/i.test(lab)))
      alerts.push('Possible acute coronary syndrome');
    if (abnormalLabs.some((lab) => /lactate/i.test(lab)))
      alerts.push('Sepsis or shock screening recommended');
    if (input.imaging.some((study) => study.critical)) alerts.push('Critical imaging result');
    return alerts;
  }

  private async generatePatientEducation(patient: ERPulsePatientContext): Promise<string[]> {
    return [
      `Plain-language discharge instructions for ${patient.chiefComplaint}.`,
      'Medication reconciliation checklist for patient/caregiver review.',
      'Follow-up plan with return precautions and local emergency contact guidance.',
    ];
  }

  private async generateWarningIndicators(patient: ERPulsePatientContext): Promise<string[]> {
    const complaint = patient.chiefComplaint?.toLowerCase() || '';
    const indicators = [
      'Return immediately for worsening symptoms, fainting, confusion, or inability to keep fluids down.',
      'Call emergency services for severe shortness of breath, blue lips, or new weakness.',
    ];
    if (complaint.includes('chest')) {
      indicators.push(
        'Return immediately for recurrent chest pressure, sweating, jaw/arm pain, or palpitations.',
      );
    }
    return indicators;
  }

  private async storePromptFeedback(clinicalContext: string, feedback: string): Promise<void> {
    this.promptFeedback.push({ clinicalContext, feedback, recordedAt: new Date() });
  }

  private async adjustPromptParameters(_feedback: string): Promise<void> {
    return Promise.resolve();
  }
}

export const erPulseHandoverService = new ERPulseHandoverService();
