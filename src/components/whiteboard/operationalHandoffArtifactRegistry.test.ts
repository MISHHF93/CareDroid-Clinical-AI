import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../../types/emergency';
import {
  listOperationalHandoffArtifacts,
  OPERATIONAL_HANDOFF_DOMAINS,
  summarizeArtifactDiscovery,
} from './operationalHandoffArtifactRegistry';

describe('operationalHandoffArtifactRegistry', () => {
  it('indexes artifacts across patient, ems, referral, and admission domains', () => {
    expect(OPERATIONAL_HANDOFF_DOMAINS.map((domain) => domain.id)).toEqual([
      'patient',
      'ems',
      'referral',
      'admission',
    ]);
    // listOperationalHandoffArtifacts's untyped `= null` default infers a `null | undefined`-only
    // param type; cast is required to exercise the per-domain filter argument.
    expect(listOperationalHandoffArtifacts('patient' as unknown as undefined).length).toBeGreaterThan(0);
    expect(listOperationalHandoffArtifacts('ems' as unknown as undefined).length).toBeGreaterThan(0);
    expect(listOperationalHandoffArtifacts('referral' as unknown as undefined).length).toBeGreaterThan(0);
    expect(listOperationalHandoffArtifacts('admission' as unknown as undefined).length).toBeGreaterThan(0);
  });

  it('summarizes discovery for operational handoff planning', () => {
    const discovery = summarizeArtifactDiscovery();
    expect(discovery.domainCount).toBe(4);
    expect(discovery.totalArtifacts).toBeGreaterThan(10);
    expect(discovery.byDomain.patient.artifactCount).toBeGreaterThan(0);
    expect(discovery.recommendation).toContain('OperationalHandoffDomainBar');
  });
});
