export interface ClinicalProtocol {
  id: string;
  name: string;
  trigger: string;
  recommendedActions: string[];
  humanReviewRequired: boolean;
}

const CLINICAL_PROTOCOLS: ClinicalProtocol[] = [
  {
    id: 'sepsis-screen',
    name: 'Sepsis Screening',
    trigger: 'fever, hypotension, tachycardia, or suspected infection',
    recommendedActions: [
      'Repeat full vital signs',
      'Notify responsible clinician',
      'Prepare sepsis bundle checklist for human review',
    ],
    humanReviewRequired: true,
  },
  {
    id: 'chest-pain',
    name: 'Chest Pain Pathway',
    trigger: 'chest pain, diaphoresis, abnormal ECG, or elevated cardiac risk',
    recommendedActions: [
      'Prioritize ECG review',
      'Confirm aspirin contraindications',
      'Escalate abnormal findings to physician',
    ],
    humanReviewRequired: true,
  },
  {
    id: 'stroke-alert',
    name: 'Stroke Alert',
    trigger: 'facial droop, weakness, speech disturbance, or acute neurologic deficit',
    recommendedActions: [
      'Record last-known-well time',
      'Activate stroke workflow',
      'Prepare imaging and neurology notification',
    ],
    humanReviewRequired: true,
  },
];

export class ClinicalProtocolService {
  listProtocols(): ClinicalProtocol[] {
    return CLINICAL_PROTOCOLS.map((protocol) => ({ ...protocol }));
  }

  getProtocol(protocolId: string): ClinicalProtocol | null {
    const protocol = CLINICAL_PROTOCOLS.find((candidate) => candidate.id === protocolId);
    return protocol ? { ...protocol } : null;
  }

  matchProtocols(context: {
    chiefComplaint?: string;
    flags?: string[];
    vitals?: { hr?: number; sbp?: number; temp?: number; spo2?: number };
  }): ClinicalProtocol[] {
    const text = [context.chiefComplaint, ...(context.flags || [])].join(' ').toLowerCase();
    const vitals = context.vitals || {};
    const matches = CLINICAL_PROTOCOLS.filter((protocol) => {
      if (protocol.id === 'sepsis-screen') {
        return (
          /sepsis|infection|fever/.test(text) ||
          (vitals.temp !== undefined && vitals.temp >= 38.5) ||
          (vitals.sbp !== undefined && vitals.sbp < 90) ||
          (vitals.hr !== undefined && vitals.hr > 120)
        );
      }
      if (protocol.id === 'chest-pain') {
        return /chest|cardiac|stemi|acs|troponin/.test(text);
      }
      if (protocol.id === 'stroke-alert') {
        return /stroke|facial|weakness|speech|neurologic|neuro/.test(text);
      }
      return false;
    });

    return matches.map((protocol) => ({ ...protocol }));
  }

  checkHealth() {
    return {
      status: 'ready',
      protocolCount: CLINICAL_PROTOCOLS.length,
    };
  }
}

export const clinicalProtocolService = new ClinicalProtocolService();
