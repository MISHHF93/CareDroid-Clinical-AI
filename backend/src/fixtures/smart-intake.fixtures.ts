import type { SmartIntakeInput } from '../models/SmartIntake';

export const SMART_INTAKE_FIXTURES: SmartIntakeInput[] = [
  {
    source: 'manual_entry',
    manual: {
      firstName: 'Mei',
      lastName: 'Chen',
      dateOfBirth: '1958-04-12',
      sex: 'Female',
      phone: '416-555-0134',
      address: '22 Queen St W, Toronto, ON',
      mrn: 'MRN-118204',
      chiefComplaint: 'Abdominal pain',
      staffNotes: 'Returning patient; old address may be on file.',
    },
  },
  {
    source: 'ocr_result',
    manual: {
      firstName: 'Mohamed',
      lastName: 'Ali',
      dateOfBirth: '1977-09-02',
      sex: 'Male',
      healthCardNumber: 'HC-9922-441',
      address: 'OCR uncertain: 14 or 19 King Ave',
    },
    staffNotes: 'OCR confidence low on street number; require manual verification.',
  },
  {
    source: 'ems_prearrival',
    ems: {
      emsUnitId: 'TPS Medic 501',
      temporaryId: 'EMS-501-UNKNOWN',
      etaMinutes: 4,
      chiefComplaint: 'Unknown male, STEMI alert',
      riskFlags: ['STEMI', 'diaphoretic', 'BP 88/60'],
    },
  },
  {
    source: 'referral_document',
    manual: {
      firstName: 'Sarah',
      lastName: 'Okafor',
      previousNames: ['Sarah Mensah'],
      dateOfBirth: '1989-11-19',
      sex: 'Female',
      referralSourceId: 'REF-CARD-4419',
      chiefComplaint: 'Chest pain referral from clinic',
    },
    staffNotes: 'Name mismatch between referral and health card; review duplicate candidates.',
  },
  {
    source: 'medication_list',
    medications: [
      { name: 'Metformin', dose: '500mg', frequency: 'BID', confidence: 0.91 },
      { name: 'Amlodipine', dose: '5mg', frequency: 'daily', confidence: 0.87 },
    ],
    staffNotes: 'Medication extraction from patient phone photo; verify before chart merge.',
  },
  {
    source: 'allergy_list',
    allergies: [
      { substance: 'Penicillin', reaction: 'rash', severity: 'moderate', confidence: 0.82 },
      { substance: 'Shellfish', reaction: 'unknown', confidence: 0.61 },
    ],
    staffNotes: 'Allergy card partially obscured; shellfish reaction missing.',
  },
];
