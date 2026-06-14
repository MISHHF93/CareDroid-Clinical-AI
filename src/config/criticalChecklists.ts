import type { CriticalChecklistType, EMSArrival, Note, Patient } from '../types/emergency';

export type ChecklistItemCategory =
  | 'Equipment'
  | 'Medication'
  | 'Notification'
  | 'Documentation'
  | 'Assessment';

export interface ChecklistItem {
  id: string;
  text: string;
  category: ChecklistItemCategory;
  critical: boolean;
}

export interface Checklist {
  id: string;
  name: string;
  triggerComplaints: string[];
  items: ChecklistItem[];
}

export interface ChecklistCompletion {
  checklistId: string;
  itemId: string;
  checkedBy: string;
  checkedAt: string;
  itemText?: string;
}

export type CriticalEMSChecklistItem = {
  id: string;
  label: string;
};

export type CriticalChecklistConfig = {
  type: CriticalChecklistType;
  title: string;
  match: RegExp;
  items: CriticalEMSChecklistItem[];
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

export const CHECKLISTS: Checklist[] = [
  {
    id: 'stemi',
    name: 'STEMI Preparation Checklist',
    triggerComplaints: [
      'stemi',
      'st elevation',
      'st-elevation',
      'acute mi',
      'myocardial infarction',
      'cath lab',
    ],
    items: [
      {
        id: 'activate-cath-lab',
        text: 'Activate cath lab (if applicable)',
        category: 'Notification',
        critical: true,
      },
      {
        id: 'prepare-ecg',
        text: 'Prepare ECG machine and cardiac monitor',
        category: 'Equipment',
        critical: true,
      },
      {
        id: 'defib-pads-ready',
        text: 'Ensure defibrillator pads and crash cart are ready',
        category: 'Equipment',
        critical: true,
      },
      {
        id: 'stemi-medications-ready',
        text: 'Prepare STEMI medication kit per local protocol',
        category: 'Medication',
        critical: false,
      },
      {
        id: 'document-onset-time',
        text: 'Document symptom onset and first medical contact time',
        category: 'Documentation',
        critical: false,
      },
    ],
  },
  {
    id: 'major-trauma',
    name: 'Major Trauma Preparation Checklist',
    triggerComplaints: [
      'major trauma',
      'trauma alert',
      'mvc',
      'mva',
      'motor vehicle collision',
      'fall from height',
      'penetrating trauma',
      'gunshot',
      'stab wound',
    ],
    items: [
      {
        id: 'trauma-team-notified',
        text: 'Notify trauma team and charge nurse',
        category: 'Notification',
        critical: true,
      },
      {
        id: 'trauma-bay-ready',
        text: 'Prepare trauma bay with monitor, suction, and oxygen',
        category: 'Equipment',
        critical: true,
      },
      {
        id: 'airway-equipment-ready',
        text: 'Confirm airway equipment and backup airway plan are ready',
        category: 'Equipment',
        critical: true,
      },
      {
        id: 'massive-transfusion-notify',
        text: 'Notify blood bank for massive transfusion readiness if indicated',
        category: 'Notification',
        critical: false,
      },
      {
        id: 'primary-survey-roles',
        text: 'Assign primary survey roles and documentation lead',
        category: 'Assessment',
        critical: false,
      },
    ],
  },
  {
    id: 'anaphylaxis',
    name: 'Anaphylaxis Preparation Checklist',
    triggerComplaints: [
      'anaphylaxis',
      'allergic reaction',
      'airway swelling',
      'angioedema',
      'bee sting',
      'epinephrine',
    ],
    items: [
      {
        id: 'epinephrine-ready',
        text: 'Prepare epinephrine per local anaphylaxis protocol',
        category: 'Medication',
        critical: true,
      },
      {
        id: 'airway-oxygen-ready',
        text: 'Prepare airway equipment, oxygen, and suction',
        category: 'Equipment',
        critical: true,
      },
      {
        id: 'provider-notified',
        text: 'Notify provider and bedside nursing team',
        category: 'Notification',
        critical: true,
      },
      {
        id: 'trigger-documented',
        text: 'Document suspected trigger and exposure time',
        category: 'Documentation',
        critical: false,
      },
      {
        id: 'repeat-vitals-ready',
        text: 'Set up repeat vitals and response reassessment',
        category: 'Assessment',
        critical: false,
      },
    ],
  },
];

export const CRITICAL_CHECKLIST_NOTE_PREFIX = 'Critical Checklist';

const CHECKLIST_NOTE_PATTERN =
  /^Critical Checklist \[([^\]]+)] \[([^\]]+)]: completed at (\S+) by (.+?) - (.*)$/;

function normalizedComplaintText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function complaintFrom(input: Patient | string | null | undefined): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  return [input.chiefComplaint, input.complaint, input.complaintCategory, input.emsArrival?.prearrivalComplaint]
    .filter(Boolean)
    .join(' ');
}

function arrivalText(arrival: Pick<EMSArrival, 'chiefComplaint' | 'prearrivalComplaint' | 'notes' | 'mechanismOfInjury'>) {
  return [arrival.chiefComplaint, arrival.prearrivalComplaint, arrival.mechanismOfInjury, arrival.notes]
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

export function findChecklistById(checklistId: string | null | undefined): Checklist | undefined {
  return CHECKLISTS.find((checklist) => checklist.id === checklistId);
}

export function findMatchingChecklists(input: Patient | string | null | undefined): Checklist[] {
  const complaint = normalizedComplaintText(complaintFrom(input));
  if (!complaint) return [];

  return CHECKLISTS.filter((checklist) =>
    checklist.triggerComplaints.some((trigger) => complaint.includes(normalizedComplaintText(trigger))),
  );
}

export function getSingleMatchingChecklist(input: Patient | string | null | undefined): Checklist | null {
  const matches = findMatchingChecklists(input);
  return matches.length === 1 ? matches[0] : null;
}

export function sortChecklistItems(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => {
    if (a.critical === b.critical) return a.text.localeCompare(b.text);
    return a.critical ? -1 : 1;
  });
}

export function buildChecklistCompletionNote(completion: ChecklistCompletion): string {
  const itemText = completion.itemText ? ` - ${completion.itemText}` : '';
  return `${CRITICAL_CHECKLIST_NOTE_PREFIX} [${completion.checklistId}] [${completion.itemId}]: completed at ${completion.checkedAt} by ${completion.checkedBy}${itemText}`;
}

export function parseChecklistCompletionNote(text: string | null | undefined): ChecklistCompletion | null {
  const match = (text || '').match(CHECKLIST_NOTE_PATTERN);
  if (!match) return null;

  return {
    checklistId: match[1],
    itemId: match[2],
    checkedAt: match[3],
    checkedBy: match[4],
    itemText: match[5],
  };
}

export function parseChecklistCompletionsFromNotes(
  notes: Array<Pick<Note, 'text' | 'body'>>
): ChecklistCompletion[] {
  return notes
    .map((note) => parseChecklistCompletionNote(note.text || note.body))
    .filter((completion): completion is ChecklistCompletion => Boolean(completion));
}
