import { buildSmartIntakeVerticalSlicePatient, SMART_INTAKE_VERTICAL_SLICE_FIXTURE } from './src/data/smartIntakeVerticalSlice.ts';

const patient = buildSmartIntakeVerticalSlicePatient({
  patientId: null,
  mrn: 'ED-C231-TEST',
  identity: { firstName: 'Cycle231', lastName: 'Verify', dob: '1990-01-01', sex: 'Female' },
  age: 36,
  complaintCategory: SMART_INTAKE_VERTICAL_SLICE_FIXTURE.complaintCategory,
  complaintText: SMART_INTAKE_VERTICAL_SLICE_FIXTURE.complaintText,
  vitals: SMART_INTAKE_VERTICAL_SLICE_FIXTURE.vitals,
  selectedPriority: SMART_INTAKE_VERTICAL_SLICE_FIXTURE.priority,
  autoSuggestion: { suggestedPriority: 'P2', confidence: 0.8, ruleTriggered: 'chest-pain-vitals' },
  triageSuggestion: { override: false },
  sessionId: 'session-c231',
  staffId: 'staff-c231-rn',
});

console.log(JSON.stringify(patient, null, 2));
