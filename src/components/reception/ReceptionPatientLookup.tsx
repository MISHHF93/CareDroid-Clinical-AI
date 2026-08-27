import { useMemo, useState } from 'react';
import { Search, UserCheck, UserPlus } from 'lucide-react';
import type { Patient } from '../../types/emergency';
import {
  findSameNamePatientIds,
  getPatientDisplayName,
  isPatientSearchQueryReady,
  rankPatientsBySearch,
} from '../../utils/patientSearch';
import './ReceptionPatientLookup.css';

export type ReceptionPatientLookupProps = {
  patients: Patient[];
  onSelectExisting: (patientId: string) => void;
  onCreateNew?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
};

/**
 * Lookup-before-create — the skill clerks want first on a busy desk.
 */
export default function ReceptionPatientLookup({
  patients,
  onSelectExisting,
  onCreateNew,
  inputRef,
  disabled = false,
}: ReceptionPatientLookupProps) {
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => (isPatientSearchQueryReady(query) ? rankPatientsBySearch(patients, query, 6) : []),
    [patients, query],
  );
  // SAFER patient-identification guidance (same as PatientSearchResults.tsx):
  // this widget exists specifically so reception staff can find an EXISTING
  // chart before creating a new one -- the highest-consequence surface for a
  // same-name mix-up, since picking the wrong "John Smith" here either opens
  // someone else's chart or spawns a needless duplicate registration. MRN/DOB
  // already render in the row's secondary text below, but nothing forces the
  // reader to actually compare them across rows.
  const sameNamePatientIds = useMemo(() => findSameNamePatientIds(results), [results]);

  return (
    <section className="reception-patient-lookup" aria-labelledby="reception-lookup-title">
      <div className="reception-patient-lookup__header">
        <h2 id="reception-lookup-title">
          <Search size={16} aria-hidden="true" />
          Find patient first
        </h2>
        <span className="reception-patient-lookup__hint">Name · DOB · MRN · health card</span>
      </div>
      <div className="reception-patient-lookup__row">
        <label className="reception-patient-lookup__field">
          <span className="visually-hidden">Search existing patients</span>
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="search"
            value={query}
            disabled={disabled}
            autoComplete="off"
            placeholder="Search before creating a new chart…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {query.trim() && !isPatientSearchQueryReady(query) ? (
        <p className="reception-patient-lookup__status" role="status">
          Type at least 2 letters, or a date of birth / card number.
        </p>
      ) : null}
      {isPatientSearchQueryReady(query) && results.length === 0 ? (
        <p className="reception-patient-lookup__status reception-patient-lookup__status--empty" role="status">
          No matching charts.
          {onCreateNew ? (
            <button
              type="button"
              className="reception-patient-lookup__new"
              disabled={disabled}
              onClick={onCreateNew}
            >
              <UserPlus size={16} aria-hidden="true" />
              Start a new walk-in registration
            </button>
          ) : (
            ' You can start a new walk-in registration.'
          )}
        </p>
      ) : null}
      {results.length > 0 ? (
        <ul className="reception-patient-lookup__results" aria-label="Matching patients">
          {results.map(({ patient, matchKind }) => (
            <li key={patient.id}>
              <button
                type="button"
                className="reception-patient-lookup__result"
                onClick={() => onSelectExisting(patient.id)}
              >
                <UserCheck size={16} aria-hidden="true" />
                <span className="reception-patient-lookup__result-main">
                  <strong>{getPatientDisplayName(patient)}</strong>
                  <small>
                    {patient.mrn}
                    {patient.dob ? ` · ${patient.dob}` : ''}
                    {patient.chiefComplaint || patient.complaint
                      ? ` · ${patient.chiefComplaint || patient.complaint}`
                      : ''}
                  </small>
                  {sameNamePatientIds.has(patient.id) ? (
                    // Same treatment as PatientSearchResults.tsx's
                    // same-name warning -- flag exactly the colliding rows
                    // rather than a single banner, so it stays attached to
                    // the moment of selection.
                    <small className="reception-patient-lookup__same-name-warning" role="note">
                      ⚠ Another result has the same name — check MRN/DOB
                    </small>
                  ) : null}
                </span>
                <span className="reception-patient-lookup__match">{matchKind.replace(/-/g, ' ')}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
