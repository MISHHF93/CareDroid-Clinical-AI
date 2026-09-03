import type { Patient } from '../../types/emergency';
import usePatientOrchestration from '../../hooks/usePatientOrchestration';
import { useEmergencyStore } from '../../store/emergencyStore';
import {
  launchOrchestrationMoreTools,
  launchOrchestrationRecommendation,
} from '../../services/orchestrationToolLaunch';
import { HUMAN_REVIEW_DISCLAIMER } from '../../lib/ai/safety/policy';
import './orchestration.css';

type RecommendedToolsStripProps = {
  patient: Patient;
};

export function RecommendedToolsStrip({ patient }: RecommendedToolsStripProps) {
  const orchestration = usePatientOrchestration(patient);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);

  if (!orchestration) return null;

  const primary = orchestration.prioritizedRecommendations;
  const secondary = orchestration.secondaryRecommendations.slice(0, 4);
  const all = [...primary, ...secondary];

  if (!all.length) return null;

  return (
    <section className="patient-orchestration__strip" aria-label="Recommended tools for this case">
      <h3 className="patient-orchestration__strip-title">Recommended for this case</h3>
      <div className="patient-orchestration__chips">
        {all.map((chip) => (
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
            disabled={chip.completed}
            title={`${chip.reason}. ${chip.rationale || ''} ${HUMAN_REVIEW_DISCLAIMER}`}
            onClick={() => {
              if (chip.completed) return;
              if (chip.launchKind === 'copilot') setCopilotOpen(true);
              launchOrchestrationRecommendation({ patientId: patient.id, recommendation: chip });
            }}
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          className="patient-orchestration__more"
          onClick={() => launchOrchestrationMoreTools(patient.id)}
        >
          Open tool catalog
        </button>
      </div>
      {orchestration.complaintRoute?.safetyStatement ? (
        <p className="patient-orchestration__meta">
          {orchestration.complaintRoute.safetyStatement}
        </p>
      ) : null}
      <p className="patient-orchestration__disclaimer">{HUMAN_REVIEW_DISCLAIMER}</p>
    </section>
  );
}

export default RecommendedToolsStrip;
