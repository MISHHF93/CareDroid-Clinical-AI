import { useEffect, useMemo, useState } from 'react';
import { classifyOrchestratorExecution } from '../../services/clinicalOrchestratorApi';
import {
  fetchClinicalToolMetadata,
  fetchToolStatistics,
  validateClinicalTool,
} from '../../services/clinicalToolsApi';
import './ToolPreflightStatus.css';

const INITIAL_REMOTE_STATE: any = Object.freeze({
  loading: true,
  metadata: null,
  metadataError: '',
  stats: null,
  statsError: '',
});

const INITIAL_VALIDATION_STATE: any = Object.freeze({
  loading: false,
  valid: false,
  errors: [],
  warnings: [],
  error: '',
  resolvedToolId: '',
});

function formatFieldName(name) {
  return String(name || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeRequiredInputs(metadata, requiredInputs) {
  const schemaRequired = (metadata?.parameters || [])
    .filter((param) => param?.required)
    .map((param) => ({
      label: param.description || formatFieldName(param.name),
      present: undefined,
      source: 'schema',
    }));

  return [
    ...schemaRequired,
    ...requiredInputs.map((input) => ({
      label: input.label,
      present: Boolean(input.present),
      source: 'local',
    })),
  ];
}

export default function ToolPreflightStatus({
  toolId,
  parameters,
  requiredInputs = [] as any[],
  onReadyChange,
}) {
  const classification = useMemo(() => classifyOrchestratorExecution(toolId), [toolId]);
  const executableToolId = classification.status === 'executable' ? classification.nluToolId : null;
  const [remoteState, setRemoteState] = useState(INITIAL_REMOTE_STATE);
  const [validationState, setValidationState] = useState(INITIAL_VALIDATION_STATE);
  const serializedParameters = useMemo(() => JSON.stringify(parameters || {}), [parameters]);

  useEffect(() => {
    if (!executableToolId) {
      onReadyChange?.(false);
      return undefined;
    }

    let cancelled = false;
    setRemoteState(INITIAL_REMOTE_STATE);

    async function loadRemoteStatus() {
      const [metadataResult, statsResult] = await Promise.all([
        fetchClinicalToolMetadata(executableToolId),
        fetchToolStatistics(),
      ]);
      if (cancelled) return;
      setRemoteState({
        loading: false,
        metadata: metadataResult.ok ? metadataResult.data : null,
        metadataError: metadataResult.ok ? '' : metadataResult.error || 'Metadata unavailable.',
        stats: statsResult.ok ? statsResult.data : null,
        statsError: statsResult.ok ? '' : statsResult.error || 'Statistics unavailable.',
      });
    }

    loadRemoteStatus();
    return () => {
      cancelled = true;
    };
  }, [executableToolId, onReadyChange]);

  useEffect(() => {
    if (!executableToolId) return undefined;

    let cancelled = false;
    setValidationState((current) => ({ ...current, loading: true, error: '' }));

    const timer = window.setTimeout(async () => {
      const result = await validateClinicalTool(executableToolId, JSON.parse(serializedParameters));
      if (cancelled) return;

      if (!result.ok) {
        setValidationState({
          loading: false,
          valid: false,
          errors: [],
          warnings: [],
          error: result.error || 'Validation unavailable.',
          resolvedToolId: '',
        });
        return;
      }

      const data = result.data || {};
      setValidationState({
        loading: false,
        valid: Boolean(data.valid),
        errors: Array.isArray(data.errors) ? data.errors : [],
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        error: '',
        resolvedToolId: data.resolvedToolId || executableToolId,
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [executableToolId, serializedParameters]);

  const requiredStatus = useMemo(
    () => normalizeRequiredInputs(remoteState.metadata, requiredInputs),
    [remoteState.metadata, requiredInputs]
  );
  const missingLocalInputs = requiredStatus.filter((input) => input.source === 'local' && !input.present);
  const remoteAvailable = Boolean(executableToolId && !remoteState.loading && remoteState.metadata);
  const registeredInStats = Boolean(
    remoteState.stats?.tools?.some((tool) => tool.id === executableToolId)
  );
  const validationReady =
    !validationState.loading &&
    validationState.valid &&
    !validationState.error &&
    validationState.errors.length === 0;
  const safeToExecute = remoteAvailable && validationReady && missingLocalInputs.length === 0;

  useEffect(() => {
    onReadyChange?.(safeToExecute);
  }, [onReadyChange, safeToExecute]);

  if (!executableToolId) return null;

  return (
    <section className="tool-preflight" aria-label="Tool preflight validation and status">
      <div className="tool-preflight__header">
        <div>
          <div className="tool-preflight__eyebrow">Preflight</div>
          <h3>{remoteState.metadata?.name || formatFieldName(executableToolId)}</h3>
        </div>
        <span
          className={`tool-preflight__safe-state${
            safeToExecute ? ' tool-preflight__safe-state--ready' : ''
          }`}
        >
          {safeToExecute ? 'Safe to execute' : 'Needs review'}
        </span>
      </div>

      <div className="tool-preflight__grid">
        <div className="tool-preflight__item">
          <span className="tool-preflight__label">Availability</span>
          <strong>{remoteAvailable ? 'Available' : remoteState.loading ? 'Checking...' : 'Unavailable'}</strong>
          {registeredInStats && <small>Registered in tool statistics</small>}
          {remoteState.metadataError && <small className="tool-preflight__error">{remoteState.metadataError}</small>}
          {!registeredInStats && remoteState.statsError && (
            <small className="tool-preflight__muted">{remoteState.statsError}</small>
          )}
        </div>

        <div className="tool-preflight__item">
          <span className="tool-preflight__label">Required inputs</span>
          {requiredStatus.length > 0 ? (
            <ul className="tool-preflight__list">
              {requiredStatus.map((input) => (
                <li
                  key={`${input.source}-${input.label}`}
                  className={input.present === false ? 'tool-preflight__missing' : ''}
                >
                  {input.label}
                </li>
              ))}
            </ul>
          ) : (
            <strong>At least one relevant clinical input</strong>
          )}
        </div>

        <div className="tool-preflight__item">
          <span className="tool-preflight__label">Validation readiness</span>
          <strong>
            {validationState.loading
              ? 'Checking...'
              : validationReady
                ? 'Ready'
                : 'Not ready'}
          </strong>
          {validationState.resolvedToolId && <small>Executor: {validationState.resolvedToolId}</small>}
        </div>
      </div>

      {(missingLocalInputs.length > 0 ||
        validationState.errors.length > 0 ||
        validationState.warnings.length > 0 ||
        validationState.error) && (
        <div className="tool-preflight__warnings" aria-live="polite">
          {missingLocalInputs.map((input) => (
            <div key={`missing-${input.label}`} className="tool-preflight__warning">
              Missing: {input.label}
            </div>
          ))}
          {validationState.errors.map((item) => (
            <div key={`error-${item}`} className="tool-preflight__warning tool-preflight__warning--error">
              {item}
            </div>
          ))}
          {validationState.warnings.map((item) => (
            <div key={`warning-${item}`} className="tool-preflight__warning">
              {item}
            </div>
          ))}
          {validationState.error && (
            <div className="tool-preflight__warning tool-preflight__warning--error">
              {validationState.error}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
