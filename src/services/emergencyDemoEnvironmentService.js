const JOURNEY_BUCKETS = Object.freeze([
  Object.freeze({ state: 'waiting-room', label: 'Waiting room', count: 24 }),
  Object.freeze({ state: 'triage-queue', label: 'Triage queue', count: 14 }),
  Object.freeze({ state: 'provider-queue', label: 'Provider queue', count: 16 }),
  Object.freeze({ state: 'active-assessment', label: 'Active assessment', count: 18 }),
  Object.freeze({ state: 'results-pending', label: 'Results pending', count: 12 }),
  Object.freeze({ state: 'referral-pending', label: 'Referral pending', count: 10 }),
  Object.freeze({ state: 'boarding', label: 'Boarding', count: 9 }),
  Object.freeze({ state: 'discharge-ready', label: 'Discharge ready', count: 7 }),
  Object.freeze({ state: 'ems-prearrival', label: 'EMS pre-arrival/offload', count: 8 }),
]);

const COMPLAINTS = Object.freeze([
  'Chest pain',
  'Shortness of breath',
  'Stroke symptoms',
  'Sepsis concern',
  'Abdominal pain',
  'Trauma',
  'Behavioral health',
  'Fever',
]);

function buildDemoPatients() {
  let sequence = 1000;
  return Object.freeze(
    JOURNEY_BUCKETS.flatMap((bucket, bucketIndex) =>
      Array.from({ length: bucket.count }, (_, index) => {
        sequence += 1;
        const riskScore = 35 + ((bucketIndex * 11 + index * 7) % 62);
        return Object.freeze({
          patientId: `DEMO-ED-${sequence}`,
          label: `Sample patient DEMO-ED-${sequence}`,
          journeyState: bucket.state,
          journeyLabel: bucket.label,
          acuity: `ESI ${Math.min(5, 2 + ((bucketIndex + index) % 4))}`,
          arrivalMode: bucket.state === 'ems-prearrival' ? 'EMS' : index % 3 === 0 ? 'Walk-in' : 'Ambulatory',
          complaint: COMPLAINTS[(bucketIndex + index) % COMPLAINTS.length],
          waitDuration: 8 + bucketIndex * 9 + index * 2,
          riskScore,
          reassessmentNeed: riskScore >= 75 || bucket.state === 'waiting-room',
          dispositionState: bucket.state,
          demoLabel: 'Demo data',
        });
      })
    )
  );
}

export const EmergencyDemoEnvironmentService = Object.freeze({
  getDemoEnvironment() {
    const patients = buildDemoPatients();
    return Object.freeze({
      id: 'emergency-demo-environment',
      tenantName: 'CareDroid Emergency Demo Hospital',
      mode: 'demo',
      labels: Object.freeze(['Demo data', 'Demo tenant', 'No live integration', 'Sample patient', 'Simulated operational signal']),
      patients,
      metrics: Object.freeze({
        patientCount: patients.length,
        waitingRoomPatients: patients.filter((patient) => patient.journeyState === 'waiting-room').length,
        boardingPatients: patients.filter((patient) => patient.journeyState === 'boarding').length,
        emsPatients: patients.filter((patient) => patient.arrivalMode === 'EMS').length,
        referralPatients: patients.filter((patient) => patient.journeyState === 'referral-pending').length,
        reassessmentNeeded: patients.filter((patient) => patient.reassessmentNeed).length,
      }),
      operationalData: Object.freeze([
        'Queues',
        'Boarding',
        'EMS arrivals',
        'Referrals',
        'Capacity issues',
        'Resource shortages',
        'Escalation recommendations',
      ]),
      pressureScenarios: Object.freeze([
        'Normal weekday pressure',
        'Busy waiting room',
        'EMS congestion',
        'Boarding crisis',
        'Referral delay',
        'Capacity overload',
      ]),
      sourceState: 'Demo data · No live integration',
      safetyStatement:
        'The Emergency demo environment contains sample patients and simulated operational signals only. It is not live clinical or operational truth.',
    });
  },
});

export default EmergencyDemoEnvironmentService;
