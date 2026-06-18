/** Intake and board patient handoff surfaces. */
export const PATIENT_HANDOFF_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'intake-handoff',
    label: 'Post-intake handoff',
    surfaces: ['receptionHandoff.ts', 'ReceptionWorkspace', 'SmartIntake', 'QuickIntake'],
    mechanism: 'completeIntakeHandoff → triage queue + encounter',
  }),
  Object.freeze({
    id: 'encounter-chain',
    label: 'Encounter chain',
    surfaces: ['intakeEncounter.ts', 'intakeEncounterChain.ts'],
    mechanism: 'ensureEncounterAfterIntake',
  }),
  Object.freeze({
    id: 'queue-assignment',
    label: 'Queue assignment',
    surfaces: ['queueAssignment.ts', 'ReceptionWorkQueues'],
    mechanism: 'enterTriageQueue / enterWaitingQueue',
  }),
  Object.freeze({
    id: 'shift-snapshot',
    label: 'Shift snapshot patient metrics',
    surfaces: ['ShiftHandoffStrip', 'OperationalHandoffDomainBar'],
    mechanism: 'waiting · high risk · reassess due',
  }),
  Object.freeze({
    id: 'whiteboard-filters',
    label: 'Whiteboard patient filters',
    surfaces: ['emergency/index'],
    mechanism: 'Waiting · High Risk · Reassess filters',
  }),
  Object.freeze({
    id: 'patient-card',
    label: 'Patient card workflow',
    surfaces: ['PatientCard', 'PatientDetailPanel'],
    mechanism: 'resolvePatientCardWorkflowProfile',
  }),
  Object.freeze({
    id: 'who-next',
    label: 'Who next panel',
    surfaces: ['WhoNextPanel'],
    mechanism: 'priority scoring + select patient',
  }),
  Object.freeze({
    id: 'reassessment-surfaces',
    label: 'Reassessment attention',
    surfaces: ['AppShell', 'Header', 'PatientCard', 'CommandPalette', 'CapacityCrisisMode'],
    mechanism: 'reassessment drawer + flags',
  }),
]);

/** EMS handoff surfaces (see also emsAwarenessModel.EMS_WORKFLOW_ARTIFACTS). */
export const EMS_HANDOFF_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'ems-pipeline',
    label: 'EMS pipeline route',
    surfaces: ['EMSPipeline', 'App'],
    mechanism: 'emergencyEms route',
  }),
  Object.freeze({
    id: 'pre-arrival-panel',
    label: 'Reception pre-arrival panel',
    surfaces: ['EmsPreArrivalPanel'],
    mechanism: 'emsArrivalDisplay ETA + severity',
  }),
  Object.freeze({
    id: 'pressure-score',
    label: 'EMS pressure score',
    surfaces: ['EMSPressureScore', 'ChatInterface'],
    mechanism: 'calculateEMSPressureScore',
  }),
  Object.freeze({
    id: 'whiteboard-mission',
    label: 'Whiteboard mission EMS card',
    surfaces: ['emergency/index'],
    mechanism: 'prepareEMSBay + convertEMSArrivalToPatient',
  }),
  Object.freeze({
    id: 'charge-strip',
    label: 'Charge nurse EMS metric',
    surfaces: ['ChargeNurseOperationalStrip'],
    mechanism: 'filter-ems',
  }),
  Object.freeze({
    id: 'operational-domain-bar',
    label: 'Operational handoff EMS domain',
    surfaces: ['OperationalHandoffDomainBar'],
    mechanism: 'inbound · handoff · high risk',
  }),
]);

/** Referral handoff surfaces (see also referralAwarenessModel.REFERRAL_WORKFLOW_ARTIFACTS). */
export const REFERRAL_HANDOFF_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'referral-panel',
    label: 'Referral panel queues',
    surfaces: ['ReferralPanel', 'App'],
    mechanism: 'emergencyReferrals route',
  }),
  Object.freeze({
    id: 'patient-card',
    label: 'Patient card referral signals',
    surfaces: ['PatientCard'],
    mechanism: 'store.referrals by patientId',
  }),
  Object.freeze({
    id: 'whiteboard-queue',
    label: 'Referral queue filter',
    surfaces: ['emergency/index', 'queueAssignment'],
    mechanism: 'referral queue filter',
  }),
  Object.freeze({
    id: 'operational-metric',
    label: 'Referrals pending metric',
    surfaces: ['emergencyStore', 'Header'],
    mechanism: 'referralsPending operational summary',
  }),
  Object.freeze({
    id: 'referral-hub',
    label: 'ReferralHub delay analytics',
    surfaces: ['referralHub.js'],
    mechanism: 'stage elapsed thresholds',
  }),
  Object.freeze({
    id: 'operational-domain-bar',
    label: 'Operational handoff referral domain',
    surfaces: ['OperationalHandoffDomainBar'],
    mechanism: 'pending · delayed · accepted',
  }),
]);

/** Admission and boarding handoff surfaces. */
export const ADMISSION_HANDOFF_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'boarding-route',
    label: 'Boarding route',
    surfaces: ['App', 'emergency/boarding'],
    mechanism: 'emergencyBoarding canonical route',
  }),
  Object.freeze({
    id: 'boarding-intelligence',
    label: 'Boarding intelligence',
    surfaces: ['boardingIntelligenceEngine.js'],
    mechanism: 'getBoardingDashboard pending beds + longest boarders',
  }),
  Object.freeze({
    id: 'shift-boarders',
    label: 'Shift snapshot boarders',
    surfaces: ['shiftHandoffSnapshotModel', 'OperationalHandoffDomainBar'],
    mechanism: 'filter-boarding',
  }),
  Object.freeze({
    id: 'charge-boarding',
    label: 'Charge nurse boarding metric',
    surfaces: ['ChargeNurseOperationalStrip', 'chargeNurseWorkflowModel'],
    mechanism: 'filter-boarding + central boardingStatus',
  }),
  Object.freeze({
    id: 'pending-admission-flag',
    label: 'Pending admission flag',
    surfaces: ['PatientCard', 'emergencyStore'],
    mechanism: 'PatientFlag.PendingAdmission + PatientState.Admission',
  }),
  Object.freeze({
    id: 'capacity-crisis',
    label: 'Capacity crisis boarding CTA',
    surfaces: ['CapacityCrisisMode'],
    mechanism: 'boarding pressure escalation',
  }),
]);

export const OPERATIONAL_HANDOFF_DOMAINS = Object.freeze([
  Object.freeze({
    id: 'patient',
    label: 'Patient',
    artifacts: PATIENT_HANDOFF_ARTIFACTS,
  }),
  Object.freeze({
    id: 'ems',
    label: 'EMS',
    artifacts: EMS_HANDOFF_ARTIFACTS,
  }),
  Object.freeze({
    id: 'referral',
    label: 'Referral',
    artifacts: REFERRAL_HANDOFF_ARTIFACTS,
  }),
  Object.freeze({
    id: 'admission',
    label: 'Admission',
    artifacts: ADMISSION_HANDOFF_ARTIFACTS,
  }),
]);

export function listOperationalHandoffArtifacts(domainId = null) {
  if (domainId) {
    const domain = OPERATIONAL_HANDOFF_DOMAINS.find((entry) => entry.id === domainId);
    return domain ? Object.freeze([...domain.artifacts]) : Object.freeze([]);
  }

  return Object.freeze(
    OPERATIONAL_HANDOFF_DOMAINS.flatMap((domain) =>
      domain.artifacts.map((artifact) =>
        Object.freeze({
          ...artifact,
          domainId: domain.id,
          domainLabel: domain.label,
        }),
      ),
    ),
  );
}

export function summarizeArtifactDiscovery() {
  const byDomain = Object.fromEntries(
    OPERATIONAL_HANDOFF_DOMAINS.map((domain) => [
      domain.id,
      Object.freeze({
        label: domain.label,
        artifactCount: domain.artifacts.length,
        artifacts: domain.artifacts.map((artifact) => artifact.id),
        surfaces: Object.freeze([
          ...new Set(domain.artifacts.flatMap((artifact) => artifact.surfaces)),
        ]),
      }),
    ]),
  );

  return Object.freeze({
    domainCount: OPERATIONAL_HANDOFF_DOMAINS.length,
    totalArtifacts: listOperationalHandoffArtifacts().length,
    byDomain,
    recommendation:
      'Mount OperationalHandoffDomainBar on the whiteboard so clinicians read Patient, EMS, Referral, and Admission summaries in one row.',
  });
}
