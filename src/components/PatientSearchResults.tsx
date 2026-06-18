import type { Patient } from '../types/emergency';
import type { PatientSearchMatchKind, PatientSearchResult } from '../utils/patientSearch';
import { formatPatientSearchHint, getPatientDisplayName } from '../utils/patientSearch';
import type { OperationalSearchHit } from '../services/unifiedOperationalSearch';
import { formatOperationalSearchEntityLabel } from '../services/unifiedOperationalSearch';
import { getPatientEncounterId } from '../services/patientSearchActions';
import OperationalEmptyState, { OperationalEmptyAction } from './ui/OperationalEmptyState';
import { EMPTY_STATE_COPY } from '../config/emptyStateCopy';
import { RECEPTION_COPY } from './reception/receptionCopy';
import './PatientSearchResults.css';

type OperationalSearchGroups = {
  patient: OperationalSearchHit[];
  encounter: OperationalSearchHit[];
  referral: OperationalSearchHit[];
  ems: OperationalSearchHit[];
  queue: OperationalSearchHit[];
};

type PatientSearchResultsProps = {
  query: string;
  results: PatientSearchResult<Patient>[];
  operationalGroups?: OperationalSearchGroups;
  backendVerifiedPatientIds?: Set<string>;
  canCreatePatient?: boolean;
  isReceptionRoute?: boolean;
  onFindPatient: (patientId: string) => void;
  onStartIntake: (patientId: string) => void;
  onViewEncounter: (patientId: string, encounterId: string | null) => void;
  onCreateEncounter: (patientId: string) => void;
  onOpenOperationalHit?: (hit: OperationalSearchHit) => void;
  onFilterQueues?: (query: string) => void;
  onStartNewIntake?: () => void;
};

function encounterLabel(patient: Patient): string {
  const encounterId = getPatientEncounterId(patient);
  return encounterId ? `View ${encounterId}` : 'Create encounter';
}

function OperationalEntitySection({
  title,
  hits,
  onOpenOperationalHit,
}: {
  title: string;
  hits: OperationalSearchHit[];
  onOpenOperationalHit?: (hit: OperationalSearchHit) => void;
}) {
  if (!hits.length) return null;

  return (
    <section className="patient-search-results__section">
      <h3 className="patient-search-results__section-title">{title}</h3>
      <ul className="patient-search-results__list">
        {hits.map((hit) => (
          <li key={hit.id} className="patient-search-results__item">
            <button
              type="button"
              className="patient-search-results__primary patient-search-results__primary--entity"
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onOpenOperationalHit?.(hit)}
            >
              <strong>{hit.label}</strong>
              <span>{hit.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PatientSearchResults({
  query,
  results,
  operationalGroups,
  backendVerifiedPatientIds = new Set(),
  canCreatePatient = false,
  isReceptionRoute = false,
  onFindPatient,
  onStartIntake,
  onViewEncounter,
  onCreateEncounter,
  onOpenOperationalHit,
  onFilterQueues,
  onStartNewIntake,
}: PatientSearchResultsProps) {
  const trimmedQuery = query.trim();
  const supplementalCount =
    (operationalGroups?.encounter.length || 0) +
    (operationalGroups?.referral.length || 0) +
    (operationalGroups?.ems.length || 0) +
    (operationalGroups?.queue.length || 0);
  const hasAnyResults = results.length > 0 || supplementalCount > 0;

  return (
    <div className="patient-search-results" role="listbox" aria-label="Operational search results">
      <header className="patient-search-results__header">
        <strong>Operational search</strong>
        <span>Patient · Encounter · Referral · EMS · Queue</span>
      </header>

      {results.length ? (
        <section className="patient-search-results__section">
          <h3 className="patient-search-results__section-title">Patients</h3>
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
        </section>
      ) : null}

      <OperationalEntitySection
        title="Encounters"
        hits={operationalGroups?.encounter || []}
        onOpenOperationalHit={onOpenOperationalHit}
      />
      <OperationalEntitySection
        title="Referrals"
        hits={operationalGroups?.referral || []}
        onOpenOperationalHit={onOpenOperationalHit}
      />
      <OperationalEntitySection
        title="EMS cases"
        hits={operationalGroups?.ems || []}
        onOpenOperationalHit={onOpenOperationalHit}
      />
      <OperationalEntitySection
        title="Queue items"
        hits={operationalGroups?.queue || []}
        onOpenOperationalHit={onOpenOperationalHit}
      />

      {!hasAnyResults ? (
        <OperationalEmptyState
          size="inline"
          icon="🔍"
          title={EMPTY_STATE_COPY.search.noResults.title}
          guidance={EMPTY_STATE_COPY.search.noResults.guidance}
          nextSteps={EMPTY_STATE_COPY.search.noResults.nextSteps}
          actions={
            <>
              {isReceptionRoute && onFilterQueues ? (
                <OperationalEmptyAction onClick={() => onFilterQueues(trimmedQuery)}>
                  {RECEPTION_COPY.searchResults.filterQueues}
                </OperationalEmptyAction>
              ) : null}
              {canCreatePatient && onStartNewIntake ? (
                <OperationalEmptyAction secondary onClick={onStartNewIntake}>
                  {RECEPTION_COPY.searchResults.newPatient}
                </OperationalEmptyAction>
              ) : null}
            </>
          }
        />
      ) : null}

      <footer className="patient-search-results__footer">
        {isReceptionRoute && onFilterQueues ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onFilterQueues(trimmedQuery)}
          >
            {RECEPTION_COPY.searchResults.filterQueues}
          </button>
        ) : null}
        {canCreatePatient && onStartNewIntake ? (
          <button
            type="button"
            className="patient-search-results__footer-primary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onStartNewIntake}
          >
            {RECEPTION_COPY.searchResults.newPatient}
            {trimmedQuery ? ` · ${RECEPTION_COPY.searchResults.noMatch} "${trimmedQuery}"` : ''}
          </button>
        ) : null}
      </footer>
    </div>
  );
}

export { formatOperationalSearchEntityLabel };
