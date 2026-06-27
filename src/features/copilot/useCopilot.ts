import { useEmergencyStore } from '../../store/emergencyStore';

export function useCopilot() {
  const messages = useEmergencyStore((s) => s.copilotMessages);
  const sendMessage = useEmergencyStore((s) => s.sendCopilotQuery);
  const isOpen = useEmergencyStore((s) => s.copilotOpen);
  const selectedPatientId = useEmergencyStore((s) => s.selectedPatientId);
  const patients = useEmergencyStore((s) => s.patients);

  const selectedPatient = selectedPatientId != null
    ? patients.find((p) => p.id === selectedPatientId) ?? null
    : null;

  return { messages, sendMessage, isOpen, selectedPatient };
}
