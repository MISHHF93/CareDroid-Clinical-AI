import { useMemo, useState } from 'react';
import StateSourceNotice from '../../components/StateSourceNotice';
import ToolPageLayout from './ToolPageLayout';
import './LabInterpreter.css';
import { executeClinicalTool } from '../../services/clinicalOrchestratorApi';
import { ClinicalExecutorFeedback } from '../../components/clinical/ClinicalExecutorFeedback';
import ToolPreflightStatus from '../../components/clinical/ToolPreflightStatus';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getLabCategoryIcon, getToolIcon } from '../../navigation/iconRegistry';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';

const LabInterpreter = ({ embedded = false, onCloseEmbedded }: any = {}) => {
  const toolConfig = {
    id: 'lab-interp',
    name: 'Lab Interpreter',
    path: '/tools/lab-interpreter',
    color: '#4ECDC4',
    description: 'Interpret lab values and diagnostic tests',
    shortcut: 'Ctrl+2',
    category: 'Diagnostic',
  };

  const [labValues, setLabValues] = useState<any[]>([]);
  const [patientAge, setPatientAge] = useState('');
  const [patientSex, setPatientSex] = useState('');
  const [clinicalContext, setClinicalContext] = useState('');
  const [currentLab, setCurrentLab] = useState({ name: '', value: '', unit: '' });
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [preflightReady, setPreflightReady] = useState(false);

  const commonLabs = [
    { name: 'WBC', unit: 'K/µL' },
    { name: 'Hemoglobin', unit: 'g/dL' },
    { name: 'Platelets', unit: 'K/µL' },
    { name: 'Sodium', unit: 'mEq/L' },
    { name: 'Potassium', unit: 'mEq/L' },
    { name: 'Chloride', unit: 'mEq/L' },
    { name: 'CO2', unit: 'mEq/L' },
    { name: 'Glucose', unit: 'mg/dL' },
    { name: 'BUN', unit: 'mg/dL' },
    { name: 'Creatinine', unit: 'mg/dL' },
    { name: 'Calcium', unit: 'mg/dL' },
    { name: 'ALT', unit: 'U/L' },
    { name: 'AST', unit: 'U/L' },
    { name: 'Alkaline Phosphatase', unit: 'U/L' },
    { name: 'Bilirubin', unit: 'mg/dL' },
    { name: 'Albumin', unit: 'g/dL' },
    { name: 'PT', unit: 'seconds' },
    { name: 'INR', unit: '' },
    { name: 'PTT', unit: 'seconds' },
  ];

  const preflightParameters = useMemo(
    () => ({
      labValues,
      ...(patientAge && { patientAge: parseInt(patientAge) }),
      ...(patientSex && { patientSex }),
      ...(clinicalContext && { clinicalContext }),
    }),
    [clinicalContext, labValues, patientAge, patientSex],
  );

  const handleAddLab = () => {
    if (!currentLab.name || !currentLab.value) return;

    const value = parseFloat(currentLab.value);
    if (isNaN(value)) return;

    setLabValues([
      ...labValues,
      {
        name: currentLab.name,
        value: value,
        unit: currentLab.unit,
      },
    ]);

    setCurrentLab({ name: '', value: '', unit: '' });
  };

  const handleRemoveLab = (index) => {
    setLabValues(labValues.filter((_, i) => i !== index));
  };

  const handleInterpret = async () => {
    if (!preflightReady || labValues.length === 0) return;

    setLoading(true);
    setError(null);
    setUnsupported(false);

    try {
      const execution = await executeClinicalTool('lab-interpreter', preflightParameters);
      if (execution.unsupported) {
        setUnsupported(true);
        setError(execution.message);
        return;
      }
      if (!execution.ok) {
        throw new Error(execution.message || 'Failed to interpret lab values');
      }
      if (execution.data != null) {
        setResults({
          ...execution.data,
          interpretation: execution.interpretation || execution.data.interpretation,
          warnings: execution.warnings || execution.data.warnings || [],
          citations: execution.citations || execution.data.citations || [],
          disclaimer: execution.disclaimer || execution.data.disclaimer,
          timestamp: execution.timestamp || execution.data.timestamp,
        });
      } else {
        throw new Error(execution.errors?.[0] || 'Unknown error occurred');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setLabValues([]);
    setResults(null);
    setError(null);
    setPatientAge('');
    setPatientSex('');
    setClinicalContext('');
  };

  const loadExample = () => {
    setLabValues([
      { name: 'WBC', value: 15.2, unit: 'K/µL' },
      { name: 'Hemoglobin', value: 10.5, unit: 'g/dL' },
      { name: 'Sodium', value: 132, unit: 'mEq/L' },
      { name: 'Potassium', value: 5.8, unit: 'mEq/L' },
      { name: 'Creatinine', value: 2.1, unit: 'mg/dL' },
      { name: 'Glucose', value: 185, unit: 'mg/dL' },
    ]);
    setPatientAge('65');
    setPatientSex('male');
    setClinicalContext('Sepsis evaluation');
    setResults(null);
  };

  return (
    <ToolPageLayout
      tool={toolConfig}
      embedded={embedded}
      onCloseEmbedded={onCloseEmbedded}
      results={results}
    >
      <div className="lab-interpreter-content">
        <StateSourceNotice
          className="lab-source-notice"
          title="Lab interpreter source states"
          states={[
            DEMO_LIVE_STATES.LIVE,
            DEMO_LIVE_STATES.LOCAL_ONLY,
            DEMO_LIVE_STATES.UNSUPPORTED,
          ]}
          details="Entered lab values and examples stay local until submitted. Interpretation uses the existing clinical tool backend when available; if the backend returns unsupported or an error, the page shows that state instead of fake live AI output."
        />

        {/* Input Panel */}
        <div className="lab-input-panel">
          <div className="lab-panel-header">
            <div className="lab-panel-title">
              <span className="lab-panel-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.fileEdit} size={22} />
              </span>
              Lab Values Input
            </div>
          </div>

          {/* Patient Context */}
          <div className="patient-context">
            <div className="context-group">
              <label className="context-label" htmlFor="lab-context-age">
                Age
              </label>
              <input
                id="lab-context-age"
                type="number"
                className="context-input"
                placeholder="Years"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                min="0"
                max="120"
              />
            </div>
            <div className="context-group">
              <label className="context-label" htmlFor="lab-context-sex">
                Sex
              </label>
              <select
                id="lab-context-sex"
                className="context-select"
                value={patientSex}
                onChange={(e) => setPatientSex(e.target.value)}
              >
                <option value="">--</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="context-group">
              <label className="context-label" htmlFor="lab-context-clinical-context">
                Clinical Context
              </label>
              <textarea
                id="lab-context-clinical-context"
                className="context-textarea"
                placeholder="e.g., Sepsis evaluation, routine check-up..."
                value={clinicalContext}
                onChange={(e) => setClinicalContext(e.target.value)}
              />
            </div>
          </div>

          {/* Lab Entry Form */}
          <div className="lab-entry-form">
            <div className="lab-input-group">
              <label className="lab-input-label" htmlFor="lab-entry-name">
                Lab Name
              </label>
              <input
                id="lab-entry-name"
                type="text"
                list="common-labs"
                className="lab-input-field"
                placeholder="e.g., Sodium, WBC"
                value={currentLab.name}
                onChange={(e) => {
                  const selected = commonLabs.find((l) => l.name === e.target.value);
                  setCurrentLab({
                    ...currentLab,
                    name: e.target.value,
                    unit: selected ? selected.unit : currentLab.unit,
                  });
                }}
              />
              <datalist id="common-labs">
                {commonLabs.map((lab) => (
                  <option key={lab.name} value={lab.name} />
                ))}
              </datalist>
            </div>
            <div className="lab-input-group">
              <label className="lab-input-label" htmlFor="lab-entry-value">
                Value
              </label>
              <input
                id="lab-entry-value"
                type="number"
                step="0.1"
                className="lab-input-field"
                placeholder="0.0"
                value={currentLab.value}
                onChange={(e) => setCurrentLab({ ...currentLab, value: e.target.value })}
              />
            </div>
            <div className="lab-input-group">
              <label className="lab-input-label" htmlFor="lab-entry-unit">
                Unit
              </label>
              <input
                id="lab-entry-unit"
                type="text"
                className="lab-input-field"
                placeholder="mg/dL"
                value={currentLab.unit}
                onChange={(e) => setCurrentLab({ ...currentLab, unit: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="lab-add-button"
              onClick={handleAddLab}
              disabled={!currentLab.name || !currentLab.value}
            >
              + Add
            </button>
          </div>

          {/* Lab Values List */}
          {labValues.length > 0 ? (
            <div className="lab-values-list">
              {labValues.map((lab, index) => (
                <div key={index} className="lab-value-item">
                  <div className="lab-value-info">
                    <span className="lab-value-name">{lab.name}</span>
                    <span className="lab-value-display">
                      {lab.value} {lab.unit}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="lab-value-remove"
                    onClick={() => handleRemoveLab(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="lab-values-empty">
              No lab values added yet. Add values above to begin.
            </div>
          )}

          <ToolPreflightStatus
            toolId="lab-interpreter"
            parameters={preflightParameters}
            requiredInputs={[
              {
                label: 'At least 1 lab value',
                present: labValues.length > 0,
              },
            ]}
            onReadyChange={setPreflightReady}
          />

          {/* Action Buttons */}
          <div className="lab-action-buttons">
            <button
              type="button"
              className="lab-interpret-button"
              onClick={handleInterpret}
              disabled={!preflightReady || loading}
            >
              {loading ? (
                <>
                  <div className="lab-spinner lab-spinner--sm"></div>
                  Interpreting...
                </>
              ) : (
                <>
                  <NavIcon icon={getToolIcon('lab-interp')} size={20} />
                  Interpret Lab Values
                </>
              )}
            </button>
            <button type="button" className="lab-load-example-button" onClick={loadExample}>
              <NavIcon icon={CHROME_ICONS.clipboardList} size={18} />
              Load Example
            </button>
            <button
              type="button"
              className="lab-clear-button"
              onClick={handleClear}
              disabled={labValues.length === 0 && !results}
            >
              <NavIcon icon={CHROME_ICONS.trash} size={18} />
              Clear All
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lab-results-panel">
          <div className="lab-panel-header">
            <div className="lab-panel-title">
              <span className="lab-panel-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.barChart} size={22} />
              </span>
              Interpretation Results
            </div>
          </div>

          {loading ? (
            <div className="lab-results-loading">
              <ClinicalExecutorFeedback loading={true} error={null} unsupported={false} unsupportedDetail={null} />
            </div>
          ) : error ? (
            <div className="lab-results-error">
              <ClinicalExecutorFeedback
                loading={false}
                unsupported={unsupported}
                unsupportedDetail={null}
                error={!unsupported ? error : null}
              />
              {unsupported ? (
                <p>{error}</p>
              ) : (
                <p>
                  <strong>Error:</strong> {error}
                </p>
              )}
            </div>
          ) : results ? (
            <LabResults results={results} />
          ) : (
            <div className="lab-results-empty">
              <div className="lab-results-empty-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.microscope} size={56} />
              </div>
              <p>No results yet</p>
              <p className="lab-results-empty-hint">
                Add lab values and click "Interpret Lab Values" to see results
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
};

/**
 * Lab Results Display Component
 */
const LabResults = ({ results }) => {
  const {
    summary,
    criticalValues,
    interpretation,
    groupedByCategory,
    interpretations,
    disclaimer,
    warnings,
  } = results;

  return (
    <>
      {/* Summary Stats */}
      {summary && (
        <div className="lab-summary-stats">
          <div className="lab-stat-card">
            <div className="lab-stat-value">{summary.total}</div>
            <div className="lab-stat-label">Total Values</div>
          </div>
          <div className="lab-stat-card">
            <div className="lab-stat-value lab-stat-value--normal">
              {summary.normal}
            </div>
            <div className="lab-stat-label">Normal</div>
          </div>
          <div className="lab-stat-card">
            <div className="lab-stat-value lab-stat-value--abnormal">
              {summary.abnormal}
            </div>
            <div className="lab-stat-label">Abnormal</div>
          </div>
          <div className="lab-stat-card critical">
            <div className="lab-stat-value">{summary.critical}</div>
            <div className="lab-stat-label">Critical</div>
          </div>
        </div>
      )}

      {/* Critical Values Alert */}
      {criticalValues && criticalValues.length > 0 && (
        <div className="lab-critical-alert">
          <div className="lab-critical-alert-header">
            <span className="lab-critical-alert-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.siren} size={24} />
            </span>
            CRITICAL VALUES DETECTED
          </div>
          <ul className="lab-critical-values-list">
            {criticalValues.map((lab, index) => (
              <li key={index}>
                <strong>{lab.name}</strong>: {lab.value} {lab.unit} (Status:{' '}
                {lab.status.replace('-', ' ')})
              </li>
            ))}
          </ul>
          <p className="lab-critical-alert-note">
            Immediate clinical review and intervention required.
          </p>
        </div>
      )}

      {/* Overall Interpretation */}
      {interpretation && (
        <div
          className={`lab-overall-interpretation ${criticalValues?.length > 0 ? 'critical' : ''}`}
        >
          {interpretation}
        </div>
      )}

      {warnings?.length > 0 && (
        <div className="lab-critical-alert">
          <div className="lab-critical-alert-header">Clinical Warnings</div>
          <ul className="lab-critical-values-list">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Category-wise Results */}
      {groupedByCategory &&
        Object.entries(groupedByCategory).map(([category, labs]: [string, any]) => {
          const categoryInterpretation = interpretations?.find((i) => i.category === category);

          return (
            <div key={category} className="lab-category-section">
              <div className="lab-category-header">
                <span className="lab-category-header-icon" aria-hidden>
                  <NavIcon icon={getLabCategoryIcon(category)} size={18} />
                </span>
                <span>{category}</span>
              </div>

              {/* Lab Values Table */}
              <table className="lab-values-table">
                <thead>
                  <tr>
                    <th>Lab</th>
                    <th>Value</th>
                    <th>Reference Range</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {labs.map((lab, index) => (
                    <tr key={index}>
                      <td className="lab-values-table__name">{lab.name}</td>
                      <td className="lab-values-table__value">
                        {lab.value} {lab.unit}
                      </td>
                      <td className="lab-values-table__range">
                        {lab.referenceRange}
                      </td>
                      <td>
                        <span className={`lab-status-badge ${lab.status}`}>
                          {lab.status.replace('-', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Category Interpretation */}
              {categoryInterpretation && (
                <div className="lab-interpretation-box">
                  {categoryInterpretation.findings &&
                    categoryInterpretation.findings.length > 0 && (
                      <div className="lab-interpretation-section">
                        <div className="lab-interpretation-heading">Key Findings</div>
                        <ul className="lab-interpretation-list">
                          {categoryInterpretation.findings.map((finding, i) => (
                            <li key={i}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {categoryInterpretation.clinicalSignificance && (
                    <div className="lab-interpretation-section">
                      <div className="lab-interpretation-heading">Clinical Significance</div>
                      <div className="lab-interpretation-content">
                        {categoryInterpretation.clinicalSignificance}
                      </div>
                    </div>
                  )}

                  {categoryInterpretation.suggestedActions &&
                    categoryInterpretation.suggestedActions.length > 0 && (
                      <div className="lab-interpretation-section">
                        <div className="lab-interpretation-heading">Suggested Actions</div>
                        <ul className="lab-interpretation-list">
                          {categoryInterpretation.suggestedActions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          );
        })}

      {/* Disclaimer */}
      <div className="lab-disclaimer">
        <strong className="lab-disclaimer-strong">
          <span className="lab-disclaimer-icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.alert} size={16} />
          </span>
          Clinical Disclaimer:
        </strong>{' '}
        Clinical decision support only — does not establish a diagnosis.{' '}
        {disclaimer ||
          'Lab interpretation is context-dependent. Results should be evaluated by qualified healthcare providers in conjunction with clinical presentation and patient history.'}{' '}
        This tool provides educational information only and is not a substitute for professional
        medical judgment.
      </div>
    </>
  );
};

export default LabInterpreter;
