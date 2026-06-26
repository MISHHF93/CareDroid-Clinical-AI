import type { EMSArrival } from '../types/emergency';
import type { PreArrivalFormInput } from './preArrivalMistModel';

export type PreArrivalActivationType = 'trauma-team' | 'stroke-team' | 'cardiac-alert';

export type PreArrivalActivationAlert = {
  id: string;
  type: PreArrivalActivationType;
  title: string;
  summary: string;
  chargeNurseAction: string;
  severity: 'critical' | 'high';
  matchedRules: string[];
  emsArrivalId?: string;
  etaMinutes?: number;
  createdAt: string;
};

type RuleContext = {
  mechanism?: string;
  signs?: string;
  complaint?: string;
  severity?: string;
  background?: string;
  assessment?: string;
};

function normalizeText(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function includesAny(text: string, needles: string[]): string | null {
  for (const needle of needles) {
    if (text.includes(needle)) return needle;
  }
  return null;
}

function buildRuleContextFromForm(input: PreArrivalFormInput): RuleContext {
  if (input.framework === 'mist') {
    return {
      mechanism: input.mist.mechanism,
      signs: input.mist.signs,
      complaint: input.mist.injuries,
      severity: input.severity,
    };
  }
  return {
    background: input.sbar.background,
    assessment: input.sbar.assessment,
    complaint: input.sbar.situation,
    severity: input.severity,
  };
}

function buildRuleContextFromArrival(arrival: EMSArrival): RuleContext {
  const notification = arrival.preArrivalNotification;
  if (notification?.framework === 'mist') {
    return {
      mechanism: arrival.mechanismOfInjury || notification.mist?.mechanism,
      signs: notification.mist?.signs,
      complaint: arrival.chiefComplaint || notification.mist?.injuries,
      severity: arrival.severity,
    };
  }
  return {
    background: notification?.sbar?.background,
    assessment: notification?.sbar?.assessment,
    complaint: arrival.chiefComplaint || notification?.sbar?.situation,
    severity: arrival.severity,
  };
}

export function evaluatePreArrivalActivationRules(
  context: RuleContext,
  options: { emsArrivalId?: string; etaMinutes?: number; now?: Date } = {},
): PreArrivalActivationAlert | null {
  const mechanism = normalizeText(context.mechanism);
  const signs = normalizeText(context.signs || context.assessment);
  const complaint = normalizeText(context.complaint || context.background);
  const combined = `${mechanism} ${signs} ${complaint}`;
  const matchedRules: string[] = [];

  const traumaMechanism = includesAny(combined, [
    'car accident',
    'mvc',
    'motor vehicle',
    'fall from height',
    'penetrating',
    'gunshot',
    'stabbing',
    'blast',
    'crush',
  ]);
  if (traumaMechanism) matchedRules.push(`mechanism:${traumaMechanism}`);

  const unstableSigns = includesAny(signs, [
    'tachycard',
    'low bp',
    'hypotens',
    'unresponsive',
    'altered',
    'gcs',
  ]);
  if (unstableSigns) matchedRules.push(`signs:${unstableSigns}`);

  const criticalComplaint = includesAny(complaint, ['chest pain', 'stroke', 'unresponsive', 'major trauma']);
  if (criticalComplaint) matchedRules.push(`complaint:${criticalComplaint}`);

  if (normalizeText(context.severity) === 'critical') {
    matchedRules.push('severity:critical');
  }

  const traumaTeamEligible =
    (traumaMechanism && unstableSigns) ||
    (traumaMechanism && normalizeText(context.severity) === 'critical') ||
    (unstableSigns && criticalComplaint);

  if (!traumaTeamEligible) return null;

  const now = options.now || new Date();
  return {
    id: `pre-arrival-activation-${options.emsArrivalId || now.getTime()}`,
    type: 'trauma-team',
    title: 'Trauma Team Activation',
    summary: [
      traumaMechanism ? `Mechanism: ${context.mechanism || traumaMechanism}` : null,
      unstableSigns ? `Signs: ${context.signs || context.assessment || unstableSigns}` : null,
      options.etaMinutes != null ? `ETA ${options.etaMinutes} min` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    chargeNurseAction: 'Review bed capacity and notify trauma team lead for pending bed assignment.',
    severity: 'critical',
    matchedRules,
    emsArrivalId: options.emsArrivalId,
    etaMinutes: options.etaMinutes,
    createdAt: now.toISOString(),
  };
}

export function evaluatePreArrivalFormActivation(
  input: PreArrivalFormInput,
  now?: Date,
): PreArrivalActivationAlert | null {
  return evaluatePreArrivalActivationRules(buildRuleContextFromForm(input), {
    etaMinutes: input.etaMinutes,
    now,
  });
}

export function evaluateEmsArrivalActivation(
  arrival: EMSArrival,
  now?: Date,
): PreArrivalActivationAlert | null {
  return evaluatePreArrivalActivationRules(buildRuleContextFromArrival(arrival), {
    emsArrivalId: arrival.id,
    etaMinutes: arrival.eta,
    now,
  });
}

export function scanEmsArrivalsForActivations(arrivals: EMSArrival[] = []): PreArrivalActivationAlert[] {
  return arrivals
    .filter((arrival) => arrival.status === 'Inbound' || arrival.status === 'Arrived')
    .map((arrival) => evaluateEmsArrivalActivation(arrival))
    .filter((alert): alert is PreArrivalActivationAlert => Boolean(alert));
}