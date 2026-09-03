export const DOCUMENTATION_NOTE_TYPES = Object.freeze([
  {
    id: 'soap',
    label: 'SOAP note',
    sections: ['Subjective', 'Objective', 'Assessment', 'Plan'],
    exportTitle: 'SOAP Note',
  },
  {
    id: 'history-physical',
    label: 'H&P note',
    sections: [
      'Chief concern',
      'History of present illness',
      'Past history',
      'Exam',
      'Assessment and plan',
    ],
    exportTitle: 'History and Physical Note',
  },
  {
    id: 'progress',
    label: 'Progress note',
    sections: ['Interval events', 'Subjective', 'Objective', 'Assessment', 'Plan'],
    exportTitle: 'Progress Note',
  },
  {
    id: 'discharge-summary',
    label: 'Discharge summary',
    sections: [
      'Hospital course',
      'Discharge diagnoses',
      'Medications',
      'Follow-up',
      'Patient instructions',
    ],
    exportTitle: 'Discharge Summary',
  },
  {
    id: 'consultation',
    label: 'Consultation note',
    sections: [
      'Reason for consult',
      'Focused history',
      'Assessment',
      'Recommendations',
      'Communication',
    ],
    exportTitle: 'Consultation Note',
  },
  {
    id: 'procedure',
    label: 'Procedure note',
    sections: [
      'Indication',
      'Consent',
      'Procedure details',
      'Findings',
      'Complications',
      'Post-procedure plan',
    ],
    exportTitle: 'Procedure Note',
  },
]);

export const DOCUMENTATION_AI_ACTIONS = Object.freeze([
  {
    id: 'draft-note',
    label: 'Draft note',
    instruction:
      'Draft a clinician-review-required note using the selected note type and section structure.',
  },
  {
    id: 'summarize-encounter',
    label: 'Summarize encounter',
    instruction: 'Summarize the encounter concisely for clinician review and handoff.',
  },
  {
    id: 'patient-instructions',
    label: 'Generate patient instructions',
    instruction:
      'Generate plain-language patient instructions, return precautions, follow-up reminders, and medication safety notes.',
  },
]);

export const DEFAULT_DOCUMENTATION_CONTEXT = Object.freeze({
  encounterTitle: 'ED follow-up documentation',
  patientContext:
    'Adult patient evaluated for fever, cough, mild hypoxia, suspected pneumonia, and sepsis screening.',
  encounterDetails:
    'Symptoms improved after fluids and antibiotics. Lactate decreased. Chest imaging showed right lower lobe infiltrate. Patient needs follow-up, medication instructions, and return precautions.',
  clinicianInstructions:
    'Keep the draft concise, include safety review language, and avoid unsupported diagnoses.',
});

export function getDocumentationNoteType(noteTypeId) {
  return (
    DOCUMENTATION_NOTE_TYPES.find((type) => type.id === noteTypeId) || DOCUMENTATION_NOTE_TYPES[0]
  );
}

export function getDocumentationAiAction(actionId) {
  return (
    DOCUMENTATION_AI_ACTIONS.find((action) => action.id === actionId) || DOCUMENTATION_AI_ACTIONS[0]
  );
}

export function buildDocumentationAssistantPrompt({
  noteTypeId = 'soap',
  actionId = 'draft-note',
  encounterTitle = '',
  patientContext = '',
  encounterDetails = '',
  clinicianInstructions = '',
}: any = {}) {
  const noteType = getDocumentationNoteType(noteTypeId);
  const action = getDocumentationAiAction(actionId);

  return [
    `Clinical Documentation Assistant action: ${action.label}.`,
    action.instruction,
    `Note type: ${noteType.label}.`,
    `Required sections: ${noteType.sections.join(', ')}.`,
    `Encounter title: ${encounterTitle || 'Not provided'}.`,
    `Patient context: ${patientContext || 'Not provided'}.`,
    `Encounter details: ${encounterDetails || 'Not provided'}.`,
    `Clinician instructions: ${clinicianInstructions || 'None'}.`,
    'Do not auto-sign. Mark the output as draft-only and requiring clinician review before chart use.',
  ].join('\n');
}

export function buildLocalDocumentationDraft({
  noteTypeId = 'soap',
  actionId = 'draft-note',
  encounterTitle = '',
  patientContext = '',
  encounterDetails = '',
  clinicianInstructions = '',
}: any = {}) {
  const noteType = getDocumentationNoteType(noteTypeId);
  const action = getDocumentationAiAction(actionId);
  const sections = Object.fromEntries(
    noteType.sections.map((section) => [
      section,
      `${section}: ${encounterDetails || patientContext || 'Add reviewed clinical details before chart use.'}`,
    ]),
  );

  if (action.id === 'summarize-encounter') {
    return [
      `Draft encounter summary for ${encounterTitle || noteType.label}`,
      patientContext,
      encounterDetails,
      clinicianInstructions ? `Clinician focus: ${clinicianInstructions}` : '',
      'Review required before chart use.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  if (action.id === 'patient-instructions') {
    return [
      `Draft patient instructions for ${encounterTitle || noteType.label}`,
      'Follow the care plan provided by your clinician.',
      encounterDetails,
      'Return for worsening symptoms, breathing difficulty, chest pain, confusion, fainting, uncontrolled fever, or other urgent concerns.',
      'Review required before giving to the patient.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  return [
    `${noteType.exportTitle} - Draft`,
    ...Object.entries(sections).map(([section, content]) => `${section}\n${content}`),
    'Draft status: clinician review required before chart use.',
  ].join('\n\n');
}

export function buildDocumentationExport({
  noteTypeId = 'soap',
  actionId = 'draft-note',
  encounterTitle = '',
  draftText = '',
}: any = {}) {
  const noteType = getDocumentationNoteType(noteTypeId);
  const action = getDocumentationAiAction(actionId);
  const safeTitle = String(encounterTitle || noteType.exportTitle)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    filename: `${safeTitle || noteType.id}-${action.id}.txt`,
    content: [
      'CareDroid Documentation Assistant Export',
      `Note type: ${noteType.label}`,
      `AI action: ${action.label}`,
      'Status: Draft only - clinician review required before chart use',
      '',
      draftText || 'No draft generated.',
    ].join('\n'),
  };
}
