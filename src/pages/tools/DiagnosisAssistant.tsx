import { useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import { sendClinicalChatMessage } from '../../services/clinicalChatService';

const DiagnosisAssistant = ({ embedded = false, onCloseEmbedded }: any = {}) => {
  const toolConfig = {
    id: 'diagnosis',
    name: 'Diagnosis Assistant',
    path: '/tools/diagnosis',
    color: '#FFD93D',
    description: 'Differential diagnosis and diagnostic support',
    shortcut: 'Ctrl+5',
    category: 'Diagnostic',
  };

  const [symptoms, setSymptoms] = useState('');
  const [patientInfo, setPatientInfo] = useState({ age: '', sex: '', history: '' });
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const handleGenerate = async () => {
    if (!symptoms.trim()) {
      setError('Please enter presenting symptoms before generating a differential.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const message = `Generate a differential diagnosis for: ${symptoms}${
        patientInfo.age ? `\nPatient age: ${patientInfo.age}` : ''
      }${patientInfo.sex ? `\nSex: ${patientInfo.sex}` : ''}${
        patientInfo.history ? `\nRelevant history: ${patientInfo.history}` : ''
      }`;

      const { ok, data } = await sendClinicalChatMessage({
        message,
        tool: 'diagnosis',
      } as any);

      if (!ok) throw new Error(data?.message || 'Failed to generate differential diagnosis');

      setResults(data.response || data.message || 'No differential diagnosis content returned.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageLayout tool={toolConfig} embedded={embedded} onCloseEmbedded={onCloseEmbedded} results={results}>
      <div className="diagnosis-tool-grid">
        <div className="diagnosis-panel">
          <h2 className="tool-panel-title">Patient Presentation</h2>

          <div className="tool-form-stack">
            <label className="tool-form-label" htmlFor="diagnosis-symptoms">
              Presenting Symptoms / Chief Complaint
            </label>
            <textarea
              id="diagnosis-symptoms"
              className="diagnosis-field diagnosis-field--tall"
              placeholder="e.g., Chest pain with diaphoresis and nausea, onset 2 hours ago, radiating to left arm..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
          </div>

          <div className="tool-form-row-2">
            <div>
              <label className="tool-form-label--muted" htmlFor="diagnosis-age">
                Age (optional)
              </label>
              <input
                id="diagnosis-age"
                type="number"
                className="diagnosis-field"
                placeholder="Years"
                value={patientInfo.age}
                onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
              />
            </div>
            <div>
              <label className="tool-form-label--muted" htmlFor="diagnosis-sex">
                Sex (optional)
              </label>
              <select
                id="diagnosis-sex"
                className="diagnosis-field"
                value={patientInfo.sex}
                onChange={(e) => setPatientInfo({ ...patientInfo, sex: e.target.value })}
              >
                <option value="">--</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="tool-form-stack--loose">
            <label className="tool-form-label--muted" htmlFor="diagnosis-history">
              Relevant Medical History (optional)
            </label>
            <textarea
              id="diagnosis-history"
              className="diagnosis-field diagnosis-field--medium"
              placeholder="e.g., HTN, DM, prior MI..."
              value={patientInfo.history}
              onChange={(e) => setPatientInfo({ ...patientInfo, history: e.target.value })}
            />
          </div>

          <div className="tool-form-actions tool-form-actions--flush">
            <button
              type="button"
              className="diagnosis-primary-btn"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate DDx'}
            </button>
            <button
              type="button"
              className="btn-diagnosis-secondary"
              onClick={() => {
                setSymptoms('');
                setPatientInfo({ age: '', sex: '', history: '' });
                setResults(null);
                setError(null);
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="diagnosis-panel diagnosis-panel--scroll">
          <h2 className="tool-panel-title">Differential Diagnosis</h2>

          {loading ? (
            <div className="tool-loading-state" aria-busy="true">
              <div className="simple-tool-spinner diagnosis-spinner" />
              <p className="tool-loading-state__message">
                Analyzing symptoms and generating differential diagnosis...
              </p>
            </div>
          ) : error ? (
            <div className="diagnosis-error-box">
              <strong>Error:</strong> {error}
            </div>
          ) : results ? (
            <div className="diagnosis-results-body">{results}</div>
          ) : (
            <div className="tool-empty-state">
              <div className="tool-empty-state__icon" aria-hidden>
                ??
              </div>
              <p>Enter patient symptoms and click &quot;Generate DDx&quot; to begin</p>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default DiagnosisAssistant;