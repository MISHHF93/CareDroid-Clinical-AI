import { useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import './LabInterpreter.css';
import { executeClinicalTool } from '../../services/clinicalOrchestratorApi';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getLabCategoryIcon, getToolIcon } from '../../navigation/iconRegistry';

const LabInterpreter = ({ embedded = false, onCloseEmbedded } = {}) => {
  const toolConfig = {
    id: 'lab-interp',
    name: 'Lab Interpreter',
    path: '/tools/lab-interpreter',
    color: '#4ECDC4',
    description: 'Interpret lab values and diagnostic tests',
    shortcut: 'Ctrl+2',
    category: 'Diagnostic'
  };

  const [labValues, setLabValues] = useState([]);
  const [patientAge, setPatientAge] = useState('');
  const [patientSex, setPatientSex] = useState('');
  const [clinicalContext, setClinicalContext] = useState('');
  const [currentLab, setCurrentLab] = useState({ name: '', value: '', unit: '' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const commonLabs = [
    { name: 'WBC', unit: 'K/μL' },
    { name: 'Hemoglobin', unit: 'g/dL' },
    { name: 'Platelets', unit: 'K/μL' },
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

  const handleAddLab = () => {
    if (!currentLab.name || !currentLab.value) return;

    const value = parseFloat(currentLab.value);
    if (isNaN(value)) return;

    setLabValues([...labValues, {
      name: currentLab.name,
      value: value,
      unit: currentLab.unit
    }]);

    setCurrentLab({ name: '', value: '', unit: '' });
  };

  const handleRemoveLab = (index) => {
    setLabValues(labValues.filter((_, i) => i !== index));
  };

  const handleInterpret = async () => {
    if (labValues.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const parameters = {
        labValues,
        ...(patientAge && { patientAge: parseInt(patientAge) }),
        ...(patientSex && { patientSex }),
        ...(clinicalContext && { clinicalContext }),
      };

      const execution = await executeClinicalTool('lab-interpreter', parameters);
      if (!execution.ok) {
        throw new Error(execution.message || 'Failed to interpret lab values');
      }
      if (execution.data != null) {
        setResults(execution.data);
      } else {
        throw new Error(execution.errors?.[0] || 'Unknown error occurred');
      }
    } catch (err) {
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
      { name: 'WBC', value: 15.2, unit: 'K/μL' },
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
              <label className="context-label">Age</label>
              <input
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
              <label className="context-label">Sex</label>
              <select
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
              <label className="context-label">Clinical Context</label>
              <textarea
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
              <label className="lab-input-label">Lab Name</label>
              <input
                type="text"
                list="common-labs"
                className="lab-input-field"
                placeholder="e.g., Sodium, WBC"
                value={currentLab.name}
                onChange={(e) => {
                  const selected = commonLabs.find(l => l.name === e.target.value);
                  setCurrentLab({
                    ...currentLab,
                    name: e.target.value,
                    unit: selected ? selected.unit : currentLab.unit
                  });
                }}
              />
              <datalist id="common-labs">
                {commonLabs.map(lab => (
                  <option key={lab.name} value={lab.name} />
                ))}
              </datalist>
            </div>
            <div className="lab-input-group">
              <label className="lab-input-label">Value</label>
              <input
                type="number"
                step="0.1"
                className="lab-input-field"
                placeholder="0.0"
                value={currentLab.value}
                onChange={(e) => setCurrentLab({ ...currentLab, value: e.target.value })}
              />
            </div>
            <div className="lab-input-group">
              <label className="lab-input-label">Unit</label>
              <input
                type="text"
                className="lab-input-field"
                placeholder="mg/dL"
                value={currentLab.unit}
                onChange={(e) => setCurrentLab({ ...currentLab, unit: e.target.value })}
              />
            </div>
            <button
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

          {/* Action Buttons */}
          <div className="lab-action-buttons">
            <button
              type="button"
              className="lab-interpret-button"
              onClick={handleInterpret}
              disabled={labValues.length === 0 || loading}
            >
              {loading ? (
                <>
                  <div className="lab-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
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
              <div className="lab-spinner"></div>
              <p>Analyzing lab values...</p>
            </div>
          ) : error ? (
            <div className="lab-results-error">
              <strong>Error:</strong> {error}
            </div>
          ) : results ? (
            <LabResults results={results} />
          ) : (
            <div className="lab-results-empty">
              <div className="lab-results-empty-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.microscope} size={56} />
              </div>
              <p>No results yet</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
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
  const { summary, criticalValues, interpretation, labValues, groupedByCategory, interpretations } = results;

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
            <div className="lab-stat-value" style={{ color: 'var(--accent-1)' }}>{summary.normal}</div>
            <div className="lab-stat-label">Normal</div>
          </div>
          <div className="lab-stat-card">
            <div className="lab-stat-value" style={{ color: 'var(--warning)' }}>{summary.abnormal}</div>
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
                <strong>{lab.name}</strong>: {lab.value} {lab.unit} (Status: {lab.status.replace('-', ' ')})
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '12px', fontSize: '14px' }}>
            Immediate clinical review and intervention required.
          </p>
        </div>
      )}

      {/* Overall Interpretation */}
      {interpretation && (
        <div className={`lab-overall-interpretation ${criticalValues?.length > 0 ? 'critical' : ''}`}>
          {interpretation}
        </div>
      )}

      {/* Category-wise Results */}
      {groupedByCategory && Object.entries(groupedByCategory).map(([category, labs]) => {
        const categoryInterpretation = interpretations?.find(i => i.category === category);

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
                    <td style={{ fontWeight: 500 }}>{lab.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-2)' }}>
                      {lab.value} {lab.unit}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
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
                {categoryInterpretation.findings && categoryInterpretation.findings.length > 0 && (
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

                {categoryInterpretation.suggestedActions && categoryInterpretation.suggestedActions.length > 0 && (
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
        Clinical decision support only — does not establish a diagnosis. Lab interpretation is context-dependent. Results should be evaluated by qualified healthcare providers in conjunction with clinical presentation and patient history. This tool provides educational information only and is not a substitute for professional medical judgment.
      </div>
    </>
  );
};

export default LabInterpreter;
