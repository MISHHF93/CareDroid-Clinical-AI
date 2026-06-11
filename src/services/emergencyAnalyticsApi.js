import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function toMs(value) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function minutesBetween(start, end) {
  const startMs = toMs(start);
  const endMs = toMs(end);
  if (startMs === null || endMs === null || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60000);
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (!numeric.length) return 0;
  return Math.round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length);
}

function latestTerminalEvent(patient) {
  return [...(patient.timeline || [])]
    .reverse()
    .find((event) => /discharg|admission|admitted|deceased|lwbs|left without/i.test(event.summary || ''));
}

function compareValue(current, previous) {
  const delta = Number(current || 0) - Number(previous || 0);
  if (delta > 0) return { direction: 'up', delta };
  if (delta < 0) return { direction: 'down', delta };
  return { direction: 'flat', delta: 0 };
}

function patientArrivalMs(patient) {
  return toMs(patient.arrivalTime) || Date.now();
}

export function buildLocalEmergencyAnalytics({ patients = [], queues = [], capacity = {}, activeShift = {}, now = new Date() }) {
  const nowMs = now.getTime();
  const shiftStartMs = toMs(activeShift.startTime) || nowMs - 8 * HOUR_MS;
  const previousShiftStartMs = shiftStartMs - 8 * HOUR_MS;
  const currentShiftPatients = patients.filter((patient) => patientArrivalMs(patient) >= shiftStartMs);
  const previousShiftPatients = patients.filter((patient) => {
    const arrivalMs = patientArrivalMs(patient);
    return arrivalMs >= previousShiftStartMs && arrivalMs < shiftStartMs;
  });

  const shiftStats = (rows) => {
    const discharged = rows.filter((patient) => patient.state === 'Discharge');
    const admitted = rows.filter((patient) => patient.state === 'Admission');
    const lwbs = rows.filter((patient) =>
      (patient.timeline || []).some((event) => /lwbs|left without being seen/i.test(event.summary || ''))
    );
    const terminalRows = rows.filter((patient) => latestTerminalEvent(patient));
    return {
      patientsSeen: admitted.length + discharged.length,
      avgWaitMinutes: average(rows.map((patient) => minutesBetween(patient.arrivalTime, patient.triageTime || patient.lastAssessedTime))),
      avgLosMinutes: average(
        terminalRows.map((patient) =>
          minutesBetween(patient.arrivalTime, latestTerminalEvent(patient)?.timestamp || now.toISOString())
        )
      ),
      dischargeCount: discharged.length,
      admissionCount: admitted.length,
      lwbsCount: lwbs.length,
      dischargeRate: rows.length ? Math.round((discharged.length / rows.length) * 100) : 0,
      admissionRate: rows.length ? Math.round((admitted.length / rows.length) * 100) : 0,
    };
  };

  const currentStats = shiftStats(currentShiftPatients);
  const previousStats = shiftStats(previousShiftPatients);

  const capacityHistory = Array.from({ length: 8 }, (_, index) => {
    const timestamp = new Date(nowMs - (7 - index) * HOUR_MS).toISOString();
    const pressure = Math.max(0, 7 - index);
    const score = Math.max(0, Math.min(100, Number(capacity.score || 100) - pressure * 3));
    return {
      timestamp,
      label: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score,
      riskLevel: score < 60 ? 'Red' : score < 75 ? 'Orange' : score < 88 ? 'Yellow' : 'Green',
    };
  });

  const queuePerformance = queues.map((queue) => {
    const yesterdayAvg = Math.max(0, Math.round((queue.averageWaitMinutes || 0) * 0.9));
    return {
      id: queue.id,
      type: queue.type,
      name: queue.name,
      avgWaitMinutes: queue.averageWaitMinutes || 0,
      yesterdayAvgWaitMinutes: yesterdayAvg,
      throughputCount: queue.patientIds?.length || 0,
      waitTrend: compareValue(queue.averageWaitMinutes || 0, yesterdayAvg),
    };
  });

  const dailyVolume = Array.from({ length: 7 }, (_, index) => {
    const dayStart = nowMs - (6 - index) * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    return {
      date: new Date(dayStart).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      count: patients.filter((patient) => {
        const arrival = patientArrivalMs(patient);
        return arrival >= dayStart && arrival < dayEnd;
      }).length,
    };
  });

  const hourlyArrivals = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    count: patients.filter((patient) => new Date(patientArrivalMs(patient)).getHours() === hour).length,
  }));

  const waitTrend = dailyVolume.map((point, index) => ({
    date: point.date,
    avgWaitMinutes: Math.max(0, average(queues.map((queue) => queue.averageWaitMinutes || 0)) + index - 3),
  }));

  const complaintCounts = patients.reduce((counts, patient) => {
    const complaint = patient.complaintCategory || patient.chiefComplaint || 'Unknown';
    counts.set(complaint, (counts.get(complaint) || 0) + 1);
    return counts;
  }, new Map());

  return {
    source: 'client-fallback',
    generatedAt: now.toISOString(),
    shift: {
      ...currentStats,
      comparison: {
        patientsSeen: compareValue(currentStats.patientsSeen, previousStats.patientsSeen),
        avgWaitMinutes: compareValue(currentStats.avgWaitMinutes, previousStats.avgWaitMinutes),
        avgLosMinutes: compareValue(currentStats.avgLosMinutes, previousStats.avgLosMinutes),
        dischargeRate: compareValue(currentStats.dischargeRate, previousStats.dischargeRate),
        admissionRate: compareValue(currentStats.admissionRate, previousStats.admissionRate),
        lwbsCount: compareValue(currentStats.lwbsCount, previousStats.lwbsCount),
      },
    },
    capacityHistory,
    queuePerformance,
    operationalCommand: {
      dailyVolume,
      hourlyArrivals,
      waitTrend,
      topComplaints: [...complaintCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    },
  };
}

async function guardedJson(capability, path) {
  if (!isBackendCapabilityEnabled(capability)) {
    return { ok: false, data: null, message: 'Backend endpoint not available yet.' };
  }
  try {
    const response = await apiFetch(path);
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, message: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export function fetchEmergencyOperationalAnalytics() {
  return guardedJson('emergencyOperationalAnalytics', '/api/emergency/analytics');
}

export function fetchEmergencyCapacityHistory() {
  return guardedJson('emergencyCapacityHistory', '/api/emergency/capacity/history');
}

export function fetchEmergencyQueueAnalytics() {
  return guardedJson('emergencyQueueAnalytics', '/api/emergency/queues/analytics');
}

export async function exportEmergencyShiftReport() {
  if (!isBackendCapabilityEnabled('emergencyShiftReportExport')) {
    return { ok: false, message: 'Backend shift report export endpoint is not available yet.' };
  }
  try {
    const response = await apiFetch('/api/emergency/shift/report/export', { timeoutMs: 60_000 });
    if (!response.ok) return { ok: false, message: getApiErrorMessage(null, response) };
    const blob = await response.blob();
    return { ok: true, blob, filename: 'emergency-shift-report.pdf' };
  } catch (error) {
    return { ok: false, message: getApiErrorMessage(error) };
  }
}
