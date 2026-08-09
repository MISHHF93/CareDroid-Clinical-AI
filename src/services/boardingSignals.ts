import BoardingApi from './boardingApi';
import type { Patient } from '../types/emergency';
import { isEmergencyOsBoarding } from '../../lib/emergency-os/logic';

export type BoardingSignalSource = 'live' | 'local' | 'unavailable';

export type BoardingSignals = {
  isBoarded: boolean;
  decisionTracked: boolean;
  boardingDurationMinutes?: number;
  source: BoardingSignalSource;
  maturity: 'live' | 'demo';
};

const boardedCache = new Map<string, { fetchedAt: number; signals: BoardingSignals }>();
const CACHE_TTL_MS = 60_000;

function signalsFromPatient(patient: Patient): BoardingSignals {
  // Previously checked a `boardingStatus` field that doesn't exist on the
  // live Patient type (only reachable via an unsafe cast) and missed both
  // Disposition and the PendingAdmission flag -- silently under-detecting
  // boarding relative to the canonical definition every other boarding
  // badge on this same PatientCard uses. This is the branch that actually
  // runs today: the real /boarding/boarded endpoint is Mongoose-gated and
  // 503s by default, so this fallback is the de facto boarding signal.
  const isBoarded = isEmergencyOsBoarding(patient);

  return {
    isBoarded,
    decisionTracked: isBoarded,
    source: 'local',
    maturity: 'demo',
  };
}

export async function fetchBoardingSignalsForPatient(
  patient: Patient,
): Promise<BoardingSignals> {
  const cached = boardedCache.get(patient.id);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.signals;
  }

  const localFallback = signalsFromPatient(patient);
  const boardedResult = await BoardingApi.fetchBoardedPatients();

  if (!boardedResult.ok || !Array.isArray(boardedResult.data)) {
    boardedCache.set(patient.id, { fetchedAt: Date.now(), signals: localFallback });
    return localFallback;
  }

  const match = boardedResult.data.find(
    (entry: { id?: string; patientId?: string; _id?: string }) =>
      entry.id === patient.id || entry.patientId === patient.id || entry._id === patient.id,
  );

  const signals: BoardingSignals = match
    ? {
        isBoarded: true,
        decisionTracked: true,
        boardingDurationMinutes: Number(match.boardingDurationMinutes || match.boardMinutes || 0) || undefined,
        source: 'live',
        maturity: 'live',
      }
    : localFallback;

  boardedCache.set(patient.id, { fetchedAt: Date.now(), signals });
  return signals;
}

export function clearBoardingSignalsCache(): void {
  boardedCache.clear();
}