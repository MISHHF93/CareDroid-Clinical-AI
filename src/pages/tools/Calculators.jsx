import { useEffect, useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import './Calculators.css';
import { apiFetch } from '../../services/apiClient';
import { parseToolExecutionResponse } from '../../utils/toolExecutionResponse';
import { NavIcon } from '../../navigation/NavIcon';
import { getCalculatorSubIcon, CHROME_ICONS } from '../../navigation/iconRegistry';

const CALCULATORS = [
  {
    id: 'sofa',
    name: 'SOFA Score',
    description: 'Sequential Organ Failure Assessment for ICU patients',
    category: 'ICU/Critical Care',
  },
  {
    id: 'gfr',
    name: 'eGFR Calculator',
    description: 'Estimated Glomerular Filtration Rate (CKD-EPI)',
    category: 'Renal',
  },
  {
    id: 'bmi',
    name: 'BMI Calculator',
    description: 'Body Mass Index and weight classification',
    category: 'General',
  },
  {
    id: 'chads2vasc',
    name: 'CHA2DS2-VASc',
    description: 'Stroke risk in atrial fibrillation',
    category: 'Cardiology',
  },
];

function CalcPanelTitle({ icon, children }) {
  return (
    <div className="calculator-panel-title">
      <NavIcon icon={icon} size={22} />
      {children}
    </div>
  );
}

function ResultsPanelTitle() {
  return (
    <div className="calculator-panel-title">
      <NavIcon icon={CHROME_ICONS.barChart} size={22} />
      Results
    </div>
  );
}

function CalcResultsEmptyIcon({ icon, size = 56 }) {
  return (
    <div className="calc-results-empty-icon" aria-hidden>
      <NavIcon icon={icon} size={size} />
    </div>
  );
}

const Calculators = ({ embedded = false, onCloseEmbedded, initialCalculatorId = null } = {}) => {
  const toolConfig = {
    id: 'calculators',
    name: 'Medical Calculators',
    path: '/tools/calculators',
    color: '#95E1D3',
    description: 'Medical calculators (GFR, BMI, scores, etc.)',
    shortcut: 'Ctrl+7',
    category: 'Calculator'
  };

  const [selectedCalculator, setSelectedCalculator] = useState(null);
  const [sharedResult, setSharedResult] = useState(null);

  useEffect(() => {
    if (!initialCalculatorId) return;
    const match = CALCULATORS.find((c) => c.id === initialCalculatorId);
    if (match) {
      setSelectedCalculator(match);
      setSharedResult(null);
    }
  }, [initialCalculatorId]);

  return (
    <ToolPageLayout
      tool={toolConfig}
      embedded={embedded}
      onCloseEmbedded={onCloseEmbedded}
      results={selectedCalculator && sharedResult ? { calculator: selectedCalculator.id, ...sharedResult } : null}
    >
      <div className="calculators-content">
        {/* Calculator Selection */}
        <div className="calculator-selection">
          {CALCULATORS.map(calc => (
            <div
              key={calc.id}
              className={`calculator-card ${selectedCalculator?.id === calc.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedCalculator(calc);
                setSharedResult(null);
              }}
            >
              <div className="calculator-card-header">
                <span className="calculator-icon" aria-hidden>
                  <NavIcon icon={getCalculatorSubIcon(calc.id)} size={22} />
                </span>
                <span className="calculator-name">{calc.name}</span>
              </div>
              <div className="calculator-description">{calc.description}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                {calc.category}
              </div>
            </div>
          ))}
        </div>

        {/* Calculator Interface */}
        {selectedCalculator ? (
          <CalculatorInterface calculator={selectedCalculator} onResultChange={setSharedResult} />
        ) : (
          <div className="calculators-select-placeholder">
            <div className="calculators-select-placeholder-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.barChart} size={56} />
            </div>
            <p>Select a calculator above to begin</p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

/**
 * Calculator Interface Component
 */
const CalculatorInterface = ({ calculator, onResultChange }) => {
  switch (calculator.id) {
    case 'sofa':
      return <SOFACalculator onResultChange={onResultChange} />;
    case 'gfr':
      return <GFRCalculator onResultChange={onResultChange} />;
    case 'bmi':
      return <BMICalculator onResultChange={onResultChange} />;
    case 'chads2vasc':
      return <CHA2DS2VAScCalculator onResultChange={onResultChange} />;
    default:
      return <div>Calculator not implemented</div>;
  }
};

/**
 * SOFA Score Calculator
 */
const SOFACalculator = ({ onResultChange }) => {
  const [inputs, setInputs] = useState({
    pao2: '',
    fio2: '',
    mechanicalVentilation: false,
    platelets: '',
    bilirubin: '',
    map: '',
    dopamine: '',
    norepinephrine: '',
    epinephrine: '',
    gcs: '',
    creatinine: '',
    urineOutput: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result ? { ...result, severity: result.severity || getSeverityLevel(result.totalScore || result.score || 0) } : null);
    }
  }, [onResultChange, result]);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    try {
      const parameters = Object.entries(inputs).reduce((acc, [key, value]) => {
        if (value !== '' && value !== false) {
          acc[key] = typeof value === 'string' ? parseFloat(value) || value : value;
        }
        return acc;
      }, {});

      const response = await apiFetch(`/api/tools/sofa-calculator/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('caredroid_access_token')}`,
        },
        body: JSON.stringify({ parameters }),
      });

      if (!response.ok) throw new Error('Failed to calculate SOFA score');

      const data = await response.json();
      const parsed = parseToolExecutionResponse(data);
      if (parsed.ok && parsed.data != null) {
        setResult(parsed.data);
      } else {
        throw new Error(parsed.errors?.[0] || 'Calculation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs({
      pao2: '',
      fio2: '',
      mechanicalVentilation: false,
      platelets: '',
      bilirubin: '',
      map: '',
      dopamine: '',
      norepinephrine: '',
      epinephrine: '',
      gcs: '',
      creatinine: '',
      urineOutput: '',
    });
    setResult(null);
    setError(null);
  };

  const getSeverityLevel = (score) => {
    if (score === 0) return 'normal';
    if (score <= 6) return 'normal';
    if (score <= 12) return 'warning';
    return 'critical';
  };

  return (
    <div className="calculator-interface">
      {/* Inputs */}
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.stethoscope}>Patient Parameters</CalcPanelTitle>

        {/* Respiration */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            PaO2 (mmHg)
            <span className="calc-input-help">Arterial oxygen pressure</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="80-100"
            value={inputs.pao2}
            onChange={(e) => setInputs({ ...inputs, pao2: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            FiO2 (0.21-1.0)
            <span className="calc-input-help">Fraction of inspired oxygen</span>
          </label>
          <input
            type="number"
            step="0.01"
            className="calc-input-field"
            placeholder="0.21"
            value={inputs.fio2}
            onChange={(e) => setInputs({ ...inputs, fio2: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="mechvent"
              className="calc-checkbox"
              checked={inputs.mechanicalVentilation}
              onChange={(e) => setInputs({ ...inputs, mechanicalVentilation: e.target.checked })}
            />
            <label htmlFor="mechvent" className="calc-checkbox-label">
              Mechanical Ventilation
            </label>
          </div>
        </div>

        {/* Coagulation */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            Platelets (×10³/μL)
            <span className="calc-input-help">Normal: 150-400</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="150"
            value={inputs.platelets}
            onChange={(e) => setInputs({ ...inputs, platelets: e.target.value })}
          />
        </div>

        {/* Liver */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            Bilirubin (mg/dL)
            <span className="calc-input-help">Normal: 0.1-1.2</span>
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            placeholder="1.0"
            value={inputs.bilirubin}
            onChange={(e) => setInputs({ ...inputs, bilirubin: e.target.value })}
          />
        </div>

        {/* Cardiovascular */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            MAP (mmHg)
            <span className="calc-input-help">Mean arterial pressure</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="70"
            value={inputs.map}
            onChange={(e) => setInputs({ ...inputs, map: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Vasopressor Doses (μg/kg/min)
            <span className="calc-input-help">If applicable</span>
          </label>
          <input
            type="number"
            step="0.01"
            className="calc-input-field"
            placeholder="Dopamine"
            value={inputs.dopamine}
            onChange={(e) => setInputs({ ...inputs, dopamine: e.target.value })}
            style={{ marginBottom: '8px' }}
          />
          <input
            type="number"
            step="0.01"
            className="calc-input-field"
            placeholder="Norepinephrine"
            value={inputs.norepinephrine}
            onChange={(e) => setInputs({ ...inputs, norepinephrine: e.target.value })}
            style={{ marginBottom: '8px' }}
          />
          <input
            type="number"
            step="0.01"
            className="calc-input-field"
            placeholder="Epinephrine"
            value={inputs.epinephrine}
            onChange={(e) => setInputs({ ...inputs, epinephrine: e.target.value })}
          />
        </div>

        {/* CNS */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            Glasgow Coma Scale (3-15)
            <span className="calc-input-help">Consciousness level</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="15"
            min="3"
            max="15"
            value={inputs.gcs}
            onChange={(e) => setInputs({ ...inputs, gcs: e.target.value })}
          />
        </div>

        {/* Renal */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            Creatinine (mg/dL)
            <span className="calc-input-help">Normal: 0.6-1.3</span>
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            placeholder="1.0"
            value={inputs.creatinine}
            onChange={(e) => setInputs({ ...inputs, creatinine: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Urine Output (mL/day)
            <span className="calc-input-help">24-hour total</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="1500"
            value={inputs.urineOutput}
            onChange={(e) => setInputs({ ...inputs, urineOutput: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button
            className="calc-calculate-btn"
            onClick={handleCalculate}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="calc-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                Calculating...
              </>
            ) : (
              <>
                <NavIcon icon={CHROME_ICONS.calculator} size={20} />
                Calculate SOFA Score
              </>
            )}
          </button>
          <button className="calc-reset-btn" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="calculator-results">
        <ResultsPanelTitle />

        {loading ? (
          <div className="calc-loading">
            <div className="calc-spinner"></div>
            <p>Calculating...</p>
          </div>
        ) : error ? (
          <div className="calc-error">
            <strong>Error:</strong> {error}
          </div>
        ) : result ? (
          <>
            {/* Score Display */}
            <div className={`calc-score-display ${getSeverityLevel(result.totalScore)}`}>
              <div className="calc-score-label">SOFA Score</div>
              <div className="calc-score-value">{result.totalScore}</div>
              <div className="calc-score-interpretation">
                {result.interpretation || 'Assessment complete'}
              </div>
            </div>

            {/* Score Breakdown */}
            {result.breakdown && (
              <div className="calc-breakdown">
                <div className="calc-breakdown-title">Score Breakdown by System</div>
                {Object.entries(result.breakdown).map(([system, score]) => (
                  <div key={system} className="calc-breakdown-item">
                    <span className="calc-breakdown-label">
                      {system.charAt(0).toUpperCase() + system.slice(1)}
                    </span>
                    <span className="calc-breakdown-score">{score}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Clinical Interpretation */}
            {result.interpretation && (
              <div className={`calc-interpretation-box ${getSeverityLevel(result.totalScore)}`}>
                <div className="calc-interpretation-title">Clinical Interpretation</div>
                <div className="calc-interpretation-text">{result.interpretation}</div>
              </div>
            )}

            {/* References */}
            <div className="calc-references">
              <div className="calc-references-title">References</div>
              <ul className="calc-references-list">
                <li>Vincent JL, et al. The SOFA score to describe organ dysfunction/failure. Intensive Care Med. 1996;22(7):707-10.</li>
                <li>Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801-810.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.hospital} />
            <p>Enter patient parameters and calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * GFR Calculator (simplified version - can be expanded)
 */
const GFRCalculator = ({ onResultChange }) => {
  const [inputs, setInputs] = useState({
    age: '',
    sex: '',
    creatinine: '',
    race: '',
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result);
    }
  }, [onResultChange, result]);

  const calculateGFR = () => {
    const { age, sex, creatinine, race } = inputs;
    
    if (!age || !sex || !creatinine) {
      alert('Please fill in all required fields');
      return;
    }

    // CKD-EPI formula (simplified)
    const kappa = sex === 'female' ? 0.7 : 0.9;
    const alpha = sex === 'female' ? -0.329 : -0.411;
    const minCrKappa = Math.min(parseFloat(creatinine) / kappa, 1);
    const maxCrKappa = Math.max(parseFloat(creatinine) / kappa, 1);
    
    let gfr = 141 * Math.pow(minCrKappa, alpha) * Math.pow(maxCrKappa, -1.209) * Math.pow(0.993, parseFloat(age));
    
    if (sex === 'female') gfr *= 1.018;
    if (race === 'black') gfr *= 1.159;

    gfr = Math.round(gfr);

    let stage = '';
    let interpretation = '';
    let severity = 'normal';

    if (gfr >= 90) {
      stage = 'G1';
      interpretation = 'Normal or high kidney function';
      severity = 'normal';
    } else if (gfr >= 60) {
      stage = 'G2';
      interpretation = 'Mildly decreased kidney function';
      severity = 'normal';
    } else if (gfr >= 45) {
      stage = 'G3a';
      interpretation = 'Mild to moderate decrease in kidney function';
      severity = 'warning';
    } else if (gfr >= 30) {
      stage = 'G3b';
      interpretation = 'Moderate to severe decrease in kidney function';
      severity = 'warning';
    } else if (gfr >= 15) {
      stage = 'G4';
      interpretation = 'Severe decrease in kidney function';
      severity = 'critical';
    } else {
      stage = 'G5';
      interpretation = 'Kidney failure - dialysis or transplant may be needed';
      severity = 'critical';
    }

    setResult({ gfr, stage, interpretation, severity });
  };

  return (
    <div className="calculator-interface">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.activity}>Patient Information</CalcPanelTitle>

        <div className="calc-input-group">
          <label className="calc-input-label">Age (years)</label>
          <input
            type="number"
            className="calc-input-field"
            value={inputs.age}
            onChange={(e) => setInputs({ ...inputs, age: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">Sex</label>
          <select
            className="calc-select-field"
            value={inputs.sex}
            onChange={(e) => setInputs({ ...inputs, sex: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Serum Creatinine (mg/dL)
            <span className="calc-input-help">Normal: 0.6-1.3</span>
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            value={inputs.creatinine}
            onChange={(e) => setInputs({ ...inputs, creatinine: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">Race (optional)</label>
          <select
            className="calc-select-field"
            value={inputs.race}
            onChange={(e) => setInputs({ ...inputs, race: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="black">Black/African American</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="calc-actions">
          <button
            type="button"
            className="calc-calculate-btn"
            onClick={calculateGFR}
          >
            <NavIcon icon={CHROME_ICONS.calculator} size={20} />
            Calculate eGFR
          </button>
          <button
            className="calc-reset-btn"
            onClick={() => { setInputs({ age: '', sex: '', creatinine: '', race: '' }); setResult(null); }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="calculator-results">
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">eGFR (CKD-EPI)</div>
              <div className="calc-score-value">
                {result.gfr}
                <span style={{ fontSize: '24px', marginLeft: '8px' }}>mL/min/1.73m²</span>
              </div>
              <div className="calc-score-interpretation">
                CKD Stage {result.stage}
              </div>
            </div>

            <div className={`calc-interpretation-box ${result.severity}`}>
              <div className="calc-interpretation-title">Interpretation</div>
              <div className="calc-interpretation-text">{result.interpretation}</div>
            </div>

            <div className="calc-references">
              <div className="calc-references-title">Reference</div>
              <ul className="calc-references-list">
                <li>Levey AS, et al. A new equation to estimate glomerular filtration rate. Ann Intern Med. 2009;150(9):604-612.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.activity} />
            <p>Enter patient information and calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * BMI Calculator (simplified)
 */
const BMICalculator = ({ onResultChange }) => {
  const [inputs, setInputs] = useState({
    weight: '',
    height: '',
    unit: 'metric',
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result);
    }
  }, [onResultChange, result]);

  const calculateBMI = () => {
    let { weight, height, unit } = inputs;
    
    if (!weight || !height) {
      alert('Please enter weight and height');
      return;
    }

    weight = parseFloat(weight);
    height = parseFloat(height);

    let bmi;
    if (unit === 'metric') {
      bmi = weight / Math.pow(height / 100, 2);
    } else {
      bmi = (weight / Math.pow(height, 2)) * 703;
    }

    bmi = Math.round(bmi * 10) / 10;

    let category = '';
    let severity = 'normal';
    let interpretation = '';

    if (bmi < 18.5) {
      category = 'Underweight';
      severity = 'warning';
      interpretation = 'Below healthy weight range';
    } else if (bmi < 25) {
      category = 'Normal weight';
      severity = 'normal';
      interpretation = 'Healthy weight range';
    } else if (bmi < 30) {
      category = 'Overweight';
      severity = 'warning';
      interpretation = 'Above healthy weight range';
    } else if (bmi < 35) {
      category = 'Obese Class I';
      severity = 'warning';
      interpretation = 'Obesity - increased health risks';
    } else if (bmi < 40) {
      category = 'Obese Class II';
      severity = 'critical';
      interpretation = 'Severe obesity - high health risks';
    } else {
      category = 'Obese Class III';
      severity = 'critical';
      interpretation = 'Morbid obesity - very high health risks';
    }

    setResult({ bmi, category, severity, interpretation });
  };

  return (
    <div className="calculator-interface">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.scale}>Body Measurements</CalcPanelTitle>

        <div className="calc-input-group">
          <label className="calc-input-label">Unit System</label>
          <select
            className="calc-select-field"
            value={inputs.unit}
            onChange={(e) => setInputs({ ...inputs, unit: e.target.value })}
          >
            <option value="metric">Metric (kg, cm)</option>
            <option value="imperial">Imperial (lb, in)</option>
          </select>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Weight {inputs.unit === 'metric' ? '(kg)' : '(lb)'}
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            value={inputs.weight}
            onChange={(e) => setInputs({ ...inputs, weight: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Height {inputs.unit === 'metric' ? '(cm)' : '(inches)'}
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            value={inputs.height}
            onChange={(e) => setInputs({ ...inputs, height: e.target.value })}
          />
        </div>

        <div className="calc-actions">
          <button type="button" className="calc-calculate-btn" onClick={calculateBMI}>
            <NavIcon icon={CHROME_ICONS.calculator} size={20} />
            Calculate BMI
          </button>
          <button
            className="calc-reset-btn"
            onClick={() => { setInputs({ ...inputs, weight: '', height: '' }); setResult(null); }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="calculator-results">
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">Body Mass Index</div>
              <div className="calc-score-value">
                {result.bmi}
                <span style={{ fontSize: '24px', marginLeft: '8px' }}>kg/m²</span>
              </div>
              <div className="calc-score-interpretation">{result.category}</div>
            </div>

            <div className={`calc-interpretation-box ${result.severity}`}>
              <div className="calc-interpretation-title">Interpretation</div>
              <div className="calc-interpretation-text">{result.interpretation}</div>
            </div>

            <div className="calc-references">
              <div className="calc-references-title">BMI Categories</div>
              <ul className="calc-references-list">
                <li>Underweight: BMI &lt; 18.5</li>
                <li>Normal weight: BMI 18.5-24.9</li>
                <li>Overweight: BMI 25.0-29.9</li>
                <li>Obese: BMI ≥ 30.0</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.scale} />
            <p>Enter measurements and calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * CHA2DS2-VASc Calculator (simplified)
 */
const CHA2DS2VAScCalculator = ({ onResultChange }) => {
  const [inputs, setInputs] = useState({
    chf: false,
    hypertension: false,
    age: '',
    diabetes: false,
    stroke: false,
    vascular: false,
    sex: '',
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result);
    }
  }, [onResultChange, result]);

  const calculateScore = () => {
    let score = 0;
    
    if (inputs.chf) score += 1;
    if (inputs.hypertension) score += 1;
    
    const age = parseInt(inputs.age);
    if (age >= 75) score += 2;
    else if (age >= 65) score += 1;
    
    if (inputs.diabetes) score += 1;
    if (inputs.stroke) score += 2;
    if (inputs.vascular) score += 1;
    if (inputs.sex === 'female') score += 1;

    let interpretation = '';
    let severity = 'normal';
    let recommendation = '';

    if (score === 0) {
      interpretation = 'Very low stroke risk';
      severity = 'normal';
      recommendation = 'No anticoagulation recommended';
    } else if (score === 1) {
      interpretation = 'Low stroke risk';
      severity = 'normal';
      recommendation = 'Consider anticoagulation';
    } else if (score === 2) {
      interpretation = 'Moderate stroke risk';
      severity = 'warning';
      recommendation = 'Anticoagulation recommended';
    } else {
      interpretation = 'High stroke risk';
      severity = 'critical';
      recommendation = 'Anticoagulation strongly recommended';
    }

    setResult({ score, interpretation, severity, recommendation });
  };

  return (
    <div className="calculator-interface">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.heartPulse}>Risk Factors</CalcPanelTitle>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="chf"
              className="calc-checkbox"
              checked={inputs.chf}
              onChange={(e) => setInputs({ ...inputs, chf: e.target.checked })}
            />
            <label htmlFor="chf" className="calc-checkbox-label">
              CHF/LV dysfunction (1 point)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="htn"
              className="calc-checkbox"
              checked={inputs.hypertension}
              onChange={(e) => setInputs({ ...inputs, hypertension: e.target.checked })}
            />
            <label htmlFor="htn" className="calc-checkbox-label">
              Hypertension (1 point)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">Age (years)</label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="65+ = 1 pt, 75+ = 2 pts"
            value={inputs.age}
            onChange={(e) => setInputs({ ...inputs, age: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="dm"
              className="calc-checkbox"
              checked={inputs.diabetes}
              onChange={(e) => setInputs({ ...inputs, diabetes: e.target.checked })}
            />
            <label htmlFor="dm" className="calc-checkbox-label">
              Diabetes mellitus (1 point)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="stroke"
              className="calc-checkbox"
              checked={inputs.stroke}
              onChange={(e) => setInputs({ ...inputs, stroke: e.target.checked })}
            />
            <label htmlFor="stroke" className="calc-checkbox-label">
              Prior stroke/TIA/embolism (2 points)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="vasc"
              className="calc-checkbox"
              checked={inputs.vascular}
              onChange={(e) => setInputs({ ...inputs, vascular: e.target.checked })}
            />
            <label htmlFor="vasc" className="calc-checkbox-label">
              Vascular disease (1 point)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">Sex</label>
          <select
            className="calc-select-field"
            value={inputs.sex}
            onChange={(e) => setInputs({ ...inputs, sex: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female (1 point)</option>
          </select>
        </div>

        <div className="calc-actions">
          <button type="button" className="calc-calculate-btn" onClick={calculateScore}>
            <NavIcon icon={CHROME_ICONS.calculator} size={20} />
            Calculate Score
          </button>
          <button
            className="calc-reset-btn"
            onClick={() => {
              setInputs({
                chf: false,
                hypertension: false,
                age: '',
                diabetes: false,
                stroke: false,
                vascular: false,
                sex: '',
              });
              setResult(null);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="calculator-results">
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">CHA2DS2-VASc Score</div>
              <div className="calc-score-value">{result.score}</div>
              <div className="calc-score-interpretation">{result.interpretation}</div>
            </div>

            <div className={`calc-interpretation-box ${result.severity}`}>
              <div className="calc-interpretation-title">Clinical Recommendation</div>
              <div className="calc-interpretation-text">{result.recommendation}</div>
            </div>

            <div className="calc-references">
              <div className="calc-references-title">Reference</div>
              <ul className="calc-references-list">
                <li>Lip GY, et al. Refining clinical risk stratification for predicting stroke and thromboembolism in atrial fibrillation. Chest. 2010;138(2):263-272.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.heartPulse} />
            <p>Select risk factors and calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculators;