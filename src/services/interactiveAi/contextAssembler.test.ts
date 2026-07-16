import { describe, expect, it } from 'vitest';
import {
  assembleInteractiveContext,
  describeContextForPrompt,
  removeContextItem,
} from './contextAssembler';

describe('contextAssembler', () => {
  it('attaches permitted context and labels provenance kinds', () => {
    const result = assembleInteractiveContext({
      scope: {
        tenantId: 'org-1',
        role: 'registration_clerk',
        channel: 'reception',
        purpose: 'intake',
        patientId: 'p1',
      },
      userPermissions: ['use_ai_chat', 'view_phi'],
      requested: [
        {
          id: 'c1',
          kind: 'confirmed_patient_fact',
          label: 'Patient',
          summary: 'Jane Doe',
          patientId: 'p1',
        },
        {
          id: 'c2',
          kind: 'ocr_extraction',
          label: 'Insurance OCR',
          summary: 'Policy 123',
          confidence: 0.62,
          patientId: 'p1',
        },
      ],
    });
    expect(result.attached).toHaveLength(2);
    expect(result.attached[1].kind).toBe('ocr_extraction');
    expect(result.attached[1].removable).toBe(true);
    expect(describeContextForPrompt(result.session)).toMatch(/ocr_extraction/i);
  });

  it('requires confirmation for patient context switches', () => {
    const result = assembleInteractiveContext({
      scope: {
        tenantId: 'org-1',
        role: 'registration_clerk',
        channel: 'reception',
        purpose: 'intake',
        patientId: 'p1',
      },
      userPermissions: ['use_ai_chat', 'view_phi'],
      requested: [
        {
          id: 'c3',
          kind: 'confirmed_patient_fact',
          label: 'Other patient',
          summary: 'Other',
          patientId: 'p2',
        },
      ],
    });
    expect(result.requiresPatientSwitchConfirmation).toBe(true);
    expect(result.rejected[0].reason).toMatch(/patient_context_switch/);
  });

  it('removes only removable context items', () => {
    const assembled = assembleInteractiveContext({
      scope: {
        tenantId: 'org-1',
        role: 'nurse',
        channel: 'nursing',
        purpose: 'assist',
        patientId: 'p1',
      },
      userPermissions: ['*'],
      requested: [
        {
          id: 'fact',
          kind: 'confirmed_patient_fact',
          label: 'Fact',
          summary: 'x',
          patientId: 'p1',
        },
        {
          id: 'draft',
          kind: 'user_entered_draft',
          label: 'Draft',
          summary: 'y',
          patientId: 'p1',
        },
      ],
    });
    expect(() => removeContextItem(assembled.session, 'fact')).toThrow(/not removable/i);
    const next = removeContextItem(assembled.session, 'draft');
    expect(next.attachedContext.find((c) => c.id === 'draft')).toBeUndefined();
  });
});
