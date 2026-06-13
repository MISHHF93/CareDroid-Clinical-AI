import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';

const COMPLAINTS = [
  {complaint:'Chest pain', cat:'Cardiac', priority:'P2'},
  {complaint:'Shortness of breath', cat:'Respiratory', priority:'P3'},
  {complaint:'Abdominal pain', cat:'Abdominal', priority:'P3'},
  {complaint:'Laceration to hand', cat:'Trauma', priority:'P4'},
  {complaint:'Headache severe', cat:'Neuro', priority:'P3'},
  {complaint:'UTI symptoms', cat:'Urological', priority:'P4'},
  {complaint:'Back pain', cat:'Musculoskeletal', priority:'P5'},
  {complaint:'Anxiety attack', cat:'Psychiatric', priority:'P3'},
  {complaint:'Fever 38.9C', cat:'Infectious', priority:'P3'},
  {complaint:'Knee injury', cat:'Trauma', priority:'P4'},
] as const;

const NAMES = [['James','Sarah','David','Maria','Robert',
  'Jennifer','Ahmed','Sophie','Carlos','Priya'],
  ['Smith','Johnson','Chen','Williams','Brown',
  'Kumar','Okafor','Tremblay','Singh','Walsh']] as const;

let intervals: number[] = [];

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function priorityFromSeed(priority: typeof COMPLAINTS[number]['priority']): Priority {
  return Priority[priority];
}

function createSimulatedPatient(): Patient {
  const c = randomItem(COMPLAINTS);
  const fn = randomItem(NAMES[0]);
  const ln = randomItem(NAMES[1]);

  return {
    id: 'p' + Date.now(),
    mrn: 'ED-' + Math.floor(100000 + Math.random() * 900000),
    firstName: fn,
    lastName: ln,
    dob: '1970-01-01',
    age: 30 + Math.floor(Math.random() * 50),
    sex: Math.random() > 0.5 ? 'M' : 'F',
    arrivalTime: new Date().toISOString(),
    chiefComplaint: c.complaint,
    complaintCategory: c.cat,
    state: PatientState.Triage,
    priority: priorityFromSeed(c.priority),
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
  };
}

export function startSimulation(): number[] {
  if (intervals.length > 0) return [...intervals];

  const store = useEmergencyStore.getState;

  intervals.push(window.setInterval(() => {
    const s = store();
    const waiting = s.patients.filter((p) =>
      p.state === PatientState.Waiting || p.state === PatientState.Assessment);

    if (waiting.length > 0) {
      const p = waiting[Math.floor(Math.random() * waiting.length)];
      const states = [
        PatientState.Assessment,
        PatientState.Orders,
        PatientState.Results,
        PatientState.Disposition,
      ];
      const next = states[Math.floor(Math.random() * states.length)];
      s.updatePatient(p.id, { state: next });
    }
  }, 30000));

  intervals.push(window.setInterval(() => {
    store().addPatient(createSimulatedPatient());
  }, 60000));

  return [...intervals];
}

export function stopSimulation() {
  intervals.forEach(clearInterval);
  intervals = [];
}
