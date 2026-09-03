/**
 * Centralized empty-state copy for CareDroid operational surfaces.
 * Each entry: guidance, status, nextSteps (string[]), optional action labels.
 */
export const EMPTY_STATE_COPY = Object.freeze({
  whiteboard: {
    loading: {
      title: 'Refreshing patient board',
      guidance: 'Pulling the latest patients, flags, and queue assignments.',
      status: 'Board data is syncing from CareDroid.',
      nextSteps: ['Cards will appear as soon as the refresh completes.'],
    },
    empty: {
      title: 'No active patients on the board',
      guidance: 'Patients appear here after registration, EMS conversion, or intake handoff.',
      status: 'Department board is clear.',
      nextSteps: [
        'Register a walk-in from Reception.',
        'Convert an inbound EMS unit when it arrives.',
        'Load the walkthrough dataset in Settings for a demo board.',
      ],
    },
    filtered: {
      title: 'No patients match this filter',
      guidance: 'Try a different queue lens or clear filters to see the full active board.',
      status: 'Filter is active — other patients may still be on the board.',
      nextSteps: ['Clear filters to return to the full board view.'],
    },
  },
  copilot: {
    noMessages: {
      title: 'Ask about the department',
      guidance: 'Answers use live board data. Review before any clinical action.',
      status: '',
      nextSteps: [],
    },
  },
  reception: {
    queueEms: {
      guidance: 'Ambulance patients appear here after EMS pre-arrival or conversion.',
      nextSteps: ['Open EMS Intake', 'Refresh EMS feed', 'Register a walk-in'],
    },
    queueVerification: {
      guidance: 'Patients waiting for ID check or document scan show here.',
      nextSteps: ['Start Smart Intake with identity step', 'Register walk-in'],
    },
    queuePretriage: {
      guidance: 'Registered patients waiting for triage nurse review appear here.',
      nextSteps: ['Open pretriage tab when a patient is ready', 'Register next arrival'],
    },
    recentArrivals: {
      guidance: 'Walk-ins and conversions registered in the last 30 minutes list here.',
      nextSteps: ['Register walk-in', 'Check EMS pre-arrival panel'],
    },
    emsPreArrival: {
      guidance: 'Inbound units from EMS/CAD feed display here before arrival.',
      nextSteps: ['Open EMS pipeline', 'Refresh EMS feed'],
    },
  },
  search: {
    noResults: {
      title: 'No operational matches',
      guidance: 'Search by patient name, MRN, encounter ID, referral ID, EMS unit, or queue name.',
      nextSteps: ['Try a shorter name or partial MRN', 'Register a new patient if not in system'],
    },
  },
  commandPalette: {
    noResults: {
      title: 'No matching commands or records',
      guidance:
        'Use quick actions above, or search patients, encounters, referrals, EMS, and queues.',
      nextSteps: ['Try patient name or MRN', 'Type register, intake, whiteboard, or EMS'],
    },
  },
  whoNext: {
    unassigned: {
      title: 'No patients assigned to you',
      guidance: 'Who Next recommends patients based on department queue and your assignments.',
      nextSteps: ['Check the whiteboard waiting filter', 'Ask charge nurse for assignment'],
    },
    snoozed: {
      title: 'All assigned patients snoozed',
      guidance: 'Skipped patients return automatically when the snooze timer expires.',
      status: 'Recommendations refresh on the next cycle.',
      nextSteps: ['Wait for automatic refresh', 'Open reassessment queue'],
    },
  },
  vitals: {
    none: {
      title: 'No vitals recorded',
      guidance: 'Enter a vitals set from the form below.',
      nextSteps: ['Record first set to establish baseline'],
    },
    single: {
      title: 'One vitals reading on file',
      guidance: 'Trend charts need at least two readings over time.',
      status: 'Latest values are shown in the tiles above.',
      nextSteps: ['Record a follow-up set to enable the trend chart'],
    },
  },
  protocol: {
    noComplaint: {
      title: 'Protocol hints appear after chief complaint',
      guidance: 'Enter complaint category or chief complaint during intake or triage.',
      nextSteps: ['Complete intake chief complaint field'],
    },
    noMatch: {
      title: 'No protocol bundles match',
      guidance: 'No deterministic protocol suggestion for this complaint — review manually.',
      nextSteps: ['Open Medical Tools for calculators', 'Select protocol from order set'],
    },
  },
  shift: {
    empty: {
      title: 'Shift summary will populate as patients move',
      guidance:
        'Volume, queue breaches, and LWBS metrics compute from active board data during the shift.',
      status: 'No elevated handoff signals yet.',
      nextSteps: [
        'Register or convert arrivals from Reception.',
        'Load the ED-18 walkthrough dataset in Settings for a demo shift.',
        'Generate handoff brief when charge nurse requests end-of-shift review.',
      ],
    },
  },
  strips: {
    emsClear: { label: 'All clear', hint: 'No inbound EMS units requiring attention' },
    referralClear: { label: 'All clear', hint: 'No pending or delayed referrals' },
    reassessClear: { label: 'All clear', hint: 'No reassessments due' },
    shiftClear: { label: 'Stable', hint: 'No shift handoff signals elevated' },
  },
  clinical: {
    noRiskFactors: {
      guidance: 'Risk factors populate when clinical context is available for this patient.',
    },
  },
});
