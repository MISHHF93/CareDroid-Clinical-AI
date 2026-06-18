import React from 'react';
import './OcrCapturePanel.css';

export default function OcrCapturePanel({
  canVerify = true,
  isUploading = false,
  uploadStatus = '',
  onDocumentUpload,
}) {
  return (
    <section className="ocr-capture-panel" aria-labelledby="ocr-capture-panel-title">
      <header>
        <h3 id="ocr-capture-panel-title">Document capture &amp; OCR</h3>
        <p>Upload a health card, driver licence, or referral for field extraction.</p>
      </header>
      <label className="ocr-capture-panel__upload">
        <input
          type="file"
          accept="image/*,.pdf"
          disabled={isUploading || !canVerify}
          onChange={(event) => onDocumentUpload?.(event)}
        />
        {isUploading ? 'Uploading...' : 'Choose document'}
      </label>
      {uploadStatus ? <p className="ocr-capture-panel__status" role="status">{uploadStatus}</p> : null}
    </section>
  );
}
