export const DEFAULT_DOOR_TO_DOCTOR_EVENTS = Object.freeze([
  Object.freeze({
    patientId: 'ED-1042',
    arrivalTime: 0,
    triageTime: 18,
    providerTime: 74,
    acuity: 'ESI 3',
  }),
  Object.freeze({
    patientId: 'ED-1038',
    arrivalTime: 0,
    triageTime: 12,
    providerTime: 41,
    acuity: 'ESI 2',
  }),
  Object.freeze({
    patientId: 'ED-1027',
    arrivalTime: 0,
    triageTime: 22,
    providerTime: 88,
    acuity: 'ESI 3',
  }),
  Object.freeze({
    patientId: 'ED-1019',
    arrivalTime: 0,
    triageTime: 28,
    providerTime: 122,
    acuity: 'Sepsis review',
  }),
  Object.freeze({
    patientId: 'ED-1015',
    arrivalTime: 0,
    triageTime: 9,
    providerTime: 34,
    acuity: 'ESI 2',
  }),
  Object.freeze({
    patientId: 'ED-1009',
    arrivalTime: 0,
    triageTime: 31,
    providerTime: 67,
    acuity: 'ESI 4',
  }),
]);

const TARGETS = Object.freeze({
  doorToTriageMinutes: 15,
  triageToProviderMinutes: 35,
  doorToDoctorMinutes: 60,
});

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function median(values) {
  return percentile(values, 50);
}

function normalizeEvent(event) {
  const doorToTriageMinutes = Math.max(0, event.triageTime - event.arrivalTime);
  const triageToProviderMinutes = Math.max(0, event.providerTime - event.triageTime);
  const doorToDoctorMinutes = Math.max(0, event.providerTime - event.arrivalTime);

  return Object.freeze({
    ...event,
    doorToTriageMinutes,
    triageToProviderMinutes,
    doorToDoctorMinutes,
    targetExceeded: doorToDoctorMinutes > TARGETS.doorToDoctorMinutes,
  });
}

export const DoorToDoctorIntelligenceService = Object.freeze({
  getDashboard(events = DEFAULT_DOOR_TO_DOCTOR_EVENTS) {
    const normalized = Object.freeze(events.map(normalizeEvent));
    const doorValues = normalized.map((event) => event.doorToDoctorMinutes);
    const compliantCount = normalized.filter((event) => !event.targetExceeded).length;
    const delays = normalized
      .filter(
        (event) =>
          event.doorToTriageMinutes > TARGETS.doorToTriageMinutes ||
          event.triageToProviderMinutes > TARGETS.triageToProviderMinutes ||
          event.doorToDoctorMinutes > TARGETS.doorToDoctorMinutes,
      )
      .map((event) =>
        Object.freeze({
          patientId: event.patientId,
          acuity: event.acuity,
          severity: event.doorToDoctorMinutes >= 90 ? 'critical' : 'high',
          affectedInterval:
            event.doorToTriageMinutes > TARGETS.doorToTriageMinutes
              ? 'door-to-triage'
              : event.triageToProviderMinutes > TARGETS.triageToProviderMinutes
                ? 'triage-to-provider'
                : 'door-to-doctor',
          delayMinutes: Math.max(
            0,
            event.doorToDoctorMinutes - TARGETS.doorToDoctorMinutes,
            event.doorToTriageMinutes - TARGETS.doorToTriageMinutes,
            event.triageToProviderMinutes - TARGETS.triageToProviderMinutes,
          ),
          reason: `${event.patientId} door-to-doctor time is ${event.doorToDoctorMinutes} minutes.`,
        }),
      );
    const medianDoorToTriage = median(normalized.map((event) => event.doorToTriageMinutes));
    const medianTriageToProvider = median(normalized.map((event) => event.triageToProviderMinutes));

    return Object.freeze({
      id: 'door-to-doctor-intelligence',
      label: 'Door-to-Doctor Intelligence',
      targets: TARGETS,
      checkpoints: Object.freeze(['arrivalTime', 'triageTime', 'providerTime']),
      patients: normalized,
      kpi: Object.freeze({
        metricId: 'doorToDoctor',
        label: 'Door-to-Doctor',
        value: median(doorValues),
        unit: 'minutes',
        median: median(doorValues),
        p90: percentile(doorValues, 90),
        longestActiveWait: Math.max(...doorValues),
        targetCompliance: Math.round((compliantCount / Math.max(normalized.length, 1)) * 100),
      }),
      intervals: Object.freeze({
        doorToTriageMinutes: medianDoorToTriage,
        triageToProviderMinutes: medianTriageToProvider,
      }),
      delays: Object.freeze(delays),
      bottlenecks: Object.freeze([
        Object.freeze({
          id:
            medianDoorToTriage > TARGETS.doorToTriageMinutes
              ? 'arrival-triage-bottleneck'
              : 'provider-bottleneck',
          label:
            medianDoorToTriage > TARGETS.doorToTriageMinutes
              ? 'Arrival to triage'
              : 'Triage to provider',
          severity: delays.some((delay) => delay.severity === 'critical') ? 'critical' : 'high',
          reason:
            medianDoorToTriage > TARGETS.doorToTriageMinutes
              ? 'Arrival-to-triage time is creating early throughput delay.'
              : 'Triaged patients are waiting too long for provider assessment.',
        }),
      ]),
      staffingPressure: Object.freeze({
        state:
          medianTriageToProvider > TARGETS.triageToProviderMinutes
            ? 'provider pressure'
            : 'triage pressure',
        reason:
          medianTriageToProvider > TARGETS.triageToProviderMinutes
            ? 'Provider starts are lagging behind triage completions.'
            : 'Arrival intake and triage pace need review.',
      }),
      sourceState: 'Demo data · No live integration',
      safetyStatement:
        'Door-to-Doctor Intelligence measures throughput only. It does not assign staff or alter clinical priority.',
    });
  },
});

export default DoorToDoctorIntelligenceService;
