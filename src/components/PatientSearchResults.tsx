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

// HEAL-342: the raw query was rendered here in full -- an unbroken long
// paste (e.g. 300 characters, no spaces) has no natural wrap point, so it
// overflowed the results panel and clipped mid-character at its right edge
// instead of wrapping or truncating. This footer button's own purpose (using
// the query as a name for a new patient) has no legitimate use for a query
// this long anyway.
const MAX_DISPLAYED_QUERY_LENGTH = 60;

function truncateQueryForDisplay(value: string): string {
  if (value.length <= MAX_DISPLAYED_QUERY_LENGTH) return value;
  return `${value.slice(0, MAX_DISPLAYED_QUERY_LENGTH)}…`;
}

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
  /**
   * Gates the "Patients" section (name, MRN, DOB, phone, health card, chief
   * complaint via formatPatientSearchHint) AND the Encounters/Referrals/EMS/
   * Queue operational sections (HEAL-206: their hits embed the same
   * patient-identifying fields -- unifiedOperationalSearch.ts's
   * searchEncounterHits/searchReferralHits/searchEmsHits/searchQueueHits all
   * interpolate patient name/MRN/chief complaint into label/hint). This
   * global header search previously rendered full patient PHI for every
   * role with no permission check at all, including roles explicitly
   * documented as having none (e.g. it_admin: "deliberately excludes... all
   * clinical/PHI-bearing routes"). Defaults to false (fail closed) since
   * this component has exactly one caller (Header.tsx) and PHI visibility
   * must be an explicit opt-in, not an accidentally-inherited default.
   */
  canViewPatients?: boolean;
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
              aria-selected="false"
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
  canViewPatients = false,
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
  const visiblePatientResults = canViewPatients ? results : [];
  const visibleOperationalGroups = canViewPatients ? operationalGroups : undefined;
  const supplementalCount =
    (visibleOperationalGroups?.encounter.length || 0) +
    (visibleOperationalGroups?.referral.length || 0) +
    (visibleOperationalGroups?.ems.length || 0) +
    (visibleOperationalGroups?.queue.length || 0);
  const hasAnyResults = visiblePatientResults.length > 0 || supplementalCount > 0;

  return (
    <div className="patient-search-results" role="listbox" aria-label="Operational search results">
      <header className="patient-search-results__header">
        <strong>Operational search</strong>
        <span>Patient · Encounter · Referral · EMS · Queue</span>
      </header>

      {visiblePatientResults.length ? (
        <section className="patient-search-results__section">
          <h3 className="patient-search-results__section-title">Patients</h3>
          <ul className="patient-search-results__list">
            {visiblePatientResults.map(({ patient, matchKind }) => (
              <li key={patient.id} className="patient-search-results__item">
                <button
                  type="button"
                  className="patient-search-results__primary"
                  role="option"
                  aria-selected="false"
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
        hits={visibleOperationalGroups?.encounter || []}
        onOpenOperationalHit={onOpenOperationalHit}
      />
      <OperationalEntitySection
        title="Referrals"
        hits={visibleOperationalGroups?.referral || []}
        onOpenOperationalHit={onOpenOperationalHit}
      />
      <OperationalEntitySection
        title="EMS cases"
        hits={visibleOperationalGroups?.ems || []}
        onOpenOperationalHit={onOpenOperationalHit}
      />
      <OperationalEntitySection
        title="Queue items"
        hits={visibleOperationalGroups?.queue || []}
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
            {trimmedQuery
              ? ` · ${RECEPTION_COPY.searchResults.noMatch} "${truncateQueryForDisplay(trimmedQuery)}"`
              : ''}
          </button>
        ) : null}
      </footer>
    </div>
  );
}

export { formatOperationalSearchEntityLabel };
