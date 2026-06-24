import { ClinicalIntentRouter } from '../data/clinicalIntentRouter';
import { patientHasScore } from '../utils/clinicalScoreCompletion';
import type { Patient } from '../types/emergency';

type ClinicalIntentCalculator = {
  id: string;
  label?: string;
};

type ClinicalIntentRoute = {
  routeId: string;
  complaint: string;
  calculators?: ClinicalIntentCalculator[];
  protocols?: string[];
  workflows?: string[];
  referrals?: string[];
  guidance?: string;
  safetyStatement?: string;
};

export type ComplaintRoute = ClinicalIntentRoute & {
  scoreIds: string[];
};

export function routeComplaint(value: string): ComplaintRoute | null {
  const route = ClinicalIntentRouter.routeComplaint(value) as ClinicalIntentRoute | null;
  if (!route) return null;

  return {
    ...route,
    scoreIds: (route.calculators || []).map((calculator) => calculator.id),
  };
}

export function hasRunScores(patient: Patient, scoreIds: string[]): boolean {
  if (!scoreIds.length) return true;
  return scoreIds.every((scoreId) => patientHasScore(patient, scoreId));
}
