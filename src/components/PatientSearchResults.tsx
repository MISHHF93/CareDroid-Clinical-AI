import type { Patient } from '../types/emergency';
import type { PatientSearchMatchKind, PatientSearchResult } from '../utils/patientSearch';
import { formatPatientSearchHint, getPatientDisplayName } from '../utils/patientSearch';
import { getPatientEncounterId } from '../services/patientSearchActions';
import './PatientSearchResults.css';

type PatientSearchResultsProps = {
  query: string;
  results: PatientSearchResult<Patient>[];
  backendVerifiedPatientIds?: Set<string>;
  canCreatePatient?: boolean;
  isReceptionRoute?: boolean;
  onFindPatient: (patientId: string) => void;
  onStartIntake: (patientId: string) => void;
  onViewEncounter: (patientId: string, encounterId: string | null) => void;
  onCreateEncounter: (patientId: string) => void;
  onFilterQueues?: (query: string) => void;
  onStartNewIntake?: () => void;
};

function encounterLabel(patient: Patient): string {
  const encounterId = getPatientEncounterId(patient);
  return encounterId ? `View ${encounterId}` : 'Create encounter';
}

export default function PatientSearchResults({
  query,
  results,
  backendVerifiedPatientIds = new Set(),
  canCreatePatient = false,
  isReceptionRoute = false,
  onFindPatient,
  onStartIntake,
  onViewEncounter,
  onCreateEncounter,
  onFilterQueues,
  onStartNewIntake,
}: PatientSearchResultsProps) {
  const trimmedQuery = query.trim();

  return (
    <div className="patient-search-results" role="listbox" aria-label="Patient search results">
      <header className="patient-search-results__header">
        <strong>Patient search</strong>
        <span>Find · Intake · Encounter</span>
      </header>

      {results.length ? (
        <ul className="patient-search-results__list">
          {results.map(({ patient, matchKind }) => (
            <li key={patient.id} className="patient-search-results__item">
              <button
                type="button"
                className="patient-search-results__primary"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onFindPatient(patient.id)}
              >
                <strong>{getPatientDisplayName(patient)}</strong>
                <span>
                  {formatPatientSearchHint(patient, matchKind as PatientSearchMatchKind)}
                  {backendVerifiedPatientIds.has(patient.id) ? ' · Backend verified' : ''}
                </span>
              </button>
              <div className="patient-search-results__actions" aria-label="Patient actions">
                {canCreatePatient ? (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onStartIntake(patient.id)}
                  >
                    Intake
                  </button>
                ) : null}
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const encounterId = getPatientEncounterId(patient);
                    if (encounterId) onViewEncounter(patient.id, encounterId);
                    else onCreateEncounter(patient.id);
                  }}
                >
                  {encounterLabel(patient)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="patient-search-results__empty">
          No matching patients in the active board for &ldquo;{trimmedQuery}&rdquo;.
        </p>
      )}

      <footer className="patient-search-results__footer">
        {isReceptionRoute && onFilterQueues ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onFilterQueues(trimmedQuery)}
          >
            Filter arrival queues
          </button>
        ) : null}
        {canCreatePatient && onStartNewIntake ? (
          <button
            type="button"
            className="patient-search-results__footer-primary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onStartNewIntake}
          >
            Start Smart Intake{trimmedQuery ? ` · no match for "${trimmedQuery}"` : ''}
          </button>
        ) : null}
      </footer>
    </div>
  );
}
