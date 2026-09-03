const CLINICAL_TO_PATIENT: Record<string, string> = {
  NPO: 'Nothing to eat or drink by mouth',
  'NPO after midnight': 'Do not eat or drink after midnight',
  'IV fluids': 'Fluids through your vein',
  'IV access': 'A small tube in your vein for medicines or fluids',
  'CT scan': 'A special X-ray scan',
  CXR: 'Chest X-ray',
  MSE: 'Mental health check',
  LWBS: 'Leaving before being seen',
  Boarding: 'Waiting for a hospital bed after admission decision',
  'Pending admission': 'Your care team is planning a hospital stay',
  'Reassessment due': 'A nurse will check on you again soon',
  'Sepsis alert': 'Your care team is watching for serious infection',
  Isolation: 'Extra precautions to prevent spreading infection',
  'Fall risk': 'Please ask for help when getting up',
  Triage: 'Initial nurse assessment',
  Resus: 'Critical care area',
  'Fast track': 'Quicker care for less urgent needs',
};

export function toPatientFriendlyTerm(clinical: string): string {
  const trimmed = clinical.trim();
  if (!trimmed) return trimmed;
  const direct = CLINICAL_TO_PATIENT[trimmed];
  if (direct) return direct;
  const upper = trimmed.toUpperCase();
  if (CLINICAL_TO_PATIENT[upper]) return CLINICAL_TO_PATIENT[upper];
  for (const [key, value] of Object.entries(CLINICAL_TO_PATIENT)) {
    if (upper.includes(key.toUpperCase())) return value;
  }
  return trimmed;
}

export function patientFriendlyStateLabel(state: string): string {
  const map: Record<string, string> = {
    Arrival: 'You have arrived',
    Registration: 'Checking you in',
    Triage: 'Waiting for nurse assessment',
    Waiting: 'Waiting to see a doctor',
    Assessment: 'Being seen by your care team',
    Orders: 'Tests or treatments ordered',
    Results: 'Waiting for test results',
    Disposition: 'Planning next steps',
    Admission: 'Preparing for hospital admission',
    Discharge: 'Getting ready to go home',
  };
  return map[state] || `Status: ${toPatientFriendlyTerm(state)}`;
}
