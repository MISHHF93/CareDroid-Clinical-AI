import type { Note, Patient } from '../types/emergency';

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
