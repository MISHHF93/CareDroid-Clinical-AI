import { afterEach, describe, expect, it } from 'vitest';
import { applyPatientContextGate, isPatientContextEnabled } from './patientContextGate';

describe('patientContextGate', () => {
  const prev = process.env.AI_PATIENT_CONTEXT_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.AI_PATIENT_CONTEXT_ENABLED;
    else process.env.AI_PATIENT_CONTEXT_ENABLED = prev;
  });

  it('defaults to disabled', () => {
    delete process.env.AI_PATIENT_CONTEXT_ENABLED;
    expect(isPatientContextEnabled()).toBe(false);
  });

  it('strips patient identifiers when disabled', () => {
    delete process.env.AI_PATIENT_CONTEXT_ENABLED;
    const result = applyPatientContextGate({
      systemPrompt: 'safe',
      requestType: 'COPILOT_CHAT' as any,
      patientId: 'pt-12345',
      encounterId: 'enc-99',
      context: {
        patient: { name: 'Jane Doe', mrn: 'MRN-1' },
        unit: 'ED-A',
      },
      messages: [{ role: 'user', content: 'status?' }],
    });

    expect(result.patientContextEnabled).toBe(false);
    expect(result.stripped).toBe(true);
    expect(result.request.patientId).toBeUndefined();
    expect(result.request.encounterId).toBeUndefined();
    expect(result.request.context?.patient).toBeUndefined();
    expect(result.request.context?.unit).toBe('ED-A');
    expect(result.strippedFields).toEqual(
      expect.arrayContaining(['patientId', 'encounterId', 'context.patient']),
    );
  });

  it('preserves identifiers when explicitly enabled', () => {
    process.env.AI_PATIENT_CONTEXT_ENABLED = 'true';
    const result = applyPatientContextGate({
      systemPrompt: 'safe',
      requestType: 'COPILOT_CHAT' as any,
      patientId: 'pt-keep',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result.patientContextEnabled).toBe(true);
    expect(result.stripped).toBe(false);
    expect(result.request.patientId).toBe('pt-keep');
  });
});
