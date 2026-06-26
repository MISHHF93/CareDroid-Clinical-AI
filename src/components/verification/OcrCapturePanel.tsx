import React, { useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import './OcrCapturePanel.css';

export default function OcrCapturePanel({
  canVerify = true,
  isUploading = false,
  uploadStatus = '',
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
}) {
  const fileInputRef = useRef<any>(null);
  const cameraInputRef = useRef<any>(null);

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
        <h3 id="ocr-capture-panel-title">Document capture &amp; OCR</h3>
        <p>
          Photograph or upload a document. CareDroid extracts fields for staff review before anything is
          saved to the chart.
          {selectedArtifactLabel ? ` Capturing: ${selectedArtifactLabel}.` : ''}
        </p>
      </header>

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
        >
          <Camera size={16} aria-hidden />
          {isUploading ? 'Processing...' : 'Take photo'}
        </button>
        <button
          type="button"
          className="ocr-capture-panel__action"
          disabled={isUploading || !canVerify}
          onClick={triggerFilePicker}
        >
          <Upload size={16} aria-hidden />
          Choose file
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

      {extractedPreview.length ? (
        <section className="ocr-capture-panel__extracted" aria-label="Extracted field preview">
          <h4>Extracted for review</h4>
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

      {uploadStatus ? <p className="ocr-capture-panel__status" role="status">{uploadStatus}</p> : null}
    </section>
  );
}