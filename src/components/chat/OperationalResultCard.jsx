import React from 'react';
import { Link } from 'react-router-dom';
import { ToolResultBody } from '../ToolCard';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../../navigation/iconRegistry';
import './OperationalResultCard.css';

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatTimestamp(value) {
  if (!value) return 'Just now';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString();
}

function stringifyValue(value) {
  if (value == null || value === '') return 'Not provided';
  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function summarizeInputs(parameters) {
  const entries = Object.entries(parameters || {}).filter(([, value]) => value != null && value !== '');
  return entries.slice(0, 6);
}

function inferStatus(result) {
  const errors = asArray(result?.errors);
  const warnings = asArray(result?.warnings);
  if (result?.setupRequired || result?.unsupported || result?.errorCode === 'UNSUPPORTED_TOOL') return 'needs setup';
  if (result?.success === false || errors.length > 0) return 'failed';
  if (warnings.length > 0) return 'warning';
  return 'success';
}

function summarizeOutput(toolResult, status) {
  const result = toolResult?.result || {};
  const data = result.data || {};
  const errors = asArray(result.errors);

  if (status === 'failed' && errors.length > 0) return errors.join(' ');
  if (result.interpretation) return result.interpretation;

  switch (toolResult?.toolId) {
    case 'drug-interactions':
    case 'drug-interaction-checker': {
      const count = data.interactions?.length || 0;
      return count > 0
        ? `${count} interaction${count === 1 ? '' : 's'} found.`
        : 'No significant interactions were found.';
    }
    case 'lab-interpreter': {
      if (data.summary) {
        const abnormal = data.summary.abnormal ?? 0;
        const total = data.summary.total ?? 0;
        const critical = data.summary.critical ?? 0;
        return `${abnormal} of ${total} values abnormal${critical ? `; ${critical} critical` : ''}.`;
      }
      break;
    }
    case 'sofa-calculator': {
      if (data.totalScore != null) return `Total SOFA score: ${data.totalScore}.`;
      break;
    }
    default:
      break;
  }

  if (typeof data.summary === 'string') return data.summary;
  if (result.message) return result.message;
  return status === 'success' ? 'The operation completed successfully.' : 'Review the detailed result below.';
}

function nextBestActions(status, followUpSuggestions) {
  const suggested = asArray(followUpSuggestions).slice(0, 2);
  if (suggested.length > 0) {
    return [
      ...suggested.slice(0, 1),
      { label: 'Open recommended next actions', path: '/recommendations' },
    ];
  }
  if (status === 'failed') {
    return [
      'Review the failure explanation.',
      { label: 'Ask Assistant for recovery', path: '/assistant' },
    ];
  }
  if (status === 'warning') {
    return [
      { label: 'Review warnings in timeline', path: '/timeline' },
      'Document the decision support output if used.',
    ];
  }
  if (status === 'needs setup') {
    return [
      { label: 'Open settings', path: '/settings' },
      'Retry after setup is complete.',
    ];
  }
  return [
    { label: 'Review detailed output', path: '/timeline' },
    { label: 'Open recommended next actions', path: '/recommendations' },
  ];
}

function actionLabel(action) {
  return typeof action === 'string' ? action : action.label;
}

export default function OperationalResultCard({
  toolResult,
  parameters,
  timestamp,
  source,
  followUpSuggestions,
  onRetry,
  onEdit,
}) {
  if (!toolResult) return null;

  const result = toolResult.result || {};
  const status = inferStatus(result);
  const inputEntries = summarizeInputs(parameters || toolResult.parameters || result.parameters);
  const canRetryOrEdit = typeof onRetry === 'function' || typeof onEdit === 'function';
  const sourceLabel = source || (toolResult.toolId ? `POST /api/tools/${toolResult.toolId}/execute` : null);

  return (
    <section className={`operational-result-card operational-result-card--${status.replace(' ', '-')}`}>
      <header className="operational-result-card__header">
        <span className="operational-result-card__icon" aria-hidden>
          <NavIcon icon={getToolIcon(toolResult.toolId)} size={18} />
        </span>
        <div>
          <div className="operational-result-card__eyebrow">Operational result</div>
          <h3 className="operational-result-card__title">
            {toolResult.toolName || toolResult.toolId || 'Tool result'}
          </h3>
        </div>
        <span className={`operational-result-card__status operational-result-card__status--${status.replace(' ', '-')}`}>
          {status}
        </span>
      </header>

      <div className="operational-result-card__body">
        <div className="operational-result-card__grid">
          <div>
            <div className="operational-result-card__label">Action performed</div>
            <div className="operational-result-card__value">
              Executed {toolResult.toolName || toolResult.toolId || 'tool'}
            </div>
          </div>
          <div>
            <div className="operational-result-card__label">Timestamp</div>
            <div className="operational-result-card__value">
              {formatTimestamp(result.timestamp || timestamp)}
            </div>
          </div>
          {sourceLabel && (
            <div>
              <div className="operational-result-card__label">Source route</div>
              <code className="operational-result-card__code">{sourceLabel}</code>
            </div>
          )}
        </div>

        {inputEntries.length > 0 && (
          <div className="operational-result-card__section">
            <div className="operational-result-card__label">Inputs used</div>
            <dl className="operational-result-card__inputs">
              {inputEntries.map(([key, value]) => (
                <div key={key} className="operational-result-card__input">
                  <dt>{key}</dt>
                  <dd>{stringifyValue(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="operational-result-card__section">
          <div className="operational-result-card__label">Output summary</div>
          <p className="operational-result-card__summary">{summarizeOutput(toolResult, status)}</p>
        </div>

        <div className="operational-result-card__section">
          <div className="operational-result-card__label">Next best actions</div>
          <ul className="operational-result-card__actions">
            {nextBestActions(status, followUpSuggestions).map((action) => (
              <li key={actionLabel(action)}>
                {typeof action === 'object' && action.path ? (
                  <Link to={action.path}>{action.label}</Link>
                ) : (
                  actionLabel(action)
                )}
              </li>
            ))}
          </ul>
        </div>

        {canRetryOrEdit && (
          <div className="operational-result-card__controls" aria-label="Result recovery actions">
            {onRetry && (
              <button type="button" onClick={onRetry}>
                <NavIcon icon={CHROME_ICONS.bolt} size={14} aria-hidden />
                Retry
              </button>
            )}
            {onEdit && (
              <button type="button" onClick={onEdit}>
                <NavIcon icon={CHROME_ICONS.fileEdit} size={14} aria-hidden />
                Edit inputs
              </button>
            )}
          </div>
        )}

        <div className="operational-result-card__details">
          <ToolResultBody toolResult={toolResult} />
        </div>
      </div>
    </section>
  );
}
