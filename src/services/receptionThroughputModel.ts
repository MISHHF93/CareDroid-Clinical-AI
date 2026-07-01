/**
 * Reception throughput model — simulates registration-clerk volume (e.g. 100 patients/day)
 * using existing workflow paths. Measures clicks, screens, and timing; supports before/after
 * harmonization profiles.
 */

/** Realistic ED front-desk mix for 100 arrivals/day (sums to 1.0). */
export const RECEPTION_DAILY_MIX = Object.freeze({
  expressRegister: 0.62,
  returningVerify: 0.12,
  emsArrival: 0.08,
  smartIntakeFull: 0.07,
  quickCreateVitals: 0.05,
  provisionalUnknown: 0.04,
  duplicateResolution: 0.02,
});

/** Human-factor timing constants (milliseconds). */
export const RECEPTION_TIMING_MS = Object.freeze({
  click: 1200,
  screenTransition: 450,
  fieldEntry: 2800,
  chipSelect: 600,
  searchQuery: 3500,
  duplicateReview: 8000,
  softwarePatientCreate: 35,
  softwareEncounterCreate: 28,
  softwareQueueAssign: 22,
});

/**
 * Workflow profiles — `baseline` reflects pre-harmonization UX; `harmonized` reflects
 * express-primary layout, corrected shortcuts, and auto-dismissed handoff banner.
 */
export const RECEPTION_WORKFLOW_PROFILES = Object.freeze({
  baseline: Object.freeze({
    expressRegister: Object.freeze({
      id: 'express-register',
      label: 'Express register (via secondary button)',
      screens: ['reception', 'express-modal', 'reception-arrived-banner'],
      clicks: 4,
      fields: 3,
      usesChooser: false,
      handoffBannerDismiss: true,
      entryClicks: 1,
    }),
    returningVerify: Object.freeze({
      id: 'returning-verify',
      label: 'Returning patient search + verify',
      screens: ['reception', 'smart-intake-overlay', 'reception-arrived-banner'],
      clicks: 6,
      fields: 2,
      usesChooser: false,
      handoffBannerDismiss: true,
      entryClicks: 2,
    }),
    emsArrival: Object.freeze({
      id: 'ems-arrival',
      label: 'EMS convert + verify',
      screens: ['reception', 'reception-ems-tab', 'smart-intake-overlay', 'reception-arrived-banner'],
      clicks: 7,
      fields: 3,
      usesChooser: false,
      handoffBannerDismiss: true,
      entryClicks: 2,
    }),
    smartIntakeFull: Object.freeze({
      id: 'smart-intake-full',
      label: 'Full Smart Intake (primary CTA)',
      screens: [
        'reception',
        'smart-intake-capture',
        'smart-intake-ocr',
        'smart-intake-match',
        'smart-intake-verify',
        'smart-intake-finalize',
        'reception-arrived-banner',
      ],
      clicks: 9,
      fields: 6,
      usesChooser: false,
      handoffBannerDismiss: true,
      entryClicks: 1,
    }),
    quickCreateVitals: Object.freeze({
      id: 'quick-create-vitals',
      label: 'Quick create (via More options)',
      screens: ['reception', 'prepare-chooser', 'quick-create-modal', 'reception-arrived-banner'],
      clicks: 6,
      fields: 8,
      usesChooser: true,
      handoffBannerDismiss: true,
      entryClicks: 2,
    }),
    provisionalUnknown: Object.freeze({
      id: 'provisional-unknown',
      label: 'Unknown patient (via More options)',
      screens: ['reception', 'prepare-chooser', 'reception-arrived-banner'],
      clicks: 4,
      fields: 0,
      usesChooser: true,
      handoffBannerDismiss: true,
      entryClicks: 2,
    }),
    duplicateResolution: Object.freeze({
      id: 'duplicate-resolution',
      label: 'Express with duplicate acknowledgment',
      screens: ['reception', 'express-modal', 'reception-arrived-banner'],
      clicks: 6,
      fields: 3,
      usesChooser: false,
      handoffBannerDismiss: true,
      entryClicks: 1,
      extraDuplicateReviewMs: RECEPTION_TIMING_MS.duplicateReview,
    }),
  }),
  harmonized: Object.freeze({
    expressRegister: Object.freeze({
      id: 'express-register',
      label: 'Express register (primary CTA or N shortcut)',
      screens: ['reception', 'express-modal'],
      clicks: 3,
      fields: 3,
      usesChooser: false,
      handoffBannerDismiss: false,
      entryClicks: 1,
    }),
    returningVerify: Object.freeze({
      id: 'returning-verify',
      label: 'Returning patient search + verify',
      screens: ['reception', 'smart-intake-overlay'],
      clicks: 5,
      fields: 2,
      usesChooser: false,
      handoffBannerDismiss: false,
      entryClicks: 2,
    }),
    emsArrival: Object.freeze({
      id: 'ems-arrival',
      label: 'EMS convert + verify (deep link tab)',
      screens: ['reception-ems-tab', 'smart-intake-overlay'],
      clicks: 6,
      fields: 3,
      usesChooser: false,
      handoffBannerDismiss: false,
      entryClicks: 1,
    }),
    smartIntakeFull: Object.freeze({
      id: 'smart-intake-full',
      label: 'Full Smart Intake (secondary CTA)',
      screens: [
        'reception',
        'smart-intake-capture',
        'smart-intake-ocr',
        'smart-intake-match',
        'smart-intake-verify',
        'smart-intake-finalize',
      ],
      clicks: 8,
      fields: 6,
      usesChooser: false,
      handoffBannerDismiss: false,
      entryClicks: 1,
    }),
    quickCreateVitals: Object.freeze({
      id: 'quick-create-vitals',
      label: 'Quick create (Q shortcut / quickCreate=1)',
      screens: ['reception', 'quick-create-modal'],
      clicks: 4,
      fields: 8,
      usesChooser: false,
      handoffBannerDismiss: false,
      entryClicks: 1,
    }),
    provisionalUnknown: Object.freeze({
      id: 'provisional-unknown',
      label: 'Unknown patient (More options)',
      screens: ['reception', 'prepare-chooser'],
      clicks: 3,
      fields: 0,
      usesChooser: true,
      handoffBannerDismiss: false,
      entryClicks: 2,
    }),
    duplicateResolution: Object.freeze({
      id: 'duplicate-resolution',
      label: 'Express with duplicate acknowledgment',
      screens: ['reception', 'express-modal'],
      clicks: 5,
      fields: 3,
      usesChooser: false,
      handoffBannerDismiss: false,
      entryClicks: 1,
      extraDuplicateReviewMs: RECEPTION_TIMING_MS.duplicateReview,
    }),
  }),
});

function workflowTiming(workflow, timing = RECEPTION_TIMING_MS) {
  const screenMs = Math.max(0, workflow.screens.length - 1) * timing.screenTransition;
  const clickMs = workflow.clicks * timing.click;
  const fieldMs = workflow.fields * timing.fieldEntry;
  const chooserMs = workflow.usesChooser ? timing.click + timing.screenTransition : 0;
  const bannerMs = workflow.handoffBannerDismiss ? timing.click : 0;
  const duplicateMs = workflow.extraDuplicateReviewMs || 0;

  const humanMs = screenMs + clickMs + fieldMs + chooserMs + bannerMs + duplicateMs;
  const createPatientMs =
    timing.softwarePatientCreate + workflow.fields * 12 + (workflow.fields > 5 ? 40 : 0);
  const createEncounterMs = timing.softwareEncounterCreate;
  const assignQueueMs = timing.softwareQueueAssign;

  return {
    totalMs: humanMs + createPatientMs + createEncounterMs + assignQueueMs,
    humanMs,
    createPatientMs,
    createEncounterMs,
    assignQueueMs,
    screenMs,
    clickMs,
    fieldMs,
    chooserMs,
    bannerMs,
    duplicateMs,
  };
}

function workflowMetrics(workflow, timing = RECEPTION_TIMING_MS) {
  const times = workflowTiming(workflow, timing);
  return {
    workflowId: workflow.id,
    label: workflow.label,
    clicksPerRegistration: workflow.clicks,
    screensVisited: workflow.screens.length,
    timeToCreatePatientMs: times.createPatientMs + times.fieldMs + times.clickMs * 0.35,
    timeToCreateEncounterMs: times.createEncounterMs,
    timeToAssignQueueMs: times.assignQueueMs,
    totalRegistrationMs: times.totalMs,
    humanMs: times.humanMs,
    screens: [...workflow.screens],
    unnecessaryStepsRemoved: workflow.handoffBannerDismiss === false && workflow.usesChooser === false,
  };
}

/**
 * Build a deterministic 100-patient day from the daily mix.
 */
export function buildReceptionDayCohort(patientCount = 100, mix = RECEPTION_DAILY_MIX) {
  const entries = Object.entries(mix);
  const cohort = [] as any[];
  let assigned = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const [workflowKey, ratio] = entries[index];
    const isLast = index === entries.length - 1;
    const count = isLast ? patientCount - assigned : Math.round(patientCount * ratio);
    assigned += count;
    for (let patient = 0; patient < count; patient += 1) {
      cohort.push(workflowKey);
    }
  }

  while (cohort.length < patientCount) cohort.push('expressRegister');
  while (cohort.length > patientCount) cohort.pop();

  return cohort;
}

/**
 * Simulate one reception day and aggregate throughput metrics.
 */
export function simulateReceptionDay(options: any = {}) {
  const patientCount = options.patientCount ?? 100;
  const profileName = options.profile ?? 'harmonized';
  const mix = options.mix ?? RECEPTION_DAILY_MIX;
  const timing = options.timing ?? RECEPTION_TIMING_MS;
  const profiles = options.profiles ?? RECEPTION_WORKFLOW_PROFILES;
  const profile = profiles[profileName];

  if (!profile) {
    throw new Error(`Unknown reception workflow profile: ${profileName}`);
  }

  const cohort = buildReceptionDayCohort(patientCount, mix);
  const perPatient = [] as any[];
  const byWorkflow: any = {};

  for (const workflowKey of cohort) {
    const workflow = profile[workflowKey];
    if (!workflow) continue;
    const metrics = workflowMetrics(workflow, timing);
    perPatient.push(metrics);

    if (!byWorkflow[workflowKey]) {
      byWorkflow[workflowKey] = { count: 0, totals: null };
    }
    byWorkflow[workflowKey].count += 1;
    const bucket = byWorkflow[workflowKey].totals || {
      clicks: 0,
      screens: 0,
      createPatientMs: 0,
      createEncounterMs: 0,
      assignQueueMs: 0,
      totalMs: 0,
    };
    bucket.clicks += metrics.clicksPerRegistration;
    bucket.screens += metrics.screensVisited;
    bucket.createPatientMs += metrics.timeToCreatePatientMs;
    bucket.createEncounterMs += metrics.timeToCreateEncounterMs;
    bucket.assignQueueMs += metrics.timeToAssignQueueMs;
    bucket.totalMs += metrics.totalRegistrationMs;
    byWorkflow[workflowKey].totals = bucket;
  }

  const totals = perPatient.reduce(
    (acc, entry) => {
      acc.clicks += entry.clicksPerRegistration;
      acc.screens += entry.screensVisited;
      acc.createPatientMs += entry.timeToCreatePatientMs;
      acc.createEncounterMs += entry.timeToCreateEncounterMs;
      acc.assignQueueMs += entry.timeToAssignQueueMs;
      acc.totalMs += entry.totalRegistrationMs;
      acc.humanMs += entry.humanMs;
      return acc;
    },
    {
      clicks: 0,
      screens: 0,
      createPatientMs: 0,
      createEncounterMs: 0,
      assignQueueMs: 0,
      totalMs: 0,
      humanMs: 0,
    },
  );

  const count = perPatient.length || 1;

  return {
    profile: profileName,
    patientCount: count,
    mix,
    averages: {
      clicksPerRegistration: round(totals.clicks / count, 2),
      screensVisited: round(totals.screens / count, 2),
      timeToCreatePatientMs: round(totals.createPatientMs / count, 0),
      timeToCreateEncounterMs: round(totals.createEncounterMs / count, 0),
      timeToAssignQueueMs: round(totals.assignQueueMs / count, 0),
      totalRegistrationMs: round(totals.totalMs / count, 0),
      totalRegistrationMinutes: round(totals.totalMs / count / 60000, 2),
    },
    dayTotals: {
      clicks: totals.clicks,
      screens: totals.screens,
      registrationMinutes: round(totals.totalMs / 60000, 1),
      humanHours: round(totals.humanMs / 3600000, 2),
    },
    byWorkflow: Object.fromEntries(
      Object.entries(byWorkflow).map(([key, value]: [string, any]) => [
        key,
        {
          count: value.count,
          share: round(value.count / count, 3),
          averages: {
            clicksPerRegistration: round(value.totals.clicks / value.count, 2),
            screensVisited: round(value.totals.screens / value.count, 2),
            totalRegistrationMs: round(value.totals.totalMs / value.count, 0),
          },
        },
      ]),
    ),
  };
}

function listHarmonizationWins(baselineProfile, harmonizedProfile, mix, patientCount, timing) {
  const profiles = { baseline: baselineProfile, harmonized: harmonizedProfile };
  const baseline = simulateReceptionDay({
    profile: 'baseline',
    patientCount,
    mix,
    timing,
    profiles,
  });
  const harmonized = simulateReceptionDay({
    profile: 'harmonized',
    patientCount,
    mix,
    timing,
    profiles,
  });

  return [
    {
      id: 'express-primary',
      summary: 'Express register promoted to primary CTA; N shortcut opens express modal.',
      clicksSaved: baseline.dayTotals.clicks - harmonized.dayTotals.clicks,
      minutesSaved: round(
        (baseline.dayTotals.registrationMinutes - harmonized.dayTotals.registrationMinutes),
        1,
      ),
    },
    {
      id: 'auto-dismiss-handoff',
      summary: 'Handoff success banner auto-clears — no "Next arrival" click per patient.',
      clicksSavedPerPatient: 1,
    },
    {
      id: 'quick-create-shortcut',
      summary: 'open-reception-quick-create and ?quickCreate=1 open QuickIntake directly (skip chooser).',
      chooserStepsRemoved: 1,
    },
    {
      id: 'automated-encounter-queue',
      summary: 'completeIntakeHandoff creates encounter and assigns triage queue in software time.',
      encounterMs: RECEPTION_TIMING_MS.softwareEncounterCreate,
      queueMs: RECEPTION_TIMING_MS.softwareQueueAssign,
    },
  ];
}

export function compareReceptionProfiles(patientCount = 100) {
  const baseline = simulateReceptionDay({ profile: 'baseline', patientCount });
  const harmonized = simulateReceptionDay({ profile: 'harmonized', patientCount });

  return {
    patientCount,
    baseline: baseline.averages,
    harmonized: harmonized.averages,
    delta: {
      clicksPerRegistration: round(
        baseline.averages.clicksPerRegistration - harmonized.averages.clicksPerRegistration,
        2,
      ),
      screensVisited: round(
        baseline.averages.screensVisited - harmonized.averages.screensVisited,
        2,
      ),
      totalRegistrationMinutes: round(
        baseline.averages.totalRegistrationMinutes - harmonized.averages.totalRegistrationMinutes,
        2,
      ),
      dayClicksSaved: baseline.dayTotals.clicks - harmonized.dayTotals.clicks,
      dayMinutesSaved: round(
        baseline.dayTotals.registrationMinutes - harmonized.dayTotals.registrationMinutes,
        1,
      ),
    },
    optimizations: listHarmonizationWins(
      RECEPTION_WORKFLOW_PROFILES.baseline,
      RECEPTION_WORKFLOW_PROFILES.harmonized,
      RECEPTION_DAILY_MIX,
      patientCount,
      RECEPTION_TIMING_MS,
    ),
  };
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
