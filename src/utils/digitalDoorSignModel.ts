import { selectReassessmentTimerForPatient } from '../engine/reassessmentTimerEngine';
import { PatientFlag, type Patient, type Room, type Staff } from '../types/emergency';

export type DigitalDoorSignFlag = {
  id: string;
  label: string;
  tone: 'critical' | 'warning' | 'info';
};

export type DigitalDoorSignSnapshot = {
  roomName: string;
  patientName: string;
  mrn: string;
  careTeam: string[];
  flags: DigitalDoorSignFlag[];
  reminders: string[];
  updatedAt: string;
};

function staffName(staff: Staff[], staffId?: string): string | null {
  if (!staffId) return null;
  return staff.find((entry) => entry.id === staffId)?.name || null;
}

export function buildDigitalDoorSignSnapshot(
  patient: Patient | null,
  room: Room,
  staff: Staff[] = [],
): DigitalDoorSignSnapshot {
  if (!patient) {
    return {
      roomName: room.name,
      patientName: 'Available',
      mrn: '—',
      careTeam: [],
      flags: [],
      reminders: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const flags: DigitalDoorSignFlag[] = [];
  if (patient.flags.includes(PatientFlag.HighRisk)) {
    flags.push({ id: 'fall-risk', label: 'Fall risk', tone: 'warning' });
  }
  if (patient.flags.includes(PatientFlag.Isolation)) {
    flags.push({ id: 'isolation', label: 'Isolation precautions', tone: 'critical' });
  }
  if (patient.flags.includes(PatientFlag.SepsisAlert)) {
    flags.push({ id: 'sepsis', label: 'Sepsis alert', tone: 'critical' });
  }
  const allergyNote = patient.notes?.find((note) => /\ballerg/i.test(note.body || ''));
  if (allergyNote?.body) {
    flags.push({ id: 'allergies', label: allergyNote.body.slice(0, 48), tone: 'warning' });
  }

  const reminders: string[] = [];
  const reassessment = selectReassessmentTimerForPatient(patient);
  if (reassessment && (reassessment.stage === 'due' || reassessment.isOverdue)) {
    reminders.push('Reassessment due');
  }
  if (patient.flags.includes(PatientFlag.PsychAlert)) reminders.push('MSE due');
  if (patient.triagePending) reminders.push('Triage pending');

  const careTeam = [
    staffName(staff, patient.assignedStaffId ?? undefined),
    staffName(staff, patient.assignedPhysicianId ?? undefined),
  ].filter(Boolean) as string[];

  return {
    roomName: room.name,
    patientName: `${patient.lastName}, ${patient.firstName}`,
    mrn: patient.mrn,
    careTeam,
    flags,
    reminders,
    updatedAt: new Date().toISOString(),
  };
}