import { useCallback, useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import type { PatientDocumentArtifact } from '../../types/patientDocumentArtifact';
import {
  artifactTypeLabel,
  artifactsForPatientCard,
  reviewStatusLabel,
} from '../../services/patientDocumentArtifactModel';
import { useEmergencyStore } from '../../store/emergencyStore';
import { AiTruthLabel, fromAIResponseSourceCategory } from '../ai/AiTruthLabel';
import './PatientDocumentArtifactsStrip.css';

type PatientDocumentArtifactsStripProps = {
  patient: Patient;
  compact?: boolean;
  maxItems?: number;
  readOnly?: boolean;
  className?: string;
};

function groupArtifacts(artifacts: PatientDocumentArtifact[]) {
  const clinical = artifacts.filter(
    (artifact) => !artifact.artifactType.startsWith('COPILOT_') && artifact.artifactType !== 'DOCUMENT_METADATA',
  );
  const copilot = artifacts.filter((artifact) => artifact.artifactType.startsWith('COPILOT_'));
  return { clinical, copilot };
}

export default function PatientDocumentArtifactsStrip({
  patient,
  compact = false,
  maxItems = 5,
  readOnly = false,
  className = '',
}: PatientDocumentArtifactsStripProps) {
  const reviewDocumentArtifact = useEmergencyStore((state) => state.reviewDocumentArtifact);

  const cardArtifacts = useMemo(
    () => artifactsForPatientCard(patient.documentArtifacts || []),
    [patient.documentArtifacts],
  );

  const { clinical, copilot } = useMemo(() => groupArtifacts(cardArtifacts), [cardArtifacts]);

  const handleAccept = useCallback(
    (artifactId: string) => {
      if (readOnly) return;
      reviewDocumentArtifact(patient.id, {
        artifactId,
        reviewStatus: 'accepted',
        reviewer: 'Current staff',
      });
    },
    [patient.id, readOnly, reviewDocumentArtifact],
  );

  if (!clinical.length && !copilot.length) return null;

  const visibleClinical = clinical.slice(0, maxItems);
  const visibleCopilot = copilot.slice(0, Math.max(2, maxItems - visibleClinical.length));

  return (
    <div
      className={[
        'patient-doc-artifacts',
        compact ? 'patient-doc-artifacts--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Document artifacts"
    >
      {visibleClinical.length ? (
        <div className="patient-doc-artifacts__section">
          <span className="patient-doc-artifacts__heading">Document Artifacts</span>
          <ul className="patient-doc-artifacts__list">
            {visibleClinical.map((artifact) => (
              <li key={artifact.id} className="patient-doc-artifacts__item">
                <span className="patient-doc-artifacts__type">{artifactTypeLabel(artifact.artifactType)}:</span>
                <span className="patient-doc-artifacts__label" title={artifact.sourceText || artifact.label}>
                  {artifact.label}
                </span>
                <span
                  className={[
                    'patient-doc-artifacts__status',
                    artifact.reviewStatus === 'accepted' ? 'patient-doc-artifacts__status--confirmed' : '',
                    artifact.reviewStatus === 'pending_human_review'
                      ? 'patient-doc-artifacts__status--pending'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  — {reviewStatusLabel(artifact.reviewStatus)}
                </span>
                {!readOnly && artifact.reviewStatus === 'pending_human_review' ? (
                  <button
                    type="button"
                    className="patient-doc-artifacts__accept"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAccept(artifact.id);
                    }}
                  >
                    Confirm
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {visibleCopilot.length ? (
        <div className="patient-doc-artifacts__section patient-doc-artifacts__section--copilot">
          <span className="patient-doc-artifacts__heading">Copilot Suggestions</span>
          <ul className="patient-doc-artifacts__list">
            {visibleCopilot.map((artifact) => (
              <li key={artifact.id} className="patient-doc-artifacts__item patient-doc-artifacts__item--copilot">
                <span className="patient-doc-artifacts__label">{artifact.label}</span>
                {/* Found 2026-08-08: this badge previously only rendered when
                    safety.isAiDerived was true, and every artifact defaulted
                    to isAiDerived: true regardless of extraction mechanism --
                    a bespoke boolean that could only say "AI or nothing."
                    Unconditional now, sourced from the real
                    provenance.responseSource, so a "Copilot Suggestions"
                    section can't imply model-generated intelligence for a
                    keyword-matched recommendation. */}
                <AiTruthLabel
                  {...fromAIResponseSourceCategory(artifact.provenance.responseSource, {
                    sourceContext: `${artifactTypeLabel(artifact.artifactType)} — ${artifact.provenance.extractedBy}`,
                  })}
                  compact
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}