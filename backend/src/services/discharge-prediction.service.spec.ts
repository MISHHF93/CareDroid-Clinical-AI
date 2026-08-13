import { DischargePredictionService } from './discharge-prediction.service';
import { UnifiedPatient as Patient } from '../models/unified-patient.model';

jest.mock('../models/unified-patient.model', () => ({
  UnifiedPatient: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

function makePatient(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'patient-1',
    vitals: { hr: 78, bp: '118/76', o2: 97, temperature: 37.0 },
    dischargeCriteriaMet: ['afebrile', 'ambulating independently'],
    virtualRecheckScheduled: true,
    save: jest.fn().mockResolvedValue(undefined),
    modifiedAt: undefined as Date | undefined,
    dischargeReadinessScore: undefined as number | undefined,
    ...overrides,
  };
}

describe('DischargePredictionService (HEAL-178)', () => {
  let service: DischargePredictionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DischargePredictionService();
  });

  describe('scoreDischargeReadiness (via calculateDischargeReadiness)', () => {
    it('marks pain/mobility/oral-intake/medication/transport as unassessed, not as falsely met', async () => {
      const patient = makePatient();
      (Patient.findById as jest.Mock).mockResolvedValue(patient);

      const result = await service.calculateDischargeReadiness('patient-1');

      const byName = Object.fromEntries(result.criteria.map((c) => [c.name, c]));
      for (const name of [
        'Pain controlled',
        'Able to ambulate',
        'Tolerating oral intake',
        'Medications reconciled',
        'Transport arranged',
      ]) {
        expect(byName[name].met).toBe(false);
        expect(byName[name].assessed).toBe(false);
        expect(byName[name].confidence).toBe(0);
      }
    });

    it('still credits the 3 criteria that have real backing data when they are met', async () => {
      const patient = makePatient();
      (Patient.findById as jest.Mock).mockResolvedValue(patient);

      const result = await service.calculateDischargeReadiness('patient-1');

      const byName = Object.fromEntries(result.criteria.map((c) => [c.name, c]));
      expect(byName['Vital signs stable'].met).toBe(true);
      expect(byName['Vital signs stable'].assessed).toBe(true);
      expect(byName['Discharge criteria documented'].met).toBe(true);
      expect(byName['Follow-up arranged'].met).toBe(true);
    });

    it('caps readinessScore below every actionable threshold when only the 3 assessed criteria are known', async () => {
      const patient = makePatient();
      (Patient.findById as jest.Mock).mockResolvedValue(patient);

      const result = await service.calculateDischargeReadiness('patient-1');

      // Only vitals(0.85) + documented-criteria(0.9) + follow-up(0.85) can ever contribute:
      // round((0.85+0.9+0.85)*100/8) = 33 -- can never reach discharge_now(>=85),
      // prepare_paperwork(>=70), or even monitor(>=50) until the other 5 domains get a real
      // clinician-entered assessment field. This was previously masked by a hardcoded 47.5-point
      // floor from 5 stubbed `return true` checks.
      expect(result.readinessScore).toBe(33);
      expect(result.recommendedAction).toBe('not_ready');
    });

    it('labels unassessed barriers distinctly from criteria that were actually checked and failed', async () => {
      const patient = makePatient({ vitals: { hr: 160, bp: '80/50', o2: 85, temperature: 39.5 } });
      (Patient.findById as jest.Mock).mockResolvedValue(patient);

      const result = await service.calculateDischargeReadiness('patient-1');

      expect(result.barriersToDischarge).toContain('Vital signs stable');
      expect(result.barriersToDischarge).toContain('Pain controlled (not yet clinically assessed)');
      expect(result.barriersToDischarge).toContain(
        'Medications reconciled (not yet clinically assessed)',
      );
    });

    it('persists the readinessScore back onto the patient document', async () => {
      const patient = makePatient();
      (Patient.findById as jest.Mock).mockResolvedValue(patient);

      await service.calculateDischargeReadiness('patient-1');

      expect(patient.dischargeReadinessScore).toBe(33);
      expect(patient.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('identifySameDayDischarges', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns nothing outside the 11am-2pm sweep window regardless of readiness', async () => {
      jest.setSystemTime(new Date('2026-08-13T09:00:00'));
      const result = await service.identifySameDayDischarges();
      expect(result).toEqual([]);
      expect(Patient.find).not.toHaveBeenCalled();
    });

    it('never returns a candidate now that unassessed criteria cannot inflate the score past 70', async () => {
      jest.setSystemTime(new Date('2026-08-13T12:00:00'));
      const patients = [makePatient({ _id: 'a' }), makePatient({ _id: 'b' })];
      (Patient.find as jest.Mock).mockResolvedValue(patients);

      const result = await service.identifySameDayDischarges();

      expect(result).toEqual([]);
    });
  });
});
