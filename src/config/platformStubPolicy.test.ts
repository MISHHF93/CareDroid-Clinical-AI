import { describe, expect, it } from 'vitest';
import { PLATFORM_SYSTEM_PACKS } from '../data/platformSystems';
import { shouldSuppressPlatformSystemStub } from './platformStubPolicy';

describe('platformStubPolicy', () => {
  it('suppresses governance-pack platform stubs', () => {
    expect(
      shouldSuppressPlatformSystemStub({
        route: '/governance/clinical',
        pack: PLATFORM_SYSTEM_PACKS.GOVERNANCE,
      }),
    ).toBe(true);
  });

  it('suppresses stubs when dedicated in-shell routes exist', () => {
    expect(
      shouldSuppressPlatformSystemStub({
        route: '/tools/calculator-recommender',
        pack: 'AI Workflow',
      }),
    ).toBe(true);
    expect(
      shouldSuppressPlatformSystemStub({
        route: '/integrations/fhir',
        pack: 'Interoperability',
      }),
    ).toBe(true);
    expect(
      shouldSuppressPlatformSystemStub({
        route: '/discover',
        pack: 'SaaS',
      }),
    ).toBe(true);
  });

  it('keeps dynamic patient routes on PlatformSystemPage', () => {
    expect(
      shouldSuppressPlatformSystemStub({
        route: '/patients/:patientId/consent',
        pack: PLATFORM_SYSTEM_PACKS.GOVERNANCE,
      }),
    ).toBe(false);
  });
});
