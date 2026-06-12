import type { EMSArrival } from '../types/emergency';

export type CriticalChecklistType =
  | 'stemi'
  | 'stroke'
  | 'trauma'
  | 'anaphylaxis'
  | 'ob'
  | 'pediatric-arrest'
  | 'respiratory-failure';

export type CriticalChecklistItem = {
  id: string;
  label: string;
};

export type CriticalChecklistConfig = {
  type: CriticalChecklistType;
  title: string;
  match: RegExp;
  items: CriticalChecklistItem[];
};

export const CRITICAL_CHECKLISTS: CriticalChecklistConfig[] = [
  {
    type: 'stemi',
    title: 'STEMI Preparation Checklist',
    match: /\b(stemi|nstemi|cardiac arrest|mi\b|myocardial infarction)\b/i,
    items: [
      { id: 'activate-cath-lab', label: 'Activate cath lab (if applicable)' },
      { id: 'ecg-bedside', label: '12-lead ECG equipment at bedside' },
      { id: 'iv-access', label: 'IV access x 2 equipment ready' },
      { id: 'cardiac-monitor', label: 'Cardiac monitor attached' },
      { id: 'aspirin', label: 'Aspirin 325mg drawn up' },
      { id: 'heparin', label: 'Heparin protocol ready' },
      { id: 'defib', label: 'Defibrillator charged + pads applied' },
      { id: 'physician-notified', label: 'Physician notified' },
    ],
  },
  {
    type: 'stroke',
    title: 'Stroke Preparation Checklist',
    match: /\b(stroke|cva|facial droop|aphasia|hemiparesis|weakness)\b/i,
    items: [
      { id: 'stroke-team', label: 'Notify stroke team' },
      { id: 'ct-ready', label: 'CT scanner notified and ready' },
      { id: 'last-known-well', label: 'Last-known-well time confirmed' },
      { id: 'glucose', label: 'Point-of-care glucose ready' },
      { id: 'large-bore-iv', label: 'Large-bore IV access equipment ready' },
      { id: 'thrombolysis-screen', label: 'Thrombolysis contraindication screen ready' },
      { id: 'physician-notified', label: 'Physician notified' },
    ],
  },
  {
    type: 'trauma',
    title: 'Trauma Preparation Checklist',
    match: /\b(major trauma|polytrauma|trauma alert|mvc|gunshot|stab|fall from height)\b/i,
    items: [
      { id: 'trauma-team', label: 'Activate trauma team' },
      { id: 'resus-bay', label: 'Resuscitation bay cleared' },
      { id: 'blood-products', label: 'Massive transfusion protocol ready' },
      { id: 'airway-cart', label: 'Airway cart at bedside' },
      { id: 'ultrasound', label: 'FAST ultrasound ready' },
      { id: 'warming', label: 'Warming blankets and fluids ready' },
      { id: 'physician-notified', label: 'Physician notified' },
    ],
  },
  {
    type: 'anaphylaxis',
    title: 'Anaphylaxis Preparation Checklist',
    match: /\b(severe anaphylaxis|anaphylaxis|angioedema)\b/i,
    items: [
      { id: 'epi', label: 'Epinephrine IM drawn up' },
      { id: 'airway', label: 'Airway equipment ready' },
      { id: 'oxygen', label: 'High-flow oxygen ready' },
      { id: 'iv-fluids', label: 'IV fluids and pressure bag ready' },
      { id: 'monitor', label: 'Cardiac monitor ready' },
      { id: 'adjuncts', label: 'Antihistamine and steroid orders ready' },
      { id: 'physician-notified', label: 'Physician notified' },
    ],
  },
  {
    type: 'ob',
    title: 'OB Emergency Preparation Checklist',
    match: /\b(obstetric emergency|ob emergency|eclampsia|postpartum hemorrhage|shoulder dystocia|precipitous delivery)\b/i,
    items: [
      { id: 'ob-team', label: 'Notify OB team' },
      { id: 'delivery-kit', label: 'Delivery kit and neonatal warmer ready' },
      { id: 'hemorrhage-cart', label: 'OB hemorrhage cart ready' },
      { id: 'magnesium', label: 'Magnesium protocol ready if indicated' },
      { id: 'blood-bank', label: 'Blood bank notified' },
      { id: 'nicu', label: 'NICU team notified if needed' },
      { id: 'physician-notified', label: 'Physician notified' },
    ],
  },
  {
    type: 'pediatric-arrest',
    title: 'Pediatric Arrest Preparation Checklist',
    match: /\b(pediatric arrest|paediatric arrest|child arrest|infant arrest|peds arrest)\b/i,
    items: [
      { id: 'peds-cart', label: 'Pediatric resuscitation cart at bedside' },
      { id: 'broselow', label: 'Broselow tape or weight estimate ready' },
      { id: 'airway', label: 'Pediatric airway sizes ready' },
      { id: 'epi-dose', label: 'Epinephrine dose calculated' },
      { id: 'defib-dose', label: 'Defibrillator dose calculated' },
      { id: 'io-kit', label: 'IO access kit ready' },
      { id: 'physician-notified', label: 'Physician notified' },
    ],
  },
  {
    type: 'respiratory-failure',
    title: 'Respiratory Failure Preparation Checklist',
    match: /\b(respiratory failure|resp arrest|severe respiratory|unable to ventilate|hypoxic respiratory)\b/i,
    items: [
      { id: 'airway-cart', label: 'Airway cart at bedside' },
      { id: 'bvm', label: 'BVM and suction ready' },
      { id: 'oxygen', label: 'High-flow oxygen and NIV ready' },
      { id: 'rsi-meds', label: 'RSI medications ready if indicated' },
      { id: 'ventilator', label: 'Ventilator checked and ready' },
      { id: 'capnography', label: 'Capnography ready' },
      { id: 'physician-notified', label: 'Physician notified' },
    ],
  },
];

function arrivalText(arrival: Pick<EMSArrival, 'chiefComplaint' | 'prearrivalComplaint' | 'notes' | 'mechanismOfInjury'>) {
  return [
    arrival.chiefComplaint,
    arrival.prearrivalComplaint,
    arrival.mechanismOfInjury,
    arrival.notes,
  ]
    .filter(Boolean)
    .join(' ');
}

function strokeWithinFourHours(text: string) {
  if (!/\b(stroke|cva|facial droop|aphasia|hemiparesis|weakness)\b/i.test(text)) return false;
  return (
    /\b(onset|last known well|lkw)\b.*\b([0-3]\s*h|[0-3]\s*hour|[0-9]{1,3}\s*min|<\s*4\s*h)/i.test(text) ||
    /stroke onset\s*<\s*4\s*h/i.test(text)
  );
}

export function resolveCriticalChecklistConfig(arrival: EMSArrival): CriticalChecklistConfig | null {
  const text = arrivalText(arrival);
  if (strokeWithinFourHours(text)) {
    return CRITICAL_CHECKLISTS.find((checklist) => checklist.type === 'stroke') || null;
  }
  const matchedChecklist = CRITICAL_CHECKLISTS.find((checklist) => checklist.match.test(text));
  if (matchedChecklist) return matchedChecklist;
  if (arrival.severity !== 'Critical') return null;
  if (/\b(trauma|mvc|fall|gsw|stab|injury)\b/i.test(text)) {
    return CRITICAL_CHECKLISTS.find((checklist) => checklist.type === 'trauma') || null;
  }
  return CRITICAL_CHECKLISTS.find((checklist) => checklist.type === 'respiratory-failure') || null;
}

export function isCriticalEMSArrival(arrival: EMSArrival): boolean {
  return arrival.severity === 'Critical' || Boolean(resolveCriticalChecklistConfig(arrival));
}
