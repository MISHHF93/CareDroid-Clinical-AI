import React from 'react';
import DuplicateCandidatePanel from '../verification/DuplicateCandidatePanel';
import { RECEPTION_COPY } from './receptionCopy';
import './DuplicatePatientBanner.css';

export default function DuplicatePatientBanner({
  candidates = [] as any[],
  onOpenPatient,
  onContinueCreate,
}) {
  if (!candidates.length) return null;

  const copy = RECEPTION_COPY.duplicate;

  return (
    <section className="duplicate-patient-banner" aria-labelledby="duplicate-patient-banner-title">
      <DuplicateCandidatePanel
        candidates={candidates}
        onOpenPatient={onOpenPatient}
        onContinueCreate={onContinueCreate}
        title={copy.bannerTitle}
        description={copy.bannerDescription}
      />
    </section>
  );
}
