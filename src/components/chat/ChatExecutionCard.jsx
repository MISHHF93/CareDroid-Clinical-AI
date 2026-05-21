import React from 'react';
import ToolCard from '../ToolCard';
import {
  getExecutionInputIssue,
  getExecutorCardConfig,
  getMissingRequiredInputPrompts,
  getValidationStatusText,
  summarizeExecutionParameters,
} from '../../utils/chatExecutionModel';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../../navigation/iconRegistry';
import './ChatExecutionCard.css';

const STATUS_COPY = Object.freeze({
  collecting: 'Collect inputs',
  validating: 'Validating',
  preview: 'Ready to execute',
  executing: 'Executing',
  success: 'Succeeded',
  failure: 'Failed',
  available: 'Guided',
  unsupported: 'Unavailable',
});

function ParameterSummary({ action }) {
  const rows = summarizeExecutionParameters(action);
  if (!rows.length) return null;
  return (
    <div className="chat-exec-preview" aria-label="Execution preview">
      <div className="chat-exec-section-title">Preview before execution</div>
      <dl className="chat-exec-summary">
        {rows.map(([label, value]) => (
          <div key={label} className="chat-exec-summary-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="chat-exec-safe-copy">
        Confirming runs the existing backend executor and records the normal authenticated/audited tool path.
      </p>
    </div>
  );
}

function InputRequirementList({ title, items, emptyLabel }) {
  return (
    <div className="chat-exec-requirement-group">
      <div className="chat-exec-section-title">{title}</div>
      {items.length > 0 ? (
        <ul className="chat-exec-requirement-list">
          {items.map((input) => (
            <li key={input.key}>{input.label}</li>
          ))}
        </ul>
      ) : (
        <p className="chat-exec-safe-copy">{emptyLabel}</p>
      )}
    </div>
  );
}

function FollowUpQuestions({ prompts }) {
  if (!prompts.length) return null;
  return (
    <div className="chat-exec-followups" role="status" aria-label="Follow-up questions">
      <div className="chat-exec-section-title">Follow-up needed</div>
      {prompts.map((prompt) => (
        <p key={prompt}>{prompt}</p>
      ))}
    </div>
  );
}

function ValidationStatus({ action }) {
  const text = getValidationStatusText(action);
  return (
    <div className="chat-exec-validation" aria-label="Validation status">
      <span>Validation</span>
      <strong>{text}</strong>
    </div>
  );
}

function ResultDisplay({ action }) {
  if (!action.result) return null;
  return (
    <div className="chat-exec-result" aria-label="Execution result">
      <div className="chat-exec-section-title">Result</div>
      <ToolCard
        toolResult={{
          toolId: action.toolId,
          toolName: action.toolName,
          result: action.result,
        }}
      />
    </div>
  );
}

function DrugInputs({ action, onChangeParam, disabled }) {
  return (
    <div className="chat-exec-fields">
      <label className="chat-exec-field">
        <span>Medications</span>
        <textarea
          value={action.parameters.medicationsText || ''}
          onChange={(e) => onChangeParam('medicationsText', e.target.value)}
          placeholder="One per line or comma-separated, e.g. warfarin, aspirin"
          disabled={disabled}
          rows={3}
        />
      </label>
      <label className="chat-exec-field">
        <span>Severity filter</span>
        <select
          value={action.parameters.severityFilter || 'all'}
          onChange={(e) => onChangeParam('severityFilter', e.target.value)}
          disabled={disabled}
        >
          <option value="all">All severities</option>
          <option value="contraindicated">Contraindicated</option>
          <option value="major">Major</option>
          <option value="moderate">Moderate</option>
          <option value="minor">Minor</option>
        </select>
      </label>
    </div>
  );
}

function LabInputs({ action, onChangeParam, disabled }) {
  return (
    <div className="chat-exec-fields">
      <label className="chat-exec-field">
        <span>Lab values</span>
        <textarea
          value={action.parameters.labValuesText || ''}
          onChange={(e) => onChangeParam('labValuesText', e.target.value)}
          placeholder={'One lab per line: WBC 15.2 K/uL\nor comma form: Sodium,132,mEq/L'}
          disabled={disabled}
          rows={4}
        />
      </label>
      <div className="chat-exec-field-grid">
        <label className="chat-exec-field">
          <span>Age</span>
          <input
            value={action.parameters.patientAge || ''}
            onChange={(e) => onChangeParam('patientAge', e.target.value)}
            placeholder="Years"
            inputMode="numeric"
            disabled={disabled}
          />
        </label>
        <label className="chat-exec-field">
          <span>Sex</span>
          <select
            value={action.parameters.patientSex || ''}
            onChange={(e) => onChangeParam('patientSex', e.target.value)}
            disabled={disabled}
          >
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <label className="chat-exec-field">
        <span>Clinical context</span>
        <input
          value={action.parameters.clinicalContext || ''}
          onChange={(e) => onChangeParam('clinicalContext', e.target.value)}
          placeholder="Optional context, e.g. sepsis evaluation"
          disabled={disabled}
        />
      </label>
    </div>
  );
}

function SofaInputs({ action, onChangeParam, disabled }) {
  const fields = [
    ['pao2', 'PaO2'],
    ['fio2', 'FiO2'],
    ['platelets', 'Platelets'],
    ['bilirubin', 'Bilirubin'],
    ['map', 'MAP'],
    ['gcs', 'GCS'],
    ['creatinine', 'Creatinine'],
    ['urineOutput', 'Urine output'],
  ];
  return (
    <div className="chat-exec-fields">
      <div className="chat-exec-field-grid chat-exec-field-grid--dense">
        {fields.map(([field, label]) => (
          <label key={field} className="chat-exec-field">
            <span>{label}</span>
            <input
              value={action.parameters[field] || ''}
              onChange={(e) => onChangeParam(field, e.target.value)}
              inputMode="decimal"
              disabled={disabled}
            />
          </label>
        ))}
      </div>
      <label className="chat-exec-check">
        <input
          type="checkbox"
          checked={Boolean(action.parameters.mechanicalVentilation)}
          onChange={(e) => onChangeParam('mechanicalVentilation', e.target.checked)}
          disabled={disabled}
        />
        <span>Mechanical ventilation</span>
      </label>
    </div>
  );
}

function ActionInputs({ action, onChangeParam, disabled }) {
  switch (action.toolId) {
    case 'drug-interactions':
      return <DrugInputs action={action} onChangeParam={onChangeParam} disabled={disabled} />;
    case 'lab-interpreter':
      return <LabInputs action={action} onChangeParam={onChangeParam} disabled={disabled} />;
    case 'sofa-calculator':
      return <SofaInputs action={action} onChangeParam={onChangeParam} disabled={disabled} />;
    default:
      return null;
  }
}

export default function ChatExecutionCard({
  action,
  onChangeParam,
  onValidate,
  onExecute,
  onRetry,
  onEdit,
  onOpenTool,
  onUseGuidedChat,
}) {
  if (!action) return null;

  const busy = action.status === 'validating' || action.status === 'executing';
  const inputIssue = action.mode === 'executable' ? getExecutionInputIssue(action) : '';
  const followUpPrompts = action.mode === 'executable' ? getMissingRequiredInputPrompts(action) : [];
  const executorConfig = action.executorConfig || getExecutorCardConfig(action.toolId);
  const canPreview = action.mode === 'executable' && !busy && !inputIssue;
  const canExecute = action.mode === 'executable' && action.status === 'preview' && !busy;
  const statusLabel = STATUS_COPY[action.status] || action.status;

  if (action.mode !== 'executable') {
    return (
      <section className={`chat-exec-card chat-exec-card--${action.mode}`}>
        <header className="chat-exec-header">
          <span className="chat-exec-icon" aria-hidden>
            <NavIcon icon={getToolIcon(action.registryId) || CHROME_ICONS.message} size={18} />
          </span>
          <div>
            <h3>{action.toolName}</h3>
            <p>{action.mode === 'guided' ? 'Guided workflow, not a server executor' : 'Unavailable'}</p>
          </div>
          <span className="chat-exec-status">{statusLabel}</span>
        </header>
        <p className="chat-exec-body">{action.description}</p>
        <div className="chat-exec-notice" role="status">
          This will not run a backend tool executor. Use the supported route below or continue in Chat for guidance.
        </div>
        <div className="chat-exec-actions">
          {action.chatSeed && (
            <button type="button" onClick={() => onUseGuidedChat(action)}>
              Start guided chat
            </button>
          )}
          {action.path && (
            <button type="button" onClick={() => onOpenTool(action)} className="chat-exec-secondary">
              {action.openLabel || 'Open tool'}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`chat-exec-card chat-exec-card--${action.status}`}>
      <header className="chat-exec-header">
        <span className="chat-exec-icon" aria-hidden>
          <NavIcon icon={getToolIcon(action.registryId) || CHROME_ICONS.bolt} size={18} />
        </span>
        <div>
          <h3>{action.toolName}</h3>
          <p>Backend executor: {action.toolId}</p>
        </div>
        <span className="chat-exec-status">{statusLabel}</span>
      </header>

      <p className="chat-exec-body">{executorConfig?.whatItDoes || action.description}</p>

      {executorConfig && (
        <div className="chat-exec-requirements" aria-label="Tool inputs">
          <InputRequirementList
            title="Required inputs"
            items={executorConfig.requiredInputs || []}
            emptyLabel="No backend-required fields; provide available clinical values before running."
          />
          <InputRequirementList
            title="Optional inputs"
            items={executorConfig.optionalInputs || []}
            emptyLabel="No optional inputs documented for this executor."
          />
        </div>
      )}

      <ValidationStatus action={action} />

      <ActionInputs
        action={action}
        onChangeParam={(field, value) => onChangeParam(action.id, field, value)}
        disabled={busy}
      />

      {inputIssue && <div className="chat-exec-notice">{inputIssue}</div>}
      <FollowUpQuestions prompts={followUpPrompts} />
      {action.error && action.status === 'failure' && (
        <div className="chat-exec-error" role="alert">
          <strong>Failure explanation: </strong>
          {action.error}
        </div>
      )}
      {action.validation?.valid === false && (
        <div className="chat-exec-error" role="alert">
          {action.validation.errors?.join(', ') || 'Validation failed.'}
        </div>
      )}
      {(action.status === 'preview' || action.status === 'executing' || action.status === 'success') && (
        <ParameterSummary action={action} />
      )}
      <ResultDisplay action={action} />

      <div className="chat-exec-actions">
        <button type="button" onClick={() => onValidate(action.id)} disabled={!canPreview}>
          {action.status === 'validating' ? 'Validating...' : 'Preview'}
        </button>
        <button
          type="button"
          onClick={() => onExecute(action.id)}
          disabled={!canExecute}
          className="chat-exec-primary"
        >
          {action.status === 'executing' ? 'Executing...' : 'Confirm and execute'}
        </button>
        {action.status === 'failure' && (
          <button type="button" onClick={() => onRetry(action.id)} className="chat-exec-secondary">
            Retry
          </button>
        )}
        {action.status === 'success' && (
          <button type="button" onClick={() => onEdit(action.id)} className="chat-exec-secondary">
            Edit inputs
          </button>
        )}
      </div>
    </section>
  );
}
