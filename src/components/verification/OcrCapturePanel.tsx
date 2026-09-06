import React, { useRef, useEffect } from 'react';
import { Camera, Upload } from 'lucide-react';
import './OcrCapturePanel.css';

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: 'Queued',
  processing: 'Processing…',
  completed: 'Processed',
  failed: 'Failed',
};

export default function OcrCapturePanel({
  canVerify = true,
  isUploading = false,
  uploadStatus = '',
  jobStatus = '',
  warnings = [] as string[],
  onDocumentUpload,
  previewDataUrl = '',
  supplementalText = '',
  onSupplementalTextChange,
  extractedPreview = [] as any[],
  onCaptureFromCamera,
  artifactOptions = [] as any[],
  selectedArtifactId = '',
  onArtifactChange,
  selectedArtifactLabel = '',
  autoAdvance = false,
}) {
  const isFailedJob = jobStatus === 'failed';
  const fileInputRef = useRef<any>(null);
  const cameraInputRef = useRef<any>(null);

  // Auto-advance when job completes successfully
  useEffect(() => {
    if (autoAdvance && jobStatus === 'completed' && onArtifactChange) {
      // The parent will handle step advancement
    }
  }, [autoAdvance, jobStatus, onArtifactChange]);

  const triggerFilePicker = () => {
    if (!canVerify || isUploading) return;
    fileInputRef.current?.click();
  };

  const triggerCamera = () => {
    if (!canVerify || isUploading) return;
    if (typeof onCaptureFromCamera === 'function') {
      onCaptureFromCamera();
      return;
    }
    cameraInputRef.current?.click();
  };

  return (
    <section className="ocr-capture-panel" aria-labelledby="ocr-capture-panel-title">
      <header>
        <h3 id="ocr-capture-panel-title">Document capture & OCR</h3>
        <p>
          Photograph or upload a document. CareDroid extracts fields for staff review before
          anything is saved to the chart.
          {selectedArtifactLabel ? ` Capturing: ${selectedArtifactLabel}.` : ''}
        </p>
        {jobStatus ? (
          <span
            className={[
              'ocr-capture-panel__job-status',
              `ocr-capture-panel__job-status--${jobStatus}`,
            ].join(' ')}
            role="status"
          >
            {JOB_STATUS_LABEL[jobStatus] || jobStatus}
          </span>
        ) : null}
      </header>

      {isFailedJob ? (
        <div className="ocr-capture-panel__failed-fallback" role="alert">
          <p>
            Document processing failed for this upload. Continue with manual entry — the paste field
            below still works.
          </p>
        </div>
      ) : null}

      {warnings.length ? (
        <ul className="ocr-capture-panel__warnings" aria-label="Document processing warnings">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {artifactOptions.length ? (
        <div className="ocr-capture-panel__artifact-picker" role="group" aria-label="Document type">
          {artifactOptions.map((artifact) => (
            <button
              key={artifact.artifactId}
              type="button"
              className={[
                'ocr-capture-panel__artifact-chip',
                selectedArtifactId === artifact.artifactId
                  ? 'ocr-capture-panel__artifact-chip--active'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={!canVerify || isUploading}
              onClick={() => onArtifactChange?.(artifact.artifactId)}
            >
              {artifact.shortLabel}
            </button>
          ))}
        </div>
      ) : null}

      <div className="ocr-capture-panel__actions">
        <button
          type="button"
          className="ocr-capture-panel__action"
          disabled={isUploading || !canVerify}
          onClick={triggerCamera}
          aria-keyshortcuts="C"
          title="Capture from camera (C)"
        >
          <Camera size={16} aria-hidden />
          {isUploading ? 'Processing...' : 'Take photo'}
          <span className="ocr-capture-panel__kbd" aria-hidden="true">
            C
          </span>
        </button>
        <button
          type="button"
          className="ocr-capture-panel__action"
          disabled={isUploading || !canVerify}
          onClick={triggerFilePicker}
          aria-keyshortcuts="U"
          title="Upload file (U)"
        >
          <Upload size={16} aria-hidden />
          Choose file
          <span className="ocr-capture-panel__kbd" aria-hidden="true">
            U
          </span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        hidden
        disabled={isUploading || !canVerify}
        onChange={(event) => onDocumentUpload?.(event)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        disabled={isUploading || !canVerify}
        onChange={(event) => onDocumentUpload?.(event)}
      />

      {previewDataUrl ? (
        <figure className="ocr-capture-panel__preview">
          <img src={previewDataUrl} alt="Captured identity document preview" />
          <figcaption>Captured artifact — verify extracted values before continuing.</figcaption>
        </figure>
      ) : null}

      {extractedPreview.length > 0 ? (
        <section className="ocr-capture-panel__extracted" aria-label="Extracted field preview">
          <h4>
            Extracted for review{' '}
            <span className="ocr-capture-panel__count">{extractedPreview.length}</span>
          </h4>
          <ul>
            {extractedPreview.map((field) => (
              <li key={field.field}>
                <strong>{field.field}</strong>
                <span>{field.extracted || '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <label className="ocr-capture-panel__paste">
        <span>Optional: paste OCR text from the document</span>
        <textarea
          rows={3}
          value={supplementalText}
          disabled={!canVerify || isUploading}
          placeholder="Paste visible text if the image alone did not extract enough fields."
          onChange={(event) => onSupplementalTextChange?.(event.target.value)}
        />
      </label>

      {uploadStatus ? (
        <p className="ocr-capture-panel__status" role="status">
          {uploadStatus}
        </p>
      ) : null}
    </section>
  );
}
