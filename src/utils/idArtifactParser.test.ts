import { describe, expect, it } from 'vitest';
import {
  inferTextHintsFromFilename,
  mergeDemographics,
  normalizeDateOfBirth,
  parseIdArtifactText,
} from './idArtifactParser';

describe('idArtifactParser', () => {
  it('parses labeled ID text for core demographics and blood type', () => {
    const parsed = parseIdArtifactText(`
      FIRST NAME: Maria
      LAST NAME: Garcia
      DATE OF BIRTH: 1985-03-12
      SEX: Female
      BLOOD TYPE: O+
      HEALTH CARD: HC-9922-441
      ADDRESS: 22 Queen St W, Toronto
      PHONE: 416-555-0134
    `);

    expect(parsed.firstName).toBe('Maria');
    expect(parsed.lastName).toBe('Garcia');
    expect(parsed.dateOfBirth).toBe('1985-03-12');
    expect(parsed.sex).toBe('Female');
    expect(parsed.bloodType).toBe('O+');
    expect(parsed.healthCardNumber).toBe('HC-9922-441');
    expect(parsed.address).toContain('22 Queen St W');
    expect(parsed.phone).toContain('416-555-0134');
  });

  it('normalizes slash and hyphen date formats', () => {
    expect(normalizeDateOfBirth('3/12/1985')).toBe('1985-03-12');
    expect(normalizeDateOfBirth('1985-03-12')).toBe('1985-03-12');
  });

  it('infers hints from descriptive filenames', () => {
    const hints = inferTextHintsFromFilename('Maria_Garcia_1985-03-12_O+.jpg');
    const parsed = parseIdArtifactText(hints);

    expect(parsed.firstName).toBe('Maria');
    expect(parsed.lastName).toBe('Garcia');
    expect(parsed.dateOfBirth).toBe('1985-03-12');
    expect(parsed.bloodType).toBe('O+');
  });

  it('merges demographics without overwriting populated values', () => {
    const merged = mergeDemographics(
      { firstName: 'Maria', dateOfBirth: '1985-03-12' },
      { lastName: 'Garcia', dateOfBirth: '1990-01-01' },
    );

    expect(merged).toEqual({
      firstName: 'Maria',
      lastName: 'Garcia',
      dateOfBirth: '1985-03-12',
    });
  });
});
