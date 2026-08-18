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

// Every PatientCard on the Whiteboard independently mounts a useEffect that
// calls fetchBoardingSignalsForPatient (PatientCard.tsx) -- with the cache
// above keyed per-PATIENT, a fresh page load or a cache-TTL rollover hits
// every card's cache miss at once, and each one independently called
// BoardingApi.fetchBoardedPatients() against the SAME shared-list endpoint.
// Confirmed live: with the dev board's ~70 patients, this produced ~70
// near-simultaneous identical GET /api/emergency/boarding/boarded requests
// every ~60s, correlating with an app-wide slowdown (a warm Whiteboard
// reload measured going from ~1-2s to 12.3s later in the same session).
// Sharing one in-flight request/result across every concurrent caller
// closes the fan-out at its source; the per-patient cache above still
// avoids recomputing the DERIVED signal on every render.
let sharedBoardedListPromise: ReturnType<typeof BoardingApi.fetchBoardedPatients> | null = null;
let sharedBoardedListCachedAt = 0;
let sharedBoardedListCache: Awaited<ReturnType<typeof BoardingApi.fetchBoardedPatients>> | null = null;

async function getSharedBoardedList() {
  const now = Date.now();
  if (sharedBoardedListCache && now - sharedBoardedListCachedAt < CACHE_TTL_MS) {
    return sharedBoardedListCache;
  }
  if (!sharedBoardedListPromise) {
    sharedBoardedListPromise = BoardingApi.fetchBoardedPatients().then((result) => {
      sharedBoardedListCache = result;
      sharedBoardedListCachedAt = Date.now();
      sharedBoardedListPromise = null;
      return result;
    });
  }
  return sharedBoardedListPromise;
}

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
  const boardedResult = await getSharedBoardedList();

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
  sharedBoardedListCache = null;
  sharedBoardedListCachedAt = 0;
  sharedBoardedListPromise = null;
}