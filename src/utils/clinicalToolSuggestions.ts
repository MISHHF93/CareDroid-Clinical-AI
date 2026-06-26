const COMPLAINT_TOOL_SUGGESTIONS = Object.freeze({
  'Chest Pain': [
    { id: 'heart-score', label: 'HEART' },
    { id: 'timi-ua-nstemi', label: 'TIMI' },
    { id: 'grace-acs', label: 'GRACE' },
  ],
  'Shortness of Breath': [
    { id: 'news2', label: 'NEWS2' },
    { id: 'wells-pe', label: 'Wells PE' },
    { id: 'curb-65', label: 'CURB-65' },
  ],
  Stroke: [
    { id: 'nihss', label: 'NIHSS' },
    { id: 'gcs', label: 'GCS' },
    { id: 'abcd2', label: 'ABCD2' },
  ],
  Sepsis: [
    { id: 'qsofa', label: 'qSOFA' },
    { id: 'sofa', label: 'SOFA' },
    { id: 'news2', label: 'NEWS2' },
  ],
  'Abdominal Pain': [
    { id: 'ranson-criteria', label: "Ranson's" },
    { id: 'bisap-score', label: 'BISAP' },
    { id: 'glasgow-blatchford-score', label: 'Blatchford' },
  ],
  Trauma: [
    { id: 'revised-trauma-score', label: 'RTS' },
    { id: 'shock-index', label: 'Shock Index' },
    { id: 'canadian-c-spine', label: 'C-Spine' },
  ],
  Psychiatric: [
    { id: 'phq9', label: 'PHQ-9' },
    { id: 'gad7', label: 'GAD-7' },
    { id: 'columbia-suicide-severity-workflow', label: 'C-SSRS' },
  ],
  Pediatric: [
    { id: 'pews', label: 'PEWS' },
    { id: 'pediatric-gcs', label: 'Peds GCS' },
    { id: 'pediatric-dose-safety-checker', label: 'Emergency Drugs' },
  ],
  Other: [
    { id: 'bmi', label: 'BMI' },
    { id: 'bsa', label: 'BSA' },
    { id: 'anion-gap', label: 'Anion Gap' },
  ],
});

export function getSuggestedToolsForComplaint(complaintCategory) {
  return COMPLAINT_TOOL_SUGGESTIONS[complaintCategory] || COMPLAINT_TOOL_SUGGESTIONS.Other;
}
