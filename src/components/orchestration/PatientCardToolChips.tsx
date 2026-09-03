import type { MouseEvent } from 'react';
import type { Patient } from '../../types/emergency';
import usePatientOrchestration from '../../hooks/usePatientOrchestration';
import { useEmergencyStore } from '../../store/emergencyStore';
import {
  launchOrchestrationMoreTools,
  launchOrchestrationRecommendation,
} from '../../services/orchestrationToolLaunch';
import { HUMAN_REVIEW_DISCLAIMER } from '../../lib/ai/safety/policy';
import './orchestration.css';

type PatientCardToolChipsProps = {
  patient: Patient;
  readOnlyDisplay?: boolean;
  maxChips?: number;
};

export function PatientCardToolChips({
  patient,
  readOnlyDisplay = false,
  maxChips = 2,
}: PatientCardToolChipsProps) {
  const orchestration = usePatientOrchestration(patient);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);

  if (!orchestration || readOnlyDisplay) return null;

  const routeChipBudget = Math.min(
    3,
    Math.max(
      maxChips,
      orchestration.scoresMissing.length || 0,
      orchestration.complaintRoute?.scoreIds.length || 0,
    ),
  );
  const chips = orchestration.prioritizedRecommendations.slice(0, routeChipBudget);
  const hasCaseContext = Boolean(orchestration.complaintRoute?.scoreIds.length || chips.length);
  if (!hasCaseContext) return null;

  const handleChipClick = (event: MouseEvent<HTMLButtonElement>, toolId: string) => {
    event.stopPropagation();
    const recommendation = chips.find((chip) => chip.toolId === toolId);
    if (!recommendation || recommendation.completed) return;
    selectPatient(patient.id);
    if (recommendation.launchKind === 'copilot') {
      setCopilotOpen(true);
    }
    launchOrchestrationRecommendation({ patientId: patient.id, recommendation });
  };

  const handleMoreClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    selectPatient(patient.id);
    launchOrchestrationMoreTools(patient.id);
  };

  const handleCopilotClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    selectPatient(patient.id);
    setCopilotOpen(true);
    window.dispatchEvent(
      new CustomEvent('ed:copilot-prefill', {
        detail: {
          patientId: patient.id,
          message: `Review case tools for ${patient.firstName} ${patient.lastName}.`,
        },
      }),
    );
  };

  return (
    <div
      className="patient-orchestration patient-card__orchestration"
      aria-label="Recommended case tools"
    >
      <div className="patient-orchestration__chips">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={[
              'patient-orchestration__chip',
              chip.primary ? 'patient-orchestration__chip--primary' : '',
              chip.completed ? 'patient-orchestration__chip--completed' : '',
              chip.maturity === 'preview' ? 'patient-orchestration__chip--preview' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={(event) => handleChipClick(event, chip.toolId)}
            disabled={chip.completed}
            title={`${chip.reason}. ${HUMAN_REVIEW_DISCLAIMER}`}
          >
            {chip.label}
            {chip.maturity !== 'live' ? ` · ${chip.maturity}` : ''}
          </button>
        ))}
        <button type="button" className="patient-orchestration__chip" onClick={handleCopilotClick}>
          Copilot
        </button>
        {orchestration.secondaryRecommendations.length ? (
          <button type="button" className="patient-orchestration__more" onClick={handleMoreClick}>
            More tools
          </button>
        ) : null}
      </div>
      <p className="patient-orchestration__meta">
        {orchestration.complaintRoute?.complaint
          ? `${orchestration.complaintRoute.complaint} pathway · `
          : ''}
        Staff review required
      </p>
    </div>
  );
}

export default PatientCardToolChips;
