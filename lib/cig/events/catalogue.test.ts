import { describe, expect, it } from 'vitest';
import {
  CIG_EVENT_CATALOGUE,
  CIG_EVENT_CATALOGUE_VERSION,
  buildCigDomainEvent,
  getCigEventCatalogueEntry,
  isEventEligibleForMultiUserTwin,
  listCigEventsByProducerClass,
} from './catalogue';

describe('CIG Stage F event catalogue', () => {
  it('exports a non-empty versioned catalogue', () => {
    expect(CIG_EVENT_CATALOGUE_VERSION).toMatch(/stage-f/);
    expect(CIG_EVENT_CATALOGUE.length).toBeGreaterThan(10);
  });

  it('has unique event names', () => {
    const names = CIG_EVENT_CATALOGUE.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('classifies producers into three honesty buckets', () => {
    const be = listCigEventsByProducerClass('be_emitted');
    const fe = listCigEventsByProducerClass('fe_session');
    const na = listCigEventsByProducerClass('unavailable_for_t1');
    expect(be.length).toBeGreaterThan(0);
    expect(fe.length).toBeGreaterThan(0);
    expect(na.length).toBeGreaterThan(0);
    expect(be.length + fe.length + na.length).toBe(CIG_EVENT_CATALOGUE.length);
  });

  it('looks up entries by name', () => {
    const entry = getCigEventCatalogueEntry('patient.created');
    expect(entry?.producerClass).toBe('be_emitted');
    expect(entry?.piiClassification).toBe('direct');
    expect(getCigEventCatalogueEntry('does.not.exist')).toBeUndefined();
  });

  it('denies multi-user twin eligibility for session and FE producers by default', () => {
    expect(isEventEligibleForMultiUserTwin('patient.queue.moved')).toBe(false);
    expect(isEventEligibleForMultiUserTwin('reassessment.due')).toBe(false);
    expect(isEventEligibleForMultiUserTwin('fhir.observation.streamed')).toBe(false);
    // patient.created is be_emitted but durabilityDefault session until cutover
    expect(isEventEligibleForMultiUserTwin('patient.created')).toBe(false);
    // durable catalogue entries only
    expect(isEventEligibleForMultiUserTwin('audit.phi.access')).toBe(true);
  });

  it('builds domain events from catalogue defaults', () => {
    const event = buildCigDomainEvent({
      name: 'capacity.changed',
      tenantId: 't-1',
      producer: 'capacityEngine',
      eventId: 'evt-1',
      payload: { score: 80, band: 'warning' },
    });
    expect(event.name).toBe('capacity.changed');
    expect(event.version).toBe(1);
    expect(event.durability).toBe('session');
    expect(event.piiClassification).toBe('indirect');
    expect(event.tenantId).toBe('t-1');
    expect(event.payload).toEqual({ score: 80, band: 'warning' });
  });

  it('rejects unknown event names', () => {
    expect(() =>
      buildCigDomainEvent({
        name: 'not.in.catalogue',
        tenantId: 't',
        producer: 'x',
        eventId: '1',
        payload: {},
      }),
    ).toThrow(/Unknown CIG event/);
  });

  it('marks FE-session events so multi-user badges stay off', () => {
    for (const entry of listCigEventsByProducerClass('fe_session')) {
      expect(entry.durabilityDefault).toBe('session');
      expect(isEventEligibleForMultiUserTwin(entry.name)).toBe(false);
    }
  });
});
