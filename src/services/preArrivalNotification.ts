import type {
  EMSArrival,
  MISTNotification,
  PreArrivalNotification,
  PreArrivalNotificationFramework,
  SBARNotification,
} from '../types/emergency';

export const PRE_ARRIVAL_FRAMEWORK_LABELS: Record<PreArrivalNotificationFramework, string> = {
  mist: 'MIST (Mechanism, Injuries, Signs, Treatments)',
  sbar: 'SBAR (Situation, Background, Assessment, Recommendation)',
};

export function emptyMISTNotification(): MISTNotification {
  return { mechanism: '', injuries: '', signs: '', treatments: '' };
}

export function emptySBARNotification(): SBARNotification {
  return { situation: '', background: '', assessment: '', recommendation: '' };
}

export function buildPreArrivalNotificationFromArrival(
  arrival: EMSArrival,
  framework: PreArrivalNotificationFramework = 'mist',
): PreArrivalNotification {
  const complaint = arrival.prearrivalComplaint || arrival.chiefComplaint || '';
  const vitals = arrival.vitals;
  const vitalsSummary = vitals
    ? [
        vitals.hr != null ? `HR ${vitals.hr}` : null,
        vitals.sbp != null ? `BP ${vitals.sbp}/${vitals.dbp ?? '—'}` : null,
        vitals.spo2 != null ? `SpO2 ${vitals.spo2}%` : null,
        vitals.gcs != null ? `GCS ${vitals.gcs}` : null,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  const treatments = [
    ...(arrival.medicationsEnRoute || []),
    arrival.handoffSummary || '',
    arrival.notes || '',
  ]
    .join(' ')
    .trim();

  if (framework === 'sbar') {
    return {
      framework: 'sbar',
      sbar: {
        situation: complaint,
        background: [
          `${arrival.patientAge}y ${arrival.patientSex}`,
          arrival.mechanismOfInjury ? `MOI: ${arrival.mechanismOfInjury}` : null,
          `${arrival.unitName} inbound · ETA ${arrival.eta} min`,
        ]
          .filter(Boolean)
          .join(' · '),
        assessment:
          [vitalsSummary, arrival.severity ? `Severity: ${arrival.severity}` : null]
            .filter(Boolean)
            .join(' · ') || 'Assessment pending',
        recommendation: arrival.criticalChecklist?.title || 'Standard ED reception',
      },
      source: 'integration',
    };
  }

  return {
    framework: 'mist',
    mist: {
      mechanism: arrival.mechanismOfInjury || complaint,
      injuries: complaint,
      signs: vitalsSummary || 'Vitals pending',
      treatments: treatments || 'None documented',
    },
    source: 'integration',
  };
}

export function preArrivalNotificationCompletionPercent(
  notification: PreArrivalNotification | undefined,
): number {
  if (!notification) return 0;
  const fields =
    notification.framework === 'sbar'
      ? Object.values(notification.sbar || {})
      : Object.values(notification.mist || {});
  if (!fields.length) return 0;
  const filled = fields.filter((value) => String(value || '').trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

export function isPreArrivalNotificationComplete(
  notification: PreArrivalNotification | undefined,
): boolean {
  return preArrivalNotificationCompletionPercent(notification) === 100;
}

export function mergePreArrivalNotificationPatch(
  current: PreArrivalNotification | undefined,
  patch: Partial<PreArrivalNotification>,
  actor?: { staffName?: string },
): PreArrivalNotification {
  const framework = patch.framework || current?.framework || 'mist';
  const timestamp = new Date().toISOString();
  return {
    framework,
    mist: {
      ...emptyMISTNotification(),
      ...current?.mist,
      ...patch.mist,
    },
    sbar: {
      ...emptySBARNotification(),
      ...current?.sbar,
      ...patch.sbar,
    },
    submittedAt: patch.submittedAt || current?.submittedAt || timestamp,
    submittedBy: patch.submittedBy || current?.submittedBy || actor?.staffName,
    source: patch.source || current?.source || 'staff',
  };
}

export function formatPreArrivalNotificationSummary(
  notification: PreArrivalNotification | undefined,
): string {
  if (!notification) return 'Pre-arrival notification pending';
  if (notification.framework === 'sbar' && notification.sbar) {
    return notification.sbar.situation || notification.sbar.assessment || 'SBAR notification';
  }
  if (notification.mist) {
    return notification.mist.injuries || notification.mist.mechanism || 'MIST notification';
  }
  return 'Pre-arrival notification';
}
