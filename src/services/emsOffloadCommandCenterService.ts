import EmsPreArrivalPipelineService from './emsPreArrivalPipelineService';

export const DEFAULT_EMS_HANDOFFS = Object.freeze([
  Object.freeze({
    unitId: 'Medic 2',
    patientId: 'ED-EMS-1001',
    eta: 0,
    arrivalTime: '08:05',
    handoffStartTime: '08:41',
    handoffCompleteTime: null,
    offloadDelayMinutes: 36,
    status: 'waiting handoff',
  }),
  Object.freeze({
    unitId: 'Medic 9',
    patientId: 'ED-EMS-1002',
    eta: 0,
    arrivalTime: '08:18',
    handoffStartTime: '08:42',
    handoffCompleteTime: null,
    offloadDelayMinutes: 24,
    status: 'handoff in progress',
  }),
  Object.freeze({
    unitId: 'Medic 15',
    patientId: 'ED-EMS-1003',
    eta: 0,
    arrivalTime: '08:27',
    handoffStartTime: null,
    handoffCompleteTime: null,
    offloadDelayMinutes: 19,
    status: 'waiting handoff',
  }),
  Object.freeze({
    unitId: 'Medic 6',
    patientId: 'ED-EMS-0998',
    eta: 0,
    arrivalTime: '07:52',
    handoffStartTime: '08:04',
    handoffCompleteTime: '08:21',
    offloadDelayMinutes: 29,
    status: 'offloaded',
  }),
]);

function getPressureState({ incomingCount, waitingHandoffs, longestOffloadDelay }) {
  if (waitingHandoffs >= 3 || longestOffloadDelay >= 35 || incomingCount >= 5) return 'critical';
  if (waitingHandoffs >= 1 || longestOffloadDelay >= 20 || incomingCount >= 3) return 'rising';
  return 'normal';
}

export const EmsOffloadCommandCenterService = Object.freeze({
  getDashboard(handoffs = DEFAULT_EMS_HANDOFFS) {
    const preArrival = EmsPreArrivalPipelineService.getPreArrivalDashboard();
    const activeHandoffs = Object.freeze([...handoffs].sort((a, b) => b.offloadDelayMinutes - a.offloadDelayMinutes));
    const waitingHandoffs = activeHandoffs.filter((handoff) =>
      ['waiting handoff', 'handoff in progress'].includes(handoff.status)
    );
    const longestOffloadDelay = activeHandoffs[0]?.offloadDelayMinutes || 0;
    const currentOffloadDelay = waitingHandoffs.length
      ? Math.round(waitingHandoffs.reduce((sum, handoff) => sum + handoff.offloadDelayMinutes, 0) / waitingHandoffs.length)
      : 0;
    const pressureState = getPressureState({
      incomingCount: preArrival.metrics.incomingCount,
      waitingHandoffs: waitingHandoffs.length,
      longestOffloadDelay,
    });

    return Object.freeze({
      id: 'ems-offload-command-center',
      label: 'EMS Offload Command Center',
      incomingAmbulances: preArrival.queue.incomingPatients,
      arrivalEtaTimeline: preArrival.queue.incomingPatients.map((patient) =>
        Object.freeze({
          unitId: patient.unit,
          patientId: patient.id,
          etaMinutes: patient.etaMinutes,
          riskLevel: patient.riskLevel,
          complaint: patient.complaint,
        })
      ),
      handoffs: activeHandoffs,
      metrics: Object.freeze({
        incomingAmbulances: preArrival.metrics.incomingCount,
        nextEtaMinutes: preArrival.metrics.nextEtaMinutes,
        waitingHandoffs: waitingHandoffs.length,
        currentOffloadDelay,
        longestOffloadDelay,
        pressureState,
      }),
      recommendations: Object.freeze([
        Object.freeze({
          id: 'ems-offload-review',
          title: pressureState === 'critical' ? 'Escalate EMS offload congestion' : 'Review EMS offload readiness',
          priority: pressureState === 'critical' ? 'critical' : 'urgent',
          rationale: `${waitingHandoffs.length} handoffs waiting, longest offload delay ${longestOffloadDelay} minutes, ${preArrival.metrics.incomingCount} incoming ambulances.`,
          action: 'Review available rooms, handoff ownership, triage readiness, and boarding constraints before the next EMS arrival.',
        }),
      ]),
      sourceState: 'Demo data · No live EMS integration',
      safetyStatement:
        'EMS Offload Command Center measures handoff pressure only. It does not dispatch EMS units or replace clinician handoff.',
    });
  },
});

export default EmsOffloadCommandCenterService;
