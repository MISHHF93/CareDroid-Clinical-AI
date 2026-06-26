import type { Patient } from '../../src/types/emergency';
import {
  listCompletedScoreIds as listCompletedScoreIdsFromPatient,
  SCORE_ALIASES,
} from '../../src/utils/clinicalScoreCompletion';
import type { ComplaintRouteSnapshot } from './orchestrationTypes';

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function listCompletedScoreIds(patient: Patient): string[] {
  return listCompletedScoreIdsFromPatient(patient);
}

export function resolveComplaintRouteSnapshot(
  complaintText: string,
  route: {
    routeId: string;
    complaint: string;
    calculators?: Array<{ id: string; label?: string }>;
    guidance?: string;
    safetyStatement?: string;
  } | null,
): ComplaintRouteSnapshot | null {
  if (!route) return null;
  const calculators = route.calculators || [];
  return {
    routeId: route.routeId,
    complaint: route.complaint,
    scoreIds: calculators.map((calculator) => calculator.id),
    calculatorLabels: calculators.map((calculator) => calculator.label || calculator.id),
    guidance: route.guidance,
    safetyStatement: route.safetyStatement,
  };
}

export function listMissingScoreIds(
  complaintRoute: ComplaintRouteSnapshot | null,
  completedScoreIds: string[],
): string[] {
  if (!complaintRoute?.scoreIds?.length) return [];
  const completed = new Set(completedScoreIds.map(normalize));
  return complaintRoute.scoreIds.filter((scoreId) => {
    const aliases = [scoreId, ...(SCORE_ALIASES[scoreId] || [])].map(normalize);
    return !aliases.some((alias) => completed.has(alias));
  });
}