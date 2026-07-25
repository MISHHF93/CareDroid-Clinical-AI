import { ERPulseHandoverService } from './smart-handover-v2.service';

describe('ERPulseHandoverService', () => {
  let service: ERPulseHandoverService;

  beforeEach(() => {
    service = new ERPulseHandoverService();
  });

  describe('generateHandoverSummary — defaulting', () => {
    it('fills every field with clinically-plausible demo defaults when no context is given', async () => {
      const result = await service.generateHandoverSummary('patient-1');

      expect(result.patientId).toBe('patient-1');
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.keyVitals).toBe('HR 112; BP 168/94; SpO2 92%; RR 24; Temp 37.8C; GCS 15');
      expect(result.abnormalLabs).toEqual(['Troponin 0.09 ng/mL', 'Lactate 2.7 mmol/L']);
      expect(result.imagingFindings).toEqual(['CXR: Mild pulmonary congestion, no pneumothorax.']);
      expect(result.riskAlerts).toEqual([
        'Hypoxia risk',
        'Tachycardia requiring reassessment',
        'Possible acute coronary syndrome',
        'Sepsis or shock screening recommended',
      ]);
      expect(result.summary.situation).toContain('Demo Emergency Patient');
      expect(result.summary.situation).toContain('Chest pain with shortness of breath');
    });

    it('does not let any default leak through when the full context is supplied', async () => {
      const result = await service.generateHandoverSummary('patient-2', {
        name: 'Jane Doe',
        age: 41,
        mrn: 'MRN-999',
        chiefComplaint: 'Ankle injury',
        hpi: 'Twisted ankle playing soccer.',
        pmh: ['None'],
        medications: ['None'],
        allergies: ['Penicillin'],
        vitals: [{ hr: 72, bp: '118/76', spo2: 99, rr: 14, temp: 36.9, gcs: 15 }],
        labs: [{ name: 'CBC', value: 'normal' }],
        imaging: [{ modality: 'X-ray', bodyPart: 'ankle', impression: 'No fracture.' }],
        consults: ['Orthopedics not required'],
      });

      expect(result.summary.situation).toBe(
        'Jane Doe (41y, MRN-999) presents with Ankle injury. Current status: HR 72; BP 118/76; SpO2 99%; RR 14; Temp 36.9C; GCS 15.',
      );
      expect(result.summary.background).toBe(
        'HPI: Twisted ankle playing soccer.; PMH: None; Meds: None; Allergies: Penicillin',
      );
      expect(result.abnormalLabs).toEqual([]);
      expect(result.riskAlerts).toEqual([]);
      expect(result.imagingFindings).toEqual(['X-ray ankle: No fracture.']);
    });

    it('only defaults the fields actually missing from a partial context', async () => {
      const result = await service.generateHandoverSummary('patient-3', { name: 'Partial Pat' });

      expect(result.summary.situation).toContain('Partial Pat');
      expect(result.summary.situation).toContain('67y');
      expect(result.keyVitals).toBe('HR 112; BP 168/94; SpO2 92%; RR 24; Temp 37.8C; GCS 15');
    });

    it('falls back to "Vitals unavailable" when the supplied vital has no measurements at all', async () => {
      const result = await service.generateHandoverSummary('patient-4', { vitals: [{}] });

      expect(result.keyVitals).toBe('Vitals unavailable');
    });

    it('builds BP from sbp/dbp when no combined bp string is given', async () => {
      const result = await service.generateHandoverSummary('patient-5', {
        vitals: [{ sbp: 140, dbp: 90 }],
      });

      expect(result.keyVitals).toBe('BP 140/90');
    });
  });

  describe('generateHandoverSummary — risk alerts', () => {
    const quietVitals = { hr: 80, bp: '120/80', spo2: 98, rr: 16, temp: 37.0, gcs: 15 };

    it('reports no risk alerts when nothing is abnormal', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [quietVitals],
        labs: [{ name: 'CBC', value: 'normal' }],
        imaging: [{ modality: 'CXR', impression: 'Clear.' }],
      });

      expect(result.riskAlerts).toEqual([]);
      expect(result.summary.assessment).toContain('No critical labs flagged');
      expect(result.summary.recommendation).toContain('No automated high-risk alerts');
    });

    it('flags hypoxia risk when spo2 is below 94', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [{ ...quietVitals, spo2: 89 }],
      });

      expect(result.riskAlerts).toContain('Hypoxia risk');
    });

    it('flags tachycardia when hr is above 110', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [{ ...quietVitals, hr: 130 }],
      });

      expect(result.riskAlerts).toContain('Tachycardia requiring reassessment');
    });

    it('flags possible ACS from an abnormal troponin lab (case-insensitive match)', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [quietVitals],
        labs: [{ name: 'TROPONIN I', value: 1.2, abnormal: true }],
      });

      expect(result.riskAlerts).toEqual(['Possible acute coronary syndrome']);
    });

    it('flags sepsis/shock screening from an abnormal lactate lab', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [quietVitals],
        labs: [{ name: 'Lactate', value: 4.5, abnormal: true }],
      });

      expect(result.riskAlerts).toEqual(['Sepsis or shock screening recommended']);
    });

    it('flags a critical imaging result independently of vitals/labs', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [quietVitals],
        labs: [{ name: 'CBC', value: 'normal' }],
        imaging: [{ modality: 'CT', impression: 'Large PE.', critical: true }],
      });

      expect(result.riskAlerts).toEqual(['Critical imaging result']);
    });

    it('does not flag ACS/sepsis for labs that are abnormal but not troponin/lactate', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [quietVitals],
        labs: [{ name: 'Potassium', value: 6.2, abnormal: true }],
      });

      expect(result.riskAlerts).toEqual([]);
      expect(result.abnormalLabs).toEqual(['Potassium 6.2']);
    });
  });

  describe('generateHandoverSummary — pending actions', () => {
    it('always carries pending consults through, even with nothing else pending', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [{ hr: 80, spo2: 98 }],
        labs: [{ name: 'CBC', value: 'normal' }],
        consults: ['Physical therapy referral'],
      });

      expect(result.pendingActions).toEqual(['Physical therapy referral']);
    });

    it('adds lab-review and risk-escalation reminders only when they actually apply', async () => {
      const result = await service.generateHandoverSummary('p', {
        vitals: [{ hr: 130, spo2: 98 }],
        labs: [{ name: 'Troponin', value: 1.0, abnormal: true }],
        consults: [],
      });

      expect(result.pendingActions).toEqual([
        'Trend abnormal labs and document clinician review.',
        'Escalate risk alerts during handover huddle.',
      ]);
    });
  });

  describe('generateHandoverSummary — education and warning indicators', () => {
    it('includes the chief complaint in the patient education materials', async () => {
      const result = await service.generateHandoverSummary('p', {
        chiefComplaint: 'Severe migraine',
      });

      expect(result.patientEducationMaterials[0]).toContain('Severe migraine');
      expect(result.patientEducationMaterials).toHaveLength(3);
    });

    it('adds a chest-pain-specific warning indicator only when the complaint mentions chest', async () => {
      const chestResult = await service.generateHandoverSummary('p', {
        chiefComplaint: 'Chest tightness',
      });
      const nonChestResult = await service.generateHandoverSummary('p', {
        chiefComplaint: 'Twisted ankle',
      });

      expect(chestResult.warningIndicators).toHaveLength(3);
      expect(chestResult.warningIndicators.some((w) => w.includes('chest pressure'))).toBe(true);
      expect(nonChestResult.warningIndicators).toHaveLength(2);
      expect(nonChestResult.warningIndicators.some((w) => w.includes('chest pressure'))).toBe(
        false,
      );
    });
  });

  describe('generateHandoverSummary — timing', () => {
    it('reports generationTimeSeconds rounded to 3 decimal places, derived from elapsed time', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_257);

      const result = await service.generateHandoverSummary('p');

      expect(result.generationTimeSeconds).toBe(0.257);
      nowSpy.mockRestore();
    });
  });

  describe('fineTunePrompt / getPromptFeedback', () => {
    it('records fed-back prompt tuning with a real timestamp', async () => {
      await service.fineTunePrompt('septic shock workup', 'add lactate trend to summary');

      const feedback = service.getPromptFeedback();
      expect(feedback).toHaveLength(1);
      expect(feedback[0].clinicalContext).toBe('septic shock workup');
      expect(feedback[0].feedback).toBe('add lactate trend to summary');
      expect(feedback[0].recordedAt).toBeInstanceOf(Date);
    });

    it('accumulates multiple feedback entries in call order', async () => {
      await service.fineTunePrompt('context-1', 'feedback-1');
      await service.fineTunePrompt('context-2', 'feedback-2');

      const feedback = service.getPromptFeedback();
      expect(feedback.map((f) => f.clinicalContext)).toEqual(['context-1', 'context-2']);
    });

    it('returns a defensive copy — mutating the result cannot corrupt internal state', async () => {
      await service.fineTunePrompt('context-1', 'feedback-1');

      const feedback = service.getPromptFeedback();
      feedback.push({ clinicalContext: 'injected', feedback: 'injected', recordedAt: new Date() });

      expect(service.getPromptFeedback()).toHaveLength(1);
    });
  });
});
