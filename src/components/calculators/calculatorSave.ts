import { dispatchAlert } from '../../engine/alertEngine';
import { useEmergencyStore } from '../../store/emergencyStore';
import type { Patient } from '../../types/emergency';

export type CalculatorSaveInput = {
  patientId?: string;
  scoreName: string;
  total: number | string;
  max: number | string;
  band: string;
  fields: Record<string, unknown>;
  staffId?: string;
  critical?: boolean;
};

function patientName(patient?: Patient): string {
  return patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn : 'Patient';
}

export function saveCalculatorResult(input: CalculatorSaveInput): boolean {
  if (!input.patientId) return false;

  const store = useEmergencyStore.getState();
  const patient = store.patients.find((candidate) => candidate.id === input.patientId);
  if (!patient) return false;

  const staffId = input.staffId || patient.assignedStaffId || store.activeShift.chargeStaffId || store.staff[0]?.id || 'system';
  const noteText = `${input.scoreName}: ${input.total}/${input.max} — ${input.band}`;
  const detailText = `${input.scoreName} fields: ${JSON.stringify(input.fields)}`;

  store.addNote(input.patientId, noteText, staffId);
  store.addNote(input.patientId, detailText, staffId);

  if (input.critical) {
    dispatchAlert({
      severity: 'Warning',
      title: `${input.scoreName} — ${input.band} risk`,
      message: `${patientName(patient)} scored ${input.total}/${input.max}`,
      patientId: input.patientId,
      source: 'clinical-calculator-hub',
      metadata: {
        calculator: input.scoreName,
        total: String(input.total),
        max: String(input.max),
        band: input.band,
      },
    });
  }

  return true;
}
