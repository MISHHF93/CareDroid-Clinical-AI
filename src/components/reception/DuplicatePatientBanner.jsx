import React from 'react';
import DuplicateCandidatePanel from '../verification/DuplicateCandidatePanel';
import './DuplicatePatientBanner.css';

export default function DuplicatePatientBanner({
  candidates = [],
  onOpenPatient,
  onContinueCreate,
}) {
  if (!candidates.length) return null;

  return (
    <section className="duplicate-patient-banner" aria-labelledby="duplicate-patient-banner-title">
      <DuplicateCandidatePanel
        candidates={candidates}
        onOpenPatient={onOpenPatient}
        onContinueCreate={onContinueCreate}
        title="Possible duplicate patients"
        description="Matching uses the same MPI-style rules as Smart Intake verification. Link an existing chart before creating a new record."
      />
    </section>
  );
}
