import { describe, expect, it } from 'vitest';
import {
  buildDocumentationAssistantPrompt,
  buildDocumentationExport,
  buildLocalDocumentationDraft,
  DOCUMENTATION_AI_ACTIONS,
  DOCUMENTATION_NOTE_TYPES,
  getDocumentationNoteType,
} from './clinicalDocumentationAssistant';

describe('clinicalDocumentationAssistant', () => {
  it('covers requested documentation note types and AI actions', () => {
    expect(DOCUMENTATION_NOTE_TYPES.map((type) => type.label)).toEqual([
      'SOAP note',
      'H&P note',
      'Progress note',
      'Discharge summary',
      'Consultation note',
      'Procedure note',
    ]);
    expect(DOCUMENTATION_AI_ACTIONS.map((action) => action.label)).toEqual([
      'Draft note',
      'Summarize encounter',
      'Generate patient instructions',
    ]);
  });

  it('builds review-required AI prompts with selected note sections', () => {
    const prompt = buildDocumentationAssistantPrompt({
      noteTypeId: 'procedure',
      actionId: 'draft-note',
      encounterTitle: 'Central line placement',
      encounterDetails: 'Sterile procedure completed without immediate complication.',
    });

    expect(prompt).toMatch(/Procedure note/i);
    expect(prompt).toMatch(/Indication, Consent, Procedure details/i);
    expect(prompt).toMatch(/clinician review/i);
  });

  it('generates local drafts and export text', () => {
    const draft = buildLocalDocumentationDraft({
      noteTypeId: 'discharge-summary',
      actionId: 'patient-instructions',
      encounterTitle: 'Pneumonia discharge',
      encounterDetails: 'Complete antibiotics and follow up in clinic.',
    });
    const exportData = buildDocumentationExport({
      noteTypeId: 'discharge-summary',
      actionId: 'patient-instructions',
      encounterTitle: 'Pneumonia discharge',
      draftText: draft,
    });

    expect(getDocumentationNoteType('history-physical').label).toBe('H&P note');
    expect(draft).toMatch(/return for worsening symptoms/i);
    expect(exportData.filename).toBe('pneumonia-discharge-patient-instructions.txt');
    expect(exportData.content).toMatch(/Draft only - clinician review required/i);
  });
});
