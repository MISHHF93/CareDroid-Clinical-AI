import { describe, expect, it } from 'vitest';
import {
  DATA_QUALITY_RISK,
  assessPatientDataQualityRisks,
  auditDataQualityExposure,
  getMissingDemographicFields,
  hasMissingArrivalReason,
  hasMissingVerification,
  summarizeDataQualityRisks,
} from './dataQualityModel';

describe('dataQualityModel', () => {
  const completePatient = {
    id: 'p-complete',
    state: 'Waiting',
    firstName: 'Alex',
    lastName: 'Rivera',
    dob: '1990-01-02',
    sex: 'F',
    phone: '4165550101',
    mrn: 'ED-10001',
    chiefComplaint: 'Chest pain',
    flags: [],
  };

  it('flags missing demographics and verification for provisional patients', () => {
    const provisional = {
      id: 'p-prov',
      state: 'Registration',
      firstName: 'Unknown',
      lastName: 'Patient',
      dob: '',
      sex: '',
      mrn: 'TEMP-UNK-123456',
      chiefComplaint: 'Unknown identity — clinical care priority',
      flags: ['IdentityPending'],
    };

    expect(getMissingDemographicFields(provisional)).toContain('date of birth');
    expect(hasMissingArrivalReason(provisional)).toBe(true);
    expect(hasMissingVerification(provisional)).toBe(true);
  });

  it('assesses patient risks across categories', () => {
    const duplicateIds = new Set(['p-prov']);
    const risks = assessPatientDataQualityRisks(
      {
        id: 'p-prov',
        state: 'Registration',
        firstName: 'Unknown',
        lastName: 'Patient',
        dob: '',
        sex: '',
        mrn: 'TEMP-UNK-123456',
        chiefComplaint: '',
        flags: ['IdentityPending'],
      },
      { duplicatePatientIds: duplicateIds },
    );

    expect(risks.map((risk) => risk.category)).toEqual(
      expect.arrayContaining([
        DATA_QUALITY_RISK.MISSING_DEMOGRAPHICS,
        DATA_QUALITY_RISK.MISSING_ARRIVAL_REASON,
        DATA_QUALITY_RISK.MISSING_VERIFICATION,
        DATA_QUALITY_RISK.DUPLICATE_PATIENT,
      ]),
    );
  });

  it('summarizes department-level risk counts', () => {
    const summary = summarizeDataQualityRisks([completePatient, {
      ...completePatient,
      id: 'p-gap',
      chiefComplaint: '',
      mrn: 'TEMP-ID-222222',
      flags: ['IdentityPending'],
    }]);

    expect(summary.activePatientCount).toBe(2);
    expect(summary.patientsWithRisks).toBeGreaterThan(0);
  });

  it('passes exposure audit for required surfaces', () => {
    const audit = auditDataQualityExposure();
    expect(audit.passesAudit).toBe(true);
    expect(audit.surfaceCount).toBeGreaterThanOrEqual(4);
  });
});
