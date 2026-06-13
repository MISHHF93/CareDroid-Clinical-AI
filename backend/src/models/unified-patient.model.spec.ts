import { Patient } from './Patient';
import { UnifiedPatient, UnifiedPatientSchema } from './unified-patient.model';

describe('UnifiedPatient model', () => {
  it('exposes the old Patient export as the unified model', () => {
    expect(Patient).toBe(UnifiedPatient);
    expect(UnifiedPatient.collection.name).toBe('unified_patients');
  });

  it('defines indexes required by Emergency OS patient lookups', () => {
    const indexFields = UnifiedPatientSchema.indexes().map(([fields]) => fields);

    expect(indexFields).toEqual(
      expect.arrayContaining([
        { mrn: 1 },
        { phn: 1 },
        { currentState: 1 },
        { dpsScore: 1 },
        { boardingStartTime: 1 },
        { mciBatchId: 1 },
        { wearableDeviceId: 1 },
        { 'triggeredProtocols.status': 1 },
      ]),
    );
  });

  it('normalizes legacy Emergency OS fields into canonical fields', async () => {
    const patient = new UnifiedPatient({
      name: 'Test Patient',
      chief_complaint: 'Chest pain',
      current_state: 'WAITING',
      dps_score: 2,
      ems_status: 'en_route',
      eta_minutes: 12,
      triage_code: 'CTAS2',
      vitals: {
        hr: 118,
        bp: '132/86',
        o2: 91,
        rr: 22,
        temperature: 37.8,
      },
    });

    await patient.validate();

    expect(patient.chiefComplaint).toBe('Chest pain');
    expect(patient.currentState).toBe('WAITING');
    expect(patient.dpsScore).toBe(2);
    expect(patient.emsStatus).toBe('en_route');
    expect(patient.etaMinutes).toBe(12);
    expect(patient.triage?.code).toBe('CTAS2');
    expect(patient.triage?.system).toBe('CTAS');
    expect(patient.currentVitals?.spO2).toBe(91);
  });
});
