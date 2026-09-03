import { useRef, useState } from 'react';
import { FileScan, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';
import { captureIntakeArtifact } from '../../services/intakeArtifactCapture';
import OcrIntakeApi from '../../services/ocrIntakeApi';
import {
  applyExtractedFieldsToReceptionDraft,
  type ReceptionIntakeDraft,
} from '../../services/receptionIntakeOrchestrator';
import { listReceptionArtifacts } from '../../config/intakeArtifactRegistry';
import './ReceptionDocumentCapture.css';

export type ReceptionDocumentCaptureProps = {
  draft: ReceptionIntakeDraft;
  onDraftChange: (patch: Partial<ReceptionIntakeDraft> | ReceptionIntakeDraft) => void;
  actorName?: string;
  patientId?: string;
  disabled?: boolean;
};

type CaptureState = 'idle' | 'processing' | 'ready' | 'applied' | 'error';

/**
 * Reception desk OCR capture strip — upload ID/health card/insurance/etc.,
 * review confidence, accept high-confidence fields into the intake draft.
 * Does not auto-create a patient.
 */
export default function ReceptionDocumentCapture({
  draft,
  onDraftChange,
  actorName = 'Reception',
  patientId,
  disabled = false,
}: ReceptionDocumentCaptureProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<CaptureState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [ocrJobId, setOcrJobId] = useState('');
  const [fieldPreview, setFieldPreview] = useState<
    Array<{ field: string; value: string; confidence: number }>
  >([]);
  const [artifactLabel, setArtifactLabel] = useState('Document');
  const ocrEnabled = isBackendCapabilityEnabled('emergencyOcrIntake');
  const artifactOptions = listReceptionArtifacts().slice(0, 8);

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return;
    setState('processing');
    setStatusMessage('Reading document…');
    setFieldPreview([]);
    try {
      const captured = await captureIntakeArtifact({
        file,
        sessionId: draft.id,
        staff: actorName,
        boardPatient: patientId ? { id: patientId } : null,
      });
      setArtifactLabel(captured.artifactLabel || 'Document');
      setOcrJobId(captured.ocrJobId || '');
      const preview = (captured.extractedFields || [])
        .map((row) => ({
          field: String(row.field || ''),
          value: String(row.extracted || '').trim(),
          confidence: Number(captured.confidence) || 0,
        }))
        .filter((row) => row.field && row.value)
        .slice(0, 10);
      setFieldPreview(preview);

      if (captured.ocrFailed && !preview.length) {
        setState('error');
        setStatusMessage(
          captured.auditNote ||
            'OCR could not extract fields. Continue with manual entry — workflow is not blocked.',
        );
        return;
      }

      setState('ready');
      setStatusMessage(
        captured.ocrFailed
          ? `${captured.auditNote || 'Partial extraction'} — review and accept before routing.`
          : `${preview.length} field${preview.length === 1 ? '' : 's'} extracted from ${captured.artifactLabel}. Review confidence, then accept.`,
      );
    } catch (error) {
      setState('error');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Document capture failed. Continue with manual entry.',
      );
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const acceptIntoDraft = async (autoAcceptHighConfidence = true) => {
    if (disabled || state === 'processing') return;
    setState('processing');
    try {
      let fieldsForDraft = fieldPreview.map((row) => ({
        field: row.field,
        value: row.value,
        extracted: row.value,
        confidence: row.confidence,
        status: row.confidence >= 0.9 ? 'accepted' : 'pending',
      }));

      if (ocrJobId && ocrEnabled) {
        try {
          // Accept high-confidence fields on the server job, then apply.
          for (const row of fieldPreview) {
            if (row.confidence < 0.65) continue;
            await OcrIntakeApi.reviewField(
              ocrJobId,
              row.field,
              row.confidence >= 0.9 ? 'accepted' : 'edited',
              row.confidence >= 0.9 ? undefined : row.value,
              actorName,
            ).catch(() => undefined);
          }
          const applied = await OcrIntakeApi.applyToIntake(ocrJobId, actorName, undefined, {
            autoAcceptHighConfidence,
          });
          if (applied.appliedDemographics) {
            const demo = applied.appliedDemographics;
            fieldsForDraft = [
              ...fieldsForDraft,
              ...(demo.firstName
                ? [
                    {
                      field: 'firstName',
                      value: demo.firstName,
                      extracted: demo.firstName,
                      confidence: 1,
                      status: 'accepted',
                    },
                  ]
                : []),
              ...(demo.lastName
                ? [
                    {
                      field: 'lastName',
                      value: demo.lastName,
                      extracted: demo.lastName,
                      confidence: 1,
                      status: 'accepted',
                    },
                  ]
                : []),
              ...(demo.dateOfBirth
                ? [
                    {
                      field: 'dateOfBirth',
                      value: demo.dateOfBirth,
                      extracted: demo.dateOfBirth,
                      confidence: 1,
                      status: 'accepted',
                    },
                  ]
                : []),
              ...(demo.sex
                ? [
                    {
                      field: 'sex',
                      value: demo.sex,
                      extracted: demo.sex,
                      confidence: 1,
                      status: 'accepted',
                    },
                  ]
                : []),
              ...(demo.phone
                ? [
                    {
                      field: 'phone',
                      value: demo.phone,
                      extracted: demo.phone,
                      confidence: 1,
                      status: 'accepted',
                    },
                  ]
                : []),
              ...(demo.healthCardNumber
                ? [
                    {
                      field: 'healthCardNumber',
                      value: demo.healthCardNumber,
                      extracted: demo.healthCardNumber,
                      confidence: 1,
                      status: 'accepted',
                    },
                  ]
                : []),
            ];
          }
        } catch (applyError) {
          // Local draft merge still proceeds — OCR apply failure must not block registration.
          setStatusMessage(
            applyError instanceof Error
              ? `${applyError.message} Local form will still be filled from extracted fields.`
              : 'Server apply deferred — filling local form from extracted fields.',
          );
        }
      }

      const nextDraft = applyExtractedFieldsToReceptionDraft(draft, fieldsForDraft as any, {
        sessionId: draft.id,
      });
      onDraftChange(nextDraft);
      setState('applied');
      setStatusMessage(
        `Accepted fields applied to intake form from ${artifactLabel}. Verify before create & route.`,
      );
    } catch (error) {
      setState('error');
      setStatusMessage(error instanceof Error ? error.message : 'Could not apply document fields.');
    }
  };

  return (
    <section
      className="reception-document-capture"
      aria-labelledby="reception-document-capture-title"
    >
      <div className="reception-document-capture__header">
        <h3 id="reception-document-capture-title">
          <FileScan size={16} aria-hidden="true" />
          Document scan (OCR)
        </h3>
        <span className="reception-document-capture__hint">
          {ocrEnabled
            ? 'ID · health card · insurance · passport · referral'
            : 'OCR service unavailable — manual entry only'}
        </span>
      </div>

      <div className="reception-document-capture__actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
          className="reception-document-capture__file"
          disabled={disabled || state === 'processing' || !ocrEnabled}
          aria-label="Upload patient document for OCR"
          onChange={(event) => void handleFile(event.target.files?.[0] || null)}
        />
        <button
          type="button"
          className="reception-document-capture__upload"
          disabled={disabled || state === 'processing' || !ocrEnabled}
          onClick={() => inputRef.current?.click()}
        >
          {state === 'processing' ? (
            <>
              <Loader2 size={16} className="reception-document-capture__spin" aria-hidden="true" />
              Processing…
            </>
          ) : (
            <>
              <FileScan size={16} aria-hidden="true" />
              Scan / upload document
            </>
          )}
        </button>
        {(state === 'ready' || state === 'applied') && fieldPreview.length > 0 ? (
          <button
            type="button"
            className="reception-document-capture__accept"
            disabled={disabled}
            onClick={() => void acceptIntoDraft(true)}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            Accept & fill form
          </button>
        ) : null}
      </div>

      {artifactOptions.length ? (
        <p className="reception-document-capture__types" role="note">
          Supported: {artifactOptions.map((a) => a.label).join(' · ')}
        </p>
      ) : null}

      {statusMessage ? (
        <p
          className={`reception-document-capture__status reception-document-capture__status--${state}`}
          role="status"
        >
          {state === 'error' ? <AlertTriangle size={14} aria-hidden="true" /> : null}
          {statusMessage}
        </p>
      ) : null}

      {fieldPreview.length > 0 ? (
        <ul className="reception-document-capture__fields" aria-label="Extracted fields">
          {fieldPreview.map((row) => {
            const band = row.confidence >= 0.9 ? 'high' : row.confidence >= 0.65 ? 'medium' : 'low';
            return (
              <li
                key={`${row.field}-${row.value}`}
                className={`reception-document-capture__field is-${band}`}
              >
                <span className="reception-document-capture__field-name">{row.field}</span>
                <span className="reception-document-capture__field-value">{row.value}</span>
                <span className="reception-document-capture__field-conf" title="OCR confidence">
                  {Math.round(row.confidence * 100)}%
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
