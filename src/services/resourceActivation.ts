import type {
  EMSArrival,
  Patient,
  ResourceActivationRecommendation,
  ResourceActivationType,
} from '../types/emergency';
import { PatientFlag } from '../types/emergency';

const ACTIVATION_LABELS: Record<ResourceActivationType, string> = {
  stemi: 'STEMI — Cath lab mobilization',
  'stroke-alert': 'Stroke alert — CT + neurology',
  'trauma-level-1': 'Level I trauma activation',
  'trauma-level-2': 'Level II trauma activation',
  'sepsis-bundle': 'Sepsis bundle activation',
  'ob-emergency': 'OB emergency team',
  'respiratory-failure': 'Respiratory failure — airway team',
};

function pushActivation(
  activations: ResourceActivationRecommendation[],
  seen: Set<ResourceActivationType>,
  entry: ResourceActivationRecommendation,
): void {
  if (seen.has(entry.type)) return;
  seen.add(entry.type);
  activations.push(entry);
}

export function deriveResourceActivations(
  arrival: EMSArrival,
  patient?: Patient | null,
): ResourceActivationRecommendation[] {
  const activations: ResourceActivationRecommendation[] = [];
  const seen = new Set<ResourceActivationType>();
  const complaint = [
    arrival.chiefComplaint,
    arrival.prearrivalComplaint,
    arrival.mechanismOfInjury,
    patient?.chiefComplaint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    arrival.criticalChecklist?.type === 'stemi' ||
    /\b(stemi|st elevation|acs|mi)\b/i.test(complaint)
  ) {
    pushActivation(activations, seen, {
      type: 'stemi',
      label: ACTIVATION_LABELS.stemi,
      priority: 'immediate',
      confidence: arrival.criticalChecklist?.type === 'stemi' ? 0.95 : 0.82,
      rationale: ['Chest pain / STEMI pattern in pre-arrival data'],
    });
  }

  if (
    arrival.criticalChecklist?.type === 'stroke' ||
    /\b(stroke|cva|facial droop|aphasia|hemiparesis|tpa)\b/i.test(complaint) ||
    patient?.flags.includes(PatientFlag.StrokeCode)
  ) {
    pushActivation(activations, seen, {
      type: 'stroke-alert',
      label: ACTIVATION_LABELS['stroke-alert'],
      priority: 'immediate',
      confidence: arrival.criticalChecklist?.type === 'stroke' ? 0.94 : 0.86,
      rationale: ['Stroke alert criteria in complaint or flags'],
    });
  }

  if (
    arrival.criticalChecklist?.type === 'trauma' ||
    /\b(trauma|mvc|gsw|penetrating|fall from)\b/i.test(complaint)
  ) {
    // HEAL-179: this branch previously only looked at complaint text (arrival.severity /
    // "unstable"|"hemorrhage"|"airway" keywords) to pick level-1 vs level-2, even though the
    // sibling respiratory-failure branch above already reads real arrival.vitals.spo2 for its
    // own trigger -- pre-arrival vitals were sitting right there, unused, for the one decision
    // (trauma activation level) where they matter most. SBP<90 and GCS<=8 aren't invented
    // cutoffs: SBP<90 already means "not stable" in checkStableVitals-style logic elsewhere in
    // this codebase, and GCS<=8 ("protect the airway") is the standard, near-universal ATLS
    // trauma-team-activation threshold -- unlike a discharge pain-control cutoff, this isn't a
    // soft/contested policy call.
    const sbp = arrival.vitals?.sbp != null ? Number(arrival.vitals.sbp) : null;
    const gcs = arrival.vitals?.gcs != null ? Number(arrival.vitals.gcs) : null;
    const hemodynamicallyUnstable = sbp != null && Number.isFinite(sbp) && sbp < 90;
    const severeHeadInjury = gcs != null && Number.isFinite(gcs) && gcs <= 8;
    const vitalsCorroborate = hemodynamicallyUnstable || severeHeadInjury;
    const level =
      arrival.severity === 'Critical' ||
      /\b(unstable|hemorrhage|airway)\b/i.test(complaint) ||
      vitalsCorroborate
        ? 'trauma-level-1'
        : 'trauma-level-2';
    const baseConfidence = arrival.criticalChecklist?.type === 'trauma' ? 0.9 : 0.78;
    const rationale = [
      `Trauma mechanism: ${arrival.mechanismOfInjury || 'documented in complaint'}`,
    ];
    if (hemodynamicallyUnstable) rationale.push(`Hypotensive on arrival (SBP ${sbp} mmHg)`);
    if (severeHeadInjury) rationale.push(`Severe head injury on arrival (GCS ${gcs})`);
    pushActivation(activations, seen, {
      type: level,
      label: ACTIVATION_LABELS[level],
      priority: level === 'trauma-level-1' ? 'immediate' : 'urgent',
      confidence: vitalsCorroborate ? Math.min(0.97, baseConfidence + 0.08) : baseConfidence,
      rationale,
    });
  }

  if (
    arrival.criticalChecklist?.type === 'respiratory-failure' ||
    /\b(respiratory failure|severe sob|status asthmaticus)\b/i.test(complaint) ||
    (arrival.vitals?.spo2 != null && Number(arrival.vitals.spo2) < 88)
  ) {
    pushActivation(activations, seen, {
      type: 'respiratory-failure',
      label: ACTIVATION_LABELS['respiratory-failure'],
      priority: 'urgent',
      confidence: 0.8,
      rationale: ['Hypoxia or respiratory failure pattern'],
    });
  }

  if (
    arrival.criticalChecklist?.type === 'ob' ||
    /\b(labor|delivery|pregnant|ob emergency|postpartum hemorrhage)\b/i.test(complaint)
  ) {
    pushActivation(activations, seen, {
      type: 'ob-emergency',
      label: ACTIVATION_LABELS['ob-emergency'],
      priority: 'urgent',
      confidence: 0.84,
      rationale: ['OB emergency presentation'],
    });
  }

  if (
    patient?.flags.includes(PatientFlag.SepsisAlert) ||
    /\b(sepsis|septic|lactate)\b/i.test(complaint)
  ) {
    pushActivation(activations, seen, {
      type: 'sepsis-bundle',
      label: ACTIVATION_LABELS['sepsis-bundle'],
      priority: 'urgent',
      confidence: 0.81,
      rationale: ['Sepsis alert or sepsis-associated complaint'],
    });
  }

  return activations.sort((left, right) => {
    const priorityOrder = { immediate: 0, urgent: 1, standard: 2 };
    return priorityOrder[left.priority] - priorityOrder[right.priority];
  });
}

export function syncResourceActivationsForArrival(
  arrival: EMSArrival,
  patient?: Patient | null,
): EMSArrival {
  return {
    ...arrival,
    resourceActivations: deriveResourceActivations(arrival, patient),
  };
}

export function hasImmediateResourceActivation(arrival: EMSArrival): boolean {
  return (arrival.resourceActivations || deriveResourceActivations(arrival)).some(
    (entry) => entry.priority === 'immediate',
  );
}
