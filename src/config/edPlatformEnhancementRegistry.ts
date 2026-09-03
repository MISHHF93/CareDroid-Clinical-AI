/**
 * Master prompt normalization — maps industry ED practices to CareDroid implementation tracks.
 * Used for planning, provenance labels, and incremental delivery against the canonical spec.
 */

export type EnhancementMaturity = 'live' | 'partial' | 'demo' | 'planned' | 'missing';

export type EnhancementPillar =
  | 'digital_front_door'
  | 'whiteboard_command'
  | 'predictive_intelligence'
  | 'pre_arrival'
  | 'governance_safety';

export interface EdPlatformEnhancement {
  id: string;
  pillar: EnhancementPillar;
  title: string;
  maturity: EnhancementMaturity;
  humanReviewRequired: boolean;
  primarySurfaces: readonly string[];
  implementationHooks: readonly string[];
  gapSummary: string;
}

export const ED_PLATFORM_ENHANCEMENTS: readonly EdPlatformEnhancement[] = [
  {
    id: 'self-arrival-checkin',
    pillar: 'digital_front_door',
    title: 'Self-service check-in (kiosk / mobile)',
    maturity: 'partial',
    humanReviewRequired: true,
    primarySurfaces: ['/emergency/self-arrival', '/emergency/reception'],
    implementationHooks: [
      'src/components/reception/SelfCheckin.tsx',
      'src/pages/emergency/SelfArrivalCheckIn.tsx',
      'src/services/selfCheckinService.ts',
      'src/engine/selfArrivalTriageEngine.ts',
      'src/services/smartIntakeApi.ts',
    ],
    gapSummary:
      'Patient-facing capture exists; live EHR write-back and kiosk device enrollment remain tenant-configured.',
  },
  {
    id: 'algorithmic-triage-streaming',
    pillar: 'digital_front_door',
    title: 'Initial acuity suggestion and care-area streaming',
    maturity: 'partial',
    humanReviewRequired: true,
    primarySurfaces: ['/emergency/self-arrival', '/emergency/reception'],
    implementationHooks: ['src/engine/selfArrivalTriageEngine.ts', 'engine/triageEngine.ts'],
    gapSummary:
      'Rule-based P1–P5 and streaming lanes implemented; full ESI workflow and nurse sign-off UI still expanding.',
  },
  {
    id: 'whiteboard-operational-icons',
    pillar: 'whiteboard_command',
    title: 'Universal whiteboard status icons and automated events',
    maturity: 'partial',
    humanReviewRequired: false,
    primarySurfaces: ['/emergency/whiteboard'],
    implementationHooks: [
      'src/config/edOperationalStandards.ts',
      'src/utils/whiteboardOperationalEvents.ts',
      'src/components/whiteboard/WhiteboardOperationalIconStrip.tsx',
    ],
    gapSummary:
      'Icon vocabulary and event derivation added; live bed-management ADT feed not yet connected.',
  },
  {
    id: 'boarding-capacity-visibility',
    pillar: 'whiteboard_command',
    title: 'Boarding and bed capacity command view',
    maturity: 'partial',
    humanReviewRequired: false,
    primarySurfaces: ['/emergency/boarding', '/emergency/capacity'],
    implementationHooks: [
      'backend/src/services/boarding.service.ts',
      'src/components/AppShell.tsx',
    ],
    gapSummary:
      'Backend boarding APIs are live; frontend intelligence layer still uses demo fixtures in places.',
  },
  {
    id: 'adta-anticipated-admission',
    pillar: 'predictive_intelligence',
    title: 'Anticipated decision to admit (ADTA) score',
    maturity: 'demo',
    humanReviewRequired: true,
    primarySurfaces: ['/emergency/whiteboard', '/emergency/command-center'],
    implementationHooks: ['src/engine/anticipatedAdmissionScore.ts'],
    gapSummary:
      'Explainable heuristic ADTA implemented for staff review; hospital-local calibration and ML training are planned.',
  },
  {
    id: 'bottleneck-identification',
    pillar: 'predictive_intelligence',
    title: 'Journey bottleneck identification',
    maturity: 'partial',
    humanReviewRequired: false,
    primarySurfaces: ['/emergency/command-center', '/emergency/whiteboard'],
    implementationHooks: [
      'src/components/whiteboard/commandCenterThroughputModel.ts',
      'src/utils/whiteboardOperationalEvents.ts',
    ],
    gapSummary:
      'Rule-based bottleneck events on patient cards; backend OI still fixture-sourced for department-wide analytics.',
  },
  {
    id: 'ems-pre-arrival-placeholder',
    pillar: 'pre_arrival',
    title: 'EMS / call-in pre-arrival placeholder workflow',
    maturity: 'partial',
    humanReviewRequired: true,
    primarySurfaces: ['/emergency/reception', '/emergency/whiteboard', '/emergency/ems'],
    implementationHooks: [
      'src/services/preArrivalWorkflow.ts',
      'src/pages/emergency/ReceptionWorkspace.tsx',
    ],
    gapSummary:
      'Placeholder registration and arrival check-in normalized; live CAD/FHIR EMS feed still integration-dependent.',
  },
  {
    id: 'governance-provenance-labels',
    pillar: 'governance_safety',
    title: 'Human-review mandate and demo/live provenance',
    maturity: 'partial',
    humanReviewRequired: true,
    primarySurfaces: ['all ED suites'],
    implementationHooks: [
      'lib/ai/safetyPolicy.ts',
      'src/components/emergency/EdDataSourceBanner.tsx',
      'src/config/edOperationalStandards.ts',
    ],
    gapSummary:
      'Governance infra is strong; per-widget provenance on all operational signals is still being extended.',
  },
  {
    id: 'structured-pre-arrival-mist-sbar',
    pillar: 'pre_arrival',
    title: 'Structured pre-arrival notification (MIST / SBAR)',
    maturity: 'partial',
    humanReviewRequired: true,
    primarySurfaces: ['/emergency/ems', '/emergency/reception'],
    implementationHooks: [
      'src/services/preArrivalNotification.ts',
      'src/components/ems/PreArrivalNotificationForm.tsx',
      'src/services/preArrivalWorkflow.ts',
    ],
    gapSummary:
      'Electronic MIST/SBAR forms and placeholder cards implemented; live CAD/ePCR auto-population remains integration-dependent.',
  },
  {
    id: 'resource-activation-logic',
    pillar: 'pre_arrival',
    title: 'Pre-arrival resource activation recommendations',
    maturity: 'partial',
    humanReviewRequired: true,
    primarySurfaces: ['/emergency/ems', '/emergency/command-center', '/emergency/whiteboard'],
    implementationHooks: [
      'src/services/resourceActivation.ts',
      'src/components/ems/ResourceActivationStrip.tsx',
    ],
    gapSummary:
      'Rule-based STEMI/stroke/trauma activations surface on EMS and command views; tenant-specific activation playbooks are configurable next.',
  },
  {
    id: 'handoff-close-checkpoint',
    pillar: 'pre_arrival',
    title: 'Structured handoff close workflow',
    maturity: 'partial',
    humanReviewRequired: true,
    primarySurfaces: ['/emergency/ems'],
    implementationHooks: [
      'src/services/handoffClose.ts',
      'src/components/ems/HandoffClosePanel.tsx',
    ],
    gapSummary:
      'Receiving clinician confirmation checkpoint added; EHR documentation write-back is planned.',
  },
  {
    id: 'patient-room-whiteboard',
    pillar: 'digital_front_door',
    title: 'Patient-facing in-room digital whiteboard',
    maturity: 'partial',
    humanReviewRequired: false,
    primarySurfaces: ['/emergency/patient-room'],
    implementationHooks: [
      'src/components/patient-experience/PatientRoomWhiteboard.tsx',
      'src/utils/patientRoomWhiteboardModel.ts',
      'src/utils/patientFriendlyTerminology.ts',
    ],
    gapSummary:
      'Read-only patient-friendly view derived from clinical whiteboard data; kiosk enrollment per room is tenant-configured.',
  },
  {
    id: 'digital-door-signage',
    pillar: 'whiteboard_command',
    title: 'Smart room digital door signage',
    maturity: 'partial',
    humanReviewRequired: false,
    primarySurfaces: ['/emergency/patient-room', '/emergency/whiteboard'],
    implementationHooks: [
      'src/components/whiteboard/DigitalDoorSign.tsx',
      'src/utils/digitalDoorSignModel.ts',
    ],
    gapSummary:
      'Auto-updating door signs from patient card data; physical display hardware pairing is out of band.',
  },
  {
    id: 'journey-prediction-ml',
    pillar: 'predictive_intelligence',
    title: 'ML-ready patient journey prediction',
    maturity: 'demo',
    humanReviewRequired: true,
    primarySurfaces: ['/emergency/whiteboard', '/emergency/command-center'],
    implementationHooks: [
      'src/engine/patientJourneyPrediction.ts',
      'src/components/predictive/JourneyPredictionBadge.tsx',
    ],
    gapSummary:
      'Explainable feature-weighted predictor for admission, prolonged LOS, and CXR utilization; hospital-local XGBoost training is planned.',
  },
  {
    id: 'command-center-surge-mode',
    pillar: 'whiteboard_command',
    title: 'Command center surge / crisis dashboards',
    maturity: 'partial',
    humanReviewRequired: false,
    primarySurfaces: ['/emergency/command-center'],
    implementationHooks: [
      'src/services/commandCenterSurgeModel.ts',
      'src/components/whiteboard/CommandCenterSurgePanel.tsx',
      'src/components/whiteboard/commandCenterThroughputModel.ts',
    ],
    gapSummary:
      'RAG thresholds, zone occupancy, and surge/crisis mode added; full RHOCC-style external transfer feeds remain integration-dependent.',
  },
] as const;

export function enhancementsForPillar(pillar: EnhancementPillar): EdPlatformEnhancement[] {
  return ED_PLATFORM_ENHANCEMENTS.filter((entry) => entry.pillar === pillar);
}

export function enhancementById(id: string): EdPlatformEnhancement | undefined {
  return ED_PLATFORM_ENHANCEMENTS.find((entry) => entry.id === id);
}
