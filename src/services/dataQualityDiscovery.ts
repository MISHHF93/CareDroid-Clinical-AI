import type { Patient } from '../types/emergency';
import {
  assessPatientDataQualityRisks,
  summarizeDataQualityRisks,
} from '../config/dataQualityModel.js';
import { discoverDuplicatePatientPairs, type DuplicatePatientPair } from '../utils/patientDuplicateDetection';

export type DataQualityRisk = ReturnType<typeof assessPatientDataQualityRisks>[number];

export type DataQualitySnapshot = {
  duplicatePairs: DuplicatePatientPair[];
  duplicatePatientIds: Set<string>;
  summary: ReturnType<typeof summarizeDataQualityRisks>;
  topRisks: Array<DataQualityRisk & { patientId: string; patientLabel: string }>;
};

function patientLabel(patient: Patient): string {
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim();
  return name || patient.name || patient.mrn || 'Unknown patient';
}

export function buildDataQualitySnapshot(patients: Patient[] = []): DataQualitySnapshot {
  const duplicatePairs = discoverDuplicatePatientPairs(patients);
  const duplicatePatientIds = new Set<string>();

  duplicatePairs.forEach((pair) => {
    duplicatePatientIds.add(pair.patientIdA);
    duplicatePatientIds.add(pair.patientIdB);
  });

  const summary = summarizeDataQualityRisks(patients, { duplicatePatientIds });
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));

  const topRisks = Object.entries(summary.byPatient)
    .flatMap(([patientId, risks]) =>
      risks.map((risk) => ({
        ...risk,
        patientId,
        patientLabel: patientLabel(patientById.get(patientId)!),
      })),
    )
    .sort((left, right) => {
      const severityRank = { warning: 0, info: 1 };
      return (
        (severityRank[left.severity as keyof typeof severityRank] ?? 2) -
        (severityRank[right.severity as keyof typeof severityRank] ?? 2)
      );
    })
    .slice(0, 12);

  return {
    duplicatePairs,
    duplicatePatientIds,
    summary,
    topRisks,
  };
}

export function getPatientDataQualityRisks(
  patient: Patient | null | undefined,
  snapshot: Pick<DataQualitySnapshot, 'duplicatePatientIds'>,
): DataQualityRisk[] {
  if (!patient) return [];
  return assessPatientDataQualityRisks(patient, {
    duplicatePatientIds: snapshot.duplicatePatientIds,
  });
}
