import { PatientState, type Patient } from '../../types/emergency';
import './patient.css';

type JourneyStageId =
  | 'registration'
  | 'waiting'
  | 'triage'
  | 'doctor-review'
  | 'diagnostics'
  | 'treatment'
  | 'discharge';

type JourneyStage = {
  id: JourneyStageId;
  label: string;
  states: PatientState[];
};

const JOURNEY_STAGES: JourneyStage[] = [
  { id: 'registration', label: 'Registration', states: [PatientState.Arrival, PatientState.Registration] },
  { id: 'waiting', label: 'Waiting', states: [PatientState.Waiting] },
  { id: 'triage', label: 'Triage', states: [PatientState.Triage] },
  { id: 'doctor-review', label: 'Doctor Review', states: [PatientState.Assessment] },
  { id: 'diagnostics', label: 'Labs / Imaging', states: [PatientState.Orders, PatientState.Results] },
  { id: 'treatment', label: 'Treatment', states: [PatientState.Disposition, PatientState.Admission] },
  { id: 'discharge', label: 'Discharge', states: [PatientState.Discharge, PatientState.Deceased] },
];

type PatientJourneyTrackerProps = {
  patient: Patient;
  variant?: 'default' | 'compact';
  className?: string;
};

function activeStageIndex(state: PatientState): number {
  const index = JOURNEY_STAGES.findIndex((stage) => stage.states.includes(state));
  return index >= 0 ? index : 0;
}

export function getPatientJourneyStage(patient: Patient): JourneyStage {
  return JOURNEY_STAGES[activeStageIndex(patient.state)] ?? JOURNEY_STAGES[0];
}

export function PatientJourneyTracker({
  patient,
  variant = 'default',
  className = '',
}: PatientJourneyTrackerProps) {
  const currentIndex = activeStageIndex(patient.state);
  const currentStage = JOURNEY_STAGES[currentIndex] ?? JOURNEY_STAGES[0];
  const stageSummary = JOURNEY_STAGES.map((stage, index) => {
    const status = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'pending';
    return `${stage.label} ${status}`;
  }).join(', ');

  return (
    <div
      className={['cd-journey', `cd-journey--${variant}`, className].filter(Boolean).join(' ')}
      aria-label={`Patient journey. Current stage ${currentStage.label}. ${stageSummary}.`}
    >
      <span className="cd-journey__current">Current: {currentStage.label}</span>
      <ol className="cd-journey__steps">
        {JOURNEY_STAGES.map((stage, index) => {
          const status = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'pending';
          return (
            <li
              key={stage.id}
              className={`cd-journey__step cd-journey__step--${status}`}
              {...(status === 'current' ? { 'aria-current': 'step' as const } : {})}
            >
              <span className="cd-journey__dot" aria-hidden="true" />
              <span className="cd-journey__label">{stage.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
