import { describe, expect, it } from 'vitest';
import {
  PATIENT_ROUTE_PARAM_KEYS,
  applyPatientRouteIntent,
  buildPatientsPatientHref,
  buildReceptionDeepLink,
  buildWhiteboardPatientHref,
  clearPatientRouteParam,
  readPatientRouteContext,
} from './receptionQueryParams';

describe('receptionQueryParams', () => {
  it('reads patient context with queue-first focus priority', () => {
    const params = new URLSearchParams('patient=p-1&patientId=p-2&arrived=p-3');
    expect(readPatientRouteContext(params)).toEqual({
      contextPatientId: 'p-2',
      queuePatientId: 'p-1',
      arrivedPatientId: 'p-3',
      focusPatientId: 'p-1',
    });
  });

  it('falls back to context then handoff for focus', () => {
    expect(readPatientRouteContext(new URLSearchParams('patientId=p-ctx')).focusPatientId).toBe(
      'p-ctx',
    );
    expect(readPatientRouteContext(new URLSearchParams('arrived=p-arr')).focusPatientId).toBe(
      'p-arr',
    );
  });

  it('clears a single patient route param', () => {
    const params = new URLSearchParams('patient=p-1&q=test');
    const next = clearPatientRouteParam(params, PATIENT_ROUTE_PARAM_KEYS.queue);
    expect(next.get('patient')).toBeNull();
    expect(next.get('q')).toBe('test');
  });

  it('applies handoff intent without competing keys', () => {
    const next = applyPatientRouteIntent(
      new URLSearchParams('patient=old&patientId=old2'),
      'p-new',
      'handoff',
    );
    expect(next.get('arrived')).toBe('p-new');
    expect(next.get('patient')).toBeNull();
    expect(next.get('patientId')).toBeNull();
  });

  it('applies queue intent with pretriage default', () => {
    const next = applyPatientRouteIntent(new URLSearchParams(), 'p-queue', 'queue');
    expect(next.get('queue')).toBe('pretriage');
    expect(next.get('patient')).toBe('p-queue');
  });

  it('builds whiteboard href with optional encounter', () => {
    expect(buildWhiteboardPatientHref('p-9')).toBe('/emergency/whiteboard?patient=p-9');
    expect(buildWhiteboardPatientHref('p-9', 'enc-1' as any)).toBe(
      '/emergency/whiteboard?patient=p-9&encounter=enc-1',
    );
  });

  it('builds patients route href with context param', () => {
    expect(buildPatientsPatientHref('p-9')).toBe('/emergency/patients?patientId=p-9');
  });

  it('builds reception deep links for context and queue intents', () => {
    expect(buildReceptionDeepLink({ patientId: 'p-1' })).toBe('/emergency/reception?patientId=p-1');
    expect(buildReceptionDeepLink({ queue: 'pretriage', patientId: 'p-2' })).toBe(
      '/emergency/reception?queue=pretriage&patient=p-2',
    );
    expect(buildReceptionDeepLink({ query: 'smith' })).toBe('/emergency/reception?q=smith');
  });
});
