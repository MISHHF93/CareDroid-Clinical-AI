import React from 'react';
import { Link2, UserPlus } from 'lucide-react';
import { VERIFICATION_STEPS } from '../../utils/verificationWorkflow';
import DuplicateCandidatePanel from './DuplicateCandidatePanel';
import IdentityFieldReview from './IdentityFieldReview';
import OcrCapturePanel from './OcrCapturePanel';
import ProvisionalIdentityPanel from './ProvisionalIdentityPanel';
import './PatientVerificationExperience.css';

export default function PatientVerificationExperience({
  activeStep = 0,
  onStepChange,
  extractedFields = [],
  fieldDecisions = {},
  canVerifyIntake = false,
  canCreatePatient = false,
  onFieldDecision,
  matchCandidates = [],
  selectedCandidateId = null,
  onSelectCandidate,
  onOpenPatient,
  ocrUploadStatus = '',
  isUploadingDocument = false,
  onDocumentUpload,
  verificationComplete = false,
  selectedCandidateOnBoard = false,
  pendingAction = '',
  warnings = [],
  auditLog = [],
  onLinkPatient,
  onCreatePatient,
  onProvisionalIntake,
  highlightProvisional = false,
}) {
  const renderStepContent = () => {
    if (activeStep <= 0) {
      return (
        <section className="patient-verification__intro">
          <h3>Unified verification workflow</h3>
          <p>
            Identity evidence flows through OCR extraction, duplicate detection, manual field review,
            and staff-confirmed finalize actions.
          </p>
          <ol>
            <li>Capture documents and review OCR output</li>
            <li>Resolve duplicate candidates with MPI-style matching</li>
            <li>Approve or override identity fields manually</li>
            <li>Link, create, or use provisional identity intake without blocking triage</li>
          </ol>
        </section>
      );
    }

    if (activeStep === 1 || activeStep === 2) {
      return (
        <OcrCapturePanel
          canVerify={canVerifyIntake}
          isUploading={isUploadingDocument}
          uploadStatus={ocrUploadStatus}
          onDocumentUpload={onDocumentUpload}
        />
      );
    }

    if (activeStep === 3) {
      return (
        <DuplicateCandidatePanel
          candidates={matchCandidates}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={onSelectCandidate}
          onOpenPatient={onOpenPatient}
        />
      );
    }

    if (activeStep === 4) {
      return (
        <IdentityFieldReview
          fields={extractedFields}
          fieldDecisions={fieldDecisions}
          canVerify={canVerifyIntake}
          onFieldDecision={onFieldDecision}
        />
      );
    }

    return (
      <section className="patient-verification__finalize-copy">
        <h3>Finalize intake</h3>
        <p>All identity fields must be verified before linking or creating a patient record.</p>
        <DuplicateCandidatePanel
          candidates={matchCandidates}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={onSelectCandidate}
          compact
          title="Selected match"
          description="Confirm the patient match before final action."
        />
      </section>
    );
  };

  return (
    <div className="patient-verification">
      <ProvisionalIdentityPanel
        compact={!highlightProvisional}
        disabled={Boolean(pendingAction) || !canCreatePatient}
        onStart={onProvisionalIntake}
      />

      <ol className="patient-verification__steps" aria-label="Verification steps">
        {VERIFICATION_STEPS.map((step, index) => (
          <li key={step} className={index <= activeStep ? 'patient-verification__step--active' : ''}>
            <button
              type="button"
              onClick={() => onStepChange?.(index)}
              aria-current={index === activeStep ? 'step' : undefined}
            >
              <span>{index + 1}</span>
              {step}
            </button>
          </li>
        ))}
      </ol>

      <div className="patient-verification__content">{renderStepContent()}</div>

      {warnings.length ? (
        <div className="patient-verification__warnings" role="note">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <section className="patient-verification__actions" aria-label="Verification finalize actions">
        <button
          type="button"
          disabled={
            !verificationComplete ||
            !selectedCandidateId ||
            !selectedCandidateOnBoard ||
            Boolean(pendingAction) ||
            !canCreatePatient
          }
          onClick={onLinkPatient}
        >
          <Link2 size={17} aria-hidden />
          {pendingAction.startsWith('Linked') ? 'Linking...' : 'Link to existing patient'}
        </button>
        <button
          type="button"
          disabled={!verificationComplete || Boolean(pendingAction) || !canCreatePatient}
          onClick={onCreatePatient}
        >
          <UserPlus size={17} aria-hidden />
          {pendingAction === 'Create-and-triage intake' ? 'Sending...' : 'Create and send to triage'}
        </button>
      </section>

      {auditLog.length ? (
        <section className="patient-verification__audit" aria-label="Identity audit log">
          <h3>Identity audit log</h3>
          {auditLog.map((entry) => (
            <span key={entry}>{entry}</span>
          ))}
        </section>
      ) : null}
    </div>
  );
}
