import { useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import { sendClinicalChatMessage } from '../../services/clinicalChatService';

const DiagnosisAssistant = ({ embedded = false, onCloseEmbedded } = {}) => {
  const toolConfig = {
    id: 'diagnosis',
    name: 'Diagnosis Assistant',
    path: '/tools/diagnosis',
    color: '#FFD93D',
    description: 'Differential diagnosis and diagnostic support',
    shortcut: 'Ctrl+5',
    category: 'Diagnostic'
  };

  const [symptoms, setSymptoms] = useState('');
  const [patientInfo, setPatientInfo] = useState({ age: '', sex: '', history: '' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        patientInfo.history ?`\nRelevant history: ${patientInfo.history}` : ''
      }`;

      const { ok, data } = await sendClinicalChatMessage({
        message,
        tool: 'diagnosis',
      });

      if (!ok) throw new Error(data?.message || 'Failed to generate differential diagnosis');

      setResults(data.response || data.message || 'No differential diagnosis content returned.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageLayout tool={toolConfig} embedded={embedded} onCloseEmbedded={onCloseEmbedded} results={results}>
      <div className="diagnosis-tool-grid">
        <div className="diagnosis-panel">
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--app-fg)', marginBottom: '20px' }}>
            📋 Patient Presentation
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--app-fg)', marginBottom: '8px' }}>
              Presenting Symptoms / Chief Complaint
            </label>
            <textarea
              className="diagnosis-field diagnosis-field--tall"
              placeholder="e.g., Chest pain with diaphoresis and nausea, onset 2 hours ago, radiating to left arm..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--app-fg-muted)', marginBottom: '6px' }}>
                Age (optional)
              </label>
              <input
                type="number"
                className="diagnosis-field"
                placeholder="Years"
                value={patientInfo.age}
                onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--app-fg-muted)', marginBottom: '6px' }}>
                Sex (optional)
              </label>
              <select
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

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--app-fg-muted)', marginBottom: '6px' }}>
              Relevant Medical History (optional)
            </label>
            <textarea
              className="diagnosis-field"
              style={{ minHeight: '80px', resize: 'vertical' }}
              placeholder="e.g., HTN, DM, prior MI..."
              value={patientInfo.history}
              onChange={(e) => setPatientInfo({ ...patientInfo, history: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="diagnosis-primary-btn"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? 'Generating...' : '🔍 Generate DDx'}
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
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--app-fg)', marginBottom: '20px' }}>
            🎯 Differential Diagnosis
          </h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '16px' }}>
              <div className="simple-tool-spinner diagnosis-spinner" />
              <p style={{ color: 'var(--app-fg-muted)' }}>Analyzing symptoms and generating differential diagnosis...</p>
            </div>
          ) : error ? (
            <div className="diagnosis-error-box">
              <strong>Error:</strong> {error}
            </div>
          ) : results ? (
            <div className="diagnosis-results-body">
              {results}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', color: 'var(--app-fg-muted)' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>🔍</div>
              <p>Enter patient symptoms and click &quot;Generate DDx&quot; to begin</p>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default DiagnosisAssistant;
