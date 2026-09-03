import { describe, expect, it } from 'vitest';
import {
  resolveSaasToolResonance,
  resolveSaasToolSegmentationRole,
} from './saasProfileToolResonance';

describe('saasProfileToolResonance', () => {
  it('maps registration clerk to front-desk resonance without clinical access', () => {
    const resonance = resolveSaasToolResonance('registration-clerk');
    expect(resonance.segmentationRole).toBe('nurse');
    expect(resonance.clinicalAccess).toBe(false);
    expect(resonance.toolsTitle).toBe('Front-desk tools');
    expect(resonance.profileCopy.personaTitle).toBeTruthy();
  });

  it('maps racetrack admin to administrator segmentation with trackmind workspace', () => {
    const resonance = resolveSaasToolResonance('racetrack-admin');
    expect(resolveSaasToolSegmentationRole('racetrack-admin')).toBe('administrator');
    expect(resonance.defaultWorkspace).toBe('trackmind');
    expect(resonance.operationsAccess).toBe(true);
  });

  it('maps fleet operator to operations permission level', () => {
    const resonance = resolveSaasToolResonance('fleet-operator');
    expect(resonance.segmentationRole).toBe('fleet operator');
    expect(resonance.permissionLevel).toBe('operations');
    expect(resonance.toolsTitle).toBe('Fleet operations tools');
  });
});
