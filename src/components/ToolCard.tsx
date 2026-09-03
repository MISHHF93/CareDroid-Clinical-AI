/**
 * Clinical tool results in chat — token-themed, no external UI kit.
 */

import React from 'react';
import './ToolCard.css';
import { NavIcon } from '../navigation/NavIcon';
import { getToolIcon } from '../navigation/iconRegistry';

function Notice({ variant, title = undefined as any, children }) {
  return (
    <div className={`tool-card-notice tool-card-notice--${variant}`} role="status">
      {title && <div className="tool-card-strong u-mb-8">{title}</div>}
      {children}
    </div>
  );
}

export function ToolResultBody({ toolResult }) {
  if (!toolResult) return null;

  const { toolId, result } = toolResult;
  const { data, interpretation, citations, warnings, errors, disclaimer, timestamp } = result || {};

  const renderToolContent = () => {
    switch (toolId) {
      case 'sofa-calculator':
        return renderSofaCalculator(data);
      case 'drug-interaction-checker':
      case 'drug-interactions':
        return renderDrugChecker(data);
      case 'lab-interpreter':
        return renderLabInterpreter(data);
      default:
        return renderGenericTool(data);
    }
  };

  const interpVariant = errors?.length > 0 ? 'error' : warnings?.length > 0 ? 'warning' : 'info';

  return (
    <>
      {interpretation && <Notice variant={interpVariant}>{interpretation}</Notice>}

      {renderToolContent()}

      {warnings && warnings.length > 0 && (
        <Notice variant="warning" title="Warnings">
          <ul className="u-list-reset">
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </Notice>
      )}

      {citations && citations.length > 0 && (
        <div className="u-mt-16">
          <hr className="tool-card-divider" />
          <div className="tool-card-muted u-mb-8">
            <strong>References:</strong>
          </div>
          <ul className="u-list-tight">
            {citations.map((citation, idx) => (
              <li key={idx}>
                {citation.title} - {citation.reference}
                {citation.url && (
                  <>
                    {' '}
                    <a href={citation.url} target="_blank" rel="noopener noreferrer">
                      [Link]
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {disclaimer && <p className="tool-card-disclaimer">⚠️ {disclaimer}</p>}

      {timestamp && (
        <span className="tool-card-ts">Executed at {new Date(timestamp).toLocaleString()}</span>
      )}
    </>
  );
}

const ToolCard = React.memo(function ToolCard({ toolResult }: any) {
  if (!toolResult) return null;

  const { toolId, toolName } = toolResult;

  return (
    <section className="tool-result-card" aria-label={toolName || 'Tool result'}>
      <header className="tool-result-card-header">
        <span className="tool-result-card-icon" aria-hidden>
          <NavIcon icon={getToolIcon(toolId)} size={18} />
        </span>
        <span>{toolName}</span>
      </header>
      <div className="tool-result-card-body">
        <ToolResultBody toolResult={toolResult} />
      </div>
    </section>
  );
});

function renderSofaCalculator(data) {
  if (!data) return null;

  const componentScores = [
    { label: 'Respiration', value: data.respirationScore, key: 'respiration' },
    { label: 'Coagulation', value: data.coagulationScore, key: 'coagulation' },
    { label: 'Liver', value: data.liverScore, key: 'liver' },
    { label: 'Cardiovascular', value: data.cardiovascularScore, key: 'cardiovascular' },
    { label: 'CNS', value: data.cnsScore, key: 'cns' },
    { label: 'Renal', value: data.renalScore, key: 'renal' },
  ].filter((item) => item.value !== undefined);

  return (
    <div>
      <div className="u-ta-center u-mb-20">
        <h2 className="tool-card-title-lg">{data.totalScore}</h2>
        <div className="tool-card-muted">Total SOFA Score (0-24)</div>
      </div>

      <div className="tool-card-table-wrap">
        <table className="tool-card-table">
          <thead>
            <tr>
              <th>Organ System</th>
              <th className="u-ta-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {componentScores.map((row) => {
              const score = row.value;
              const bg = score === 0 ? '#16a34a' : score <= 2 ? '#ca8a04' : '#dc2626';
              return (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="u-ta-center">
                    <span className="tool-card-score-pill" style={{ backgroundColor: bg }}>
                      {score}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.mortalityEstimate && (
        <Notice variant="info" title="Mortality Estimate">
          {data.mortalityEstimate}
        </Notice>
      )}
    </div>
  );
}

function renderDrugChecker(data) {
  if (!data?.interactions || data.interactions.length === 0) {
    return (
      <Notice variant="success">
        <span className="tool-card-strong">No Interactions Detected</span>
        <div className="u-mt-8">No significant drug interactions were found.</div>
      </Notice>
    );
  }

  const groupedInteractions = {
    contraindicated: data.interactions.filter((i) => i.severity === 'contraindicated'),
    major: data.interactions.filter((i) => i.severity === 'major'),
    moderate: data.interactions.filter((i) => i.severity === 'moderate'),
    minor: data.interactions.filter((i) => i.severity === 'minor'),
  };

  return (
    <div>
      <span className="tool-card-strong">Found {data.interactions.length} interaction(s)</span>
      <hr className="tool-card-divider" />

      {groupedInteractions.contraindicated.length > 0 && (
        <div className="u-mb-16">
          <span className="tool-card-pill tool-card-pill--error">Contraindicated</span>
          <ul className="u-mt-8">
            {groupedInteractions.contraindicated.map((interaction, idx) => (
              <li key={idx}>
                <span className="tool-card-strong">
                  {interaction.drug1} + {interaction.drug2}
                </span>
                : {interaction.description}
                {interaction.recommendation && (
                  <>
                    <br />
                    <span className="tool-card-danger">⚠️ {interaction.recommendation}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {groupedInteractions.major.length > 0 && (
        <div className="u-mb-16">
          <span className="tool-card-pill tool-card-pill--warn">Major</span>
          <ul className="u-mt-8">
            {groupedInteractions.major.map((interaction, idx) => (
              <li key={idx}>
                <span className="tool-card-strong">
                  {interaction.drug1} + {interaction.drug2}
                </span>
                : {interaction.description}
                {interaction.recommendation && (
                  <>
                    <br />
                    <span className="tool-card-danger">⚠️ {interaction.recommendation}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {groupedInteractions.moderate.length > 0 && (
        <div className="u-mb-16">
          <span className="tool-card-pill tool-card-pill--info">Moderate</span>
          <ul className="u-mt-8">
            {groupedInteractions.moderate.slice(0, 3).map((interaction, idx) => (
              <li key={idx}>
                {interaction.drug1} + {interaction.drug2}: {interaction.description}
              </li>
            ))}
            {groupedInteractions.moderate.length > 3 && (
              <li className="tool-card-muted">
                ... and {groupedInteractions.moderate.length - 3} more moderate interaction(s)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function statusTagClass(status) {
  const map = {
    normal: 'tool-card-tag--ok',
    high: 'tool-card-tag--warn',
    low: 'tool-card-tag--warn',
    'critical-high': 'tool-card-tag--err',
    'critical-low': 'tool-card-tag--err',
  };
  return map[status] || 'tool-card-tag--ok';
}

function statusLabel(status) {
  const labels = {
    normal: 'Normal',
    high: 'High',
    low: 'Low',
    'critical-high': 'Critical High',
    'critical-low': 'Critical Low',
  };
  return labels[status] || status;
}

function renderLabInterpreter(data) {
  if (!data) return null;

  const hasCritical = data.summary?.critical > 0;

  return (
    <div>
      {data.summary && (
        <div className="u-mb-16 u-ta-center">
          <span>
            {data.summary.abnormal} of {data.summary.total} values abnormal
          </span>
          {hasCritical && (
            <>
              {' '}
              <span className="tool-card-score-pill tool-card-score-pill--critical">
                {data.summary.critical} critical
              </span>
            </>
          )}
        </div>
      )}

      {data.criticalValues && data.criticalValues.length > 0 && (
        <Notice variant="error" title="Critical Values">
          <ul className="u-list-reset">
            {data.criticalValues.map((lab, idx) => (
              <li key={idx}>
                <span className="tool-card-strong">{lab.name}</span>: {lab.value} {lab.unit} (
                <span className="tool-card-danger">{lab.status}</span>)
              </li>
            ))}
          </ul>
        </Notice>
      )}

      {data.interpretations && data.interpretations.length > 0 && (
        <div>
          {data.interpretations.map((interp, idx) => (
            <div key={idx} className="u-mb-16">
              <h3 className="tool-card-title-sm">{interp.category}</h3>
              <p className="u-mb-8">{interp.clinicalSignificance}</p>
              {interp.suggestedActions && interp.suggestedActions.length > 0 && (
                <>
                  <div className="tool-card-muted u-fs-12">Suggested Actions:</div>
                  <ul className="u-mt-4 u-pl-20 u-fs-12">
                    {interp.suggestedActions.map((action, actionIdx) => (
                      <li key={actionIdx}>{action}</li>
                    ))}
                  </ul>
                </>
              )}
              {idx < data.interpretations.length - 1 && <hr className="tool-card-divider" />}
            </div>
          ))}
        </div>
      )}

      {data.labValues && data.labValues.length > 0 && (
        <div className="u-mt-16">
          <hr className="tool-card-divider" />
          <div className="tool-card-strong u-mb-8">All Lab Values</div>
          <div className="tool-card-table-wrap">
            <table className="tool-card-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Value</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.labValues.map((row) => (
                  <tr key={row.name || row.key}>
                    <td>{row.name}</td>
                    <td>
                      {row.value} {row.unit}
                    </td>
                    <td>{row.referenceRange}</td>
                    <td>
                      <span className={`tool-card-tag ${statusTagClass(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function renderGenericTool(data) {
  return (
    <div>
      <pre className="tool-card-pre">{JSON.stringify(data ?? {}, null, 2)}</pre>
    </div>
  );
}

export default ToolCard;
