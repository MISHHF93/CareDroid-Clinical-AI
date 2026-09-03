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
    id: 'what-happens-next',
    label: 'What happens next guidance',
    surfaces: ['WhatHappensNextPanel', 'WhatHappensNextStrip', 'whatHappensNextGuidance.ts'],
    mechanism: 'resolveWhatHappensNext from journey + queue + referral state',
  }),
  Object.freeze({
    id: 'queue-reason-visibility',
    label: 'Queue reason visibility',
    surfaces: [
      'QueueReasonBadge',
      'QueueReasonAttentionStrip',
      'ReceptionWorkQueues',
      'ReceptionThroughputAttentionCluster',
      'PatientCard',
      'queueReasonVisibility.ts',
    ],
    mechanism:
      'resolveQueueReason — awaiting triage, clinician, room, results, referral, admission bed, discharge paperwork, or verification incomplete',
  }),
  Object.freeze({
    id: 'lwbs-risk-advisory',
    label: 'LWBS advisory risk layer',
    surfaces: [
      'LwbsRiskBadge',
      'LwbsRiskStrip',
      'ReceptionThroughputAttentionCluster',
      'WaitingRoomSafetyBoard',
      'Header',
      'lwbsRiskLayer.ts',
    ],
    mechanism:
      'resolveLwbsRisk from wait, contact, congestion, and complaint context — advisory only',
  }),
  Object.freeze({
    id: 'deterioration-watch-advisory',
    label: 'Waiting room deterioration watch',
    surfaces: [
      'DeteriorationWatchBadge',
      'DeteriorationWatchStrip',
      'ReceptionThroughputAttentionCluster',
      'WaitingRoomSafetyBoard',
      'Header',
      'waitingRoomDeteriorationWatch.ts',
    ],
    mechanism:
      'resolveDeteriorationWatch from vitals, reassessment, complaint, and EMS/intake context — advisory only',
  }),
  Object.freeze({
    id: 'triage-breach-timer',
    label: 'Triage breach timer',
    surfaces: [
      'TriageBreachPanel',
      'TriageBreachStrip',
      'ReceptionWorkQueues',
      'ReceptionThroughputAttentionCluster',
      'Header',
      'EmergencyAnalytics',
      'triageBreachTimer.ts',
    ],
    mechanism: 'resolveTriageBreachTimer from arrival-to-triage elapsed time and site thresholds',
  }),
  Object.freeze({
    id: 'provider-wait-breach-timer',
    label: 'Provider wait breach timer',
    surfaces: [
      'ProviderWaitBreachPanel',
      'ProviderWaitBreachStrip',
      'WaitingRoomSafetyBoard',
      'chargeNurseWorkflowModel.ts',
      'providerWaitBreachTimer.ts',
    ],
    mechanism:
      'resolveProviderWaitBreachTimer from triage-to-provider elapsed time, CTAS thresholds, and high-risk wait exceptions',
  }),
  Object.freeze({
    id: 'waiting-room-communication-log',
    label: 'Waiting-room communication log',
    surfaces: [
      'WaitingRoomCommunicationPanel',
      'WaitingRoomCommunicationBadge',
      'WaitingRoomSafetyBoard',
      'PatientDetailPanel',
      'waitingRoomCommunicationLog.ts',
      'PatientCommunicationStatusPanel',
      'patientCommunicationStatus.ts',
    ],
    mechanism:
      'resolveCommunicationRecency from workflow audit logs, notes, and timeline — patient updated, vitals, reassess, delay informed, queue move, escalation',
  }),
  Object.freeze({
    id: 'reception-escalation-workflow',
    label: 'Reception escalation workflow',
    surfaces: [
      'ReceptionEscalationPanel',
      'ReceptionEscalationQuickActions',
      'ReceptionEscalationAttentionStrip',
      'ReceptionWorkspace',
      'Header',
      'receptionEscalationWorkflow.ts',
    ],
    mechanism:
      'submitReceptionEscalation from reception desk — notifies triage and charge nurse via alert center without leaving reception',
  }),
  Object.freeze({
    id: 'department-status-screen',
    label: 'Department status screen',
    surfaces: ['DepartmentStatusScreen', 'departmentStatusScreenModel.ts', 'emergency/index'],
    mechanism:
      'buildDepartmentStatusSnapshot for read-only wall display — aggregate metrics without PHI',
  }),
  Object.freeze({
    id: 'patient-experience-status',
    label: 'Patient experience status layer',
    surfaces: [
      'WaitingRoomStatusMessagingStrip',
      'WhatHappensNextBadge',
      'PatientExperienceStatusBadge',
      'ReceptionWorkspace',
    ],
    mechanism: 'resolvePatientExperienceStatus from journey + queue states',
  }),
  Object.freeze({
    id: 'fit-to-wait-pathway',
    label: 'Fit-to-sit / fit-to-wait pathway',
    surfaces: ['WaitingRoomSafetyBoard', 'PatientCard', 'fitToWaitPathway.ts'],
    mechanism: 'setFitToWaitClassification — staff review only',
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
    surfaces: [
      'AppShell',
      'Header',
      'PatientCard',
      'CommandPalette',
      'CapacityCrisisMode',
      'reassessmentAttentionPatients.ts',
    ],
    mechanism: 'reassessment drawer + flags',
  }),
]);

/** EMS handoff surfaces (see also emsAwarenessModel.EMS_WORKFLOW_ARTIFACTS). */
export const EMS_HANDOFF_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'ambulance-handoff-checklist',
    label: 'Ambulance handoff checklist',
    surfaces: ['AmbulanceHandoffChecklistPanel', 'EMSPipeline', 'emsOffloadTracker'],
    mechanism: 'resolveAmbulanceHandoffChecklist + updateAmbulanceHandoffChecklist',
  }),
  Object.freeze({
    id: 'ems-offload-tracker',
    label: 'EMS offload tracker',
    surfaces: [
      'EmsOffloadTrackerPanel',
      'EmsOffloadAttentionStrip',
      'ReceptionThroughputAttentionCluster',
      'EMSPipeline',
      'whiteboard',
      'Header',
    ],
    mechanism: 'buildEmsOffloadTrackerSummary + destination from handoff checklist',
  }),
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
