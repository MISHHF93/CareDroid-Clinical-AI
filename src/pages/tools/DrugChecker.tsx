import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import { useMemo, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import analyticsService from '../../services/analyticsService';
import offlineService from '../../services/offlineService';
import { executeClinicalTool } from '../../services/clinicalOrchestratorApi';
import { ClinicalExecutorFeedback } from '../../components/clinical/ClinicalExecutorFeedback';
import ToolPreflightStatus from '../../components/clinical/ToolPreflightStatus';
import ToolPageLayout from './ToolPageLayout';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import './DrugChecker.css';

function normalizeDrugCheckResults(apiData) {
  if (!apiData || typeof apiData !== 'object') {
    return { interactions: [], contraindications: [], warnings: [] };
  }

  const rawInteractions = apiData.interactions || [];
  const interactions = rawInteractions.map((item) => ({
    severity: item.severity || 'moderate',
    drugs: [item.drug1, item.drug2].filter(Boolean),
    description: item.clinicalSignificance || item.mechanism || '',
    evidence: item.mechanism || 'Clinical pharmacology reference',
    management: item.management || '',
  }));

  const contraindicated = apiData.groupedBySeverity?.contraindicated || [];
  const contraindications = contraindicated.map((item) => ({
    severity: 'contraindicated',
    drugs: [item.drug1, item.drug2].filter(Boolean),
    description: item.clinicalSignificance || item.mechanism || '',
    evidence: item.mechanism || 'Contraindicated combination',
    management: item.management || '',
  }));

  return {
    interactions: [...contraindications, ...interactions],
    contraindications,
    warnings: [],
    interpretation: apiData.interpretation,
    disclaimer: apiData.disclaimer,
  };
}

const DrugChecker = ({ embedded = false, onCloseEmbedded }: any = {}) => {
  const { user } = useUser();
  const { warning } = useNotificationActions();
  const [medications, setMedications] = useState(['']);
  const [results, setResults] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<any>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [preflightReady, setPreflightReady] = useState(false);

  const toolConfig = {
    id: 'drug-check',
    name: 'Drug Checker',
    path: '/tools/drug-checker',
    color: '#0ea5e9',
    description: 'Check drug interactions, contraindications, and dosing',
    shortcut: 'Ctrl+1',
    category: 'Diagnostic'
  };

  const activeMeds = useMemo(() => medications.map((m) => m.trim()).filter(Boolean), [medications]);
  const preflightParameters = useMemo(
    () => ({
      medications: activeMeds,
      severityFilter: 'all',
    }),
    [activeMeds]
  );

  const handleAddMedication = () => {
    setMedications([...medications, '']);
  };

  const handleRemoveMedication = (index) => {
    const updated = medications.filter((_, i) => i !== index);
    setMedications(updated.length > 0 ? updated : ['']);
  };

  const handleMedicationChange = (index, value) => {
    const updated = [...medications];
    updated[index] = value;
    setMedications(updated);
  };

  const handleCheck = async () => {
    if (!preflightReady || activeMeds.length < 2) {
      warning('Add more medications', 'Enter at least 2 medications to check for interactions.');
      return;
    }

    setIsChecking(true);
    setError(null);
    setUnsupported(false);
    setResults(null);

    try {
      const execution = await executeClinicalTool('drug-interactions', {
        medications: activeMeds,
        severityFilter: 'all',
      });

      if (execution.unsupported) {
        setUnsupported(true);
        setError(execution.message);
        return;
      }

      if (!execution.ok) {
        throw new Error(execution.message || 'Failed to check drug interactions');
      }

      const parsed = { ok: true, data: execution.data, errors: execution.errors || [] };
      if (!parsed.data) {
        throw new Error(parsed.errors?.[0] || 'Drug interaction check failed');
      }

      const normalized: any = normalizeDrugCheckResults(parsed.data);
      const interpretation = execution.interpretation;
      if (interpretation) {
        normalized.summary = interpretation;
      }
      normalized.warnings = execution.warnings || normalized.warnings || [];
      normalized.disclaimer = execution.disclaimer || normalized.disclaimer;
      setResults(normalized);

      offlineService.saveToolResult({
        userId: user?.id,
        toolType: toolConfig.id,
        input: { medications: activeMeds },
        output: normalized,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      analyticsService.trackEvent({
        eventName: 'tool_result_saved',
        parameters: {
          toolId: toolConfig.id,
          medicationCount: activeMeds.length,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Unable to check interactions. Try again or use chat.');
    } finally {
      setIsChecking(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'contraindicated': return '#7F1D1D';
      case 'major': return '#EF4444';
      case 'moderate': return '#F59E0B';
      case 'minor': return '#10B981';
      default: return MEDICAL_THEME.inkMuted;
    }
  };

  return (
    <ToolPageLayout tool={toolConfig} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="drug-checker">
        <div className="drug-input-section">
          <h2>Enter Medications</h2>
          <p className="section-subtitle">
            Add medications to check for interactions, contraindications, and dosing guidelines
          </p>

          <div className="medications-list">
            {medications.map((med, index) => (
              <div key={index} className="medication-input-row">
                <span className="medication-number">{index + 1}</span>
                <input
                  type="text"
                  className="medication-input"
                  placeholder="Enter medication name (e.g., Warfarin)"
                  value={med}
                  onChange={(e) => handleMedicationChange(index, e.target.value)}
                />
                {medications.length > 1 && (
                  <button
                    className="btn-remove-med"
                    onClick={() => handleRemoveMedication(index)}
                    title="Remove medication"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <ToolPreflightStatus
            toolId="drug-interactions"
            parameters={preflightParameters}
            requiredInputs={[
              {
                label: 'At least 2 medication names',
                present: activeMeds.length >= 2,
              },
            ]}
            onReadyChange={setPreflightReady}
          />

          <div className="input-actions">
            <button className="btn-add-med" onClick={handleAddMedication}>
              + Add Another Medication
            </button>
            <button 
              className="btn-check-interactions" 
              onClick={handleCheck}
              disabled={isChecking || !preflightReady}
            >
              {isChecking ? '🔄 Checking...' : '🔍 Check Interactions'}
            </button>
          </div>
        </div>

        <ClinicalExecutorFeedback
          loading={isChecking}
          unsupported={unsupported}
          unsupportedDetail={null}
          error={!unsupported && error && !isChecking ? error : null}
        />

        {results && (
          <div className="results-section">
            {results.summary && (
              <div className="result-card">
                <p className="interaction-description">{results.summary}</p>
              </div>
            )}
            {/* Interactions */}
            {results.interactions.length > 0 && (
              <div className="result-card">
                <h3 className="result-title">⚠️ Drug Interactions Found</h3>
                {results.interactions.map((interaction, idx) => (
                  <div
                    key={idx}
                    className="interaction-item"
                    style={{ '--severity-color': getSeverityColor(interaction.severity) } as any}
                  >
                    <div className="interaction-header">
                      <span className="severity-badge">
                        {interaction.severity.toUpperCase()}
                      </span>
                      <span className="interacting-drugs">
                        {interaction.drugs.join(' + ')}
                      </span>
                    </div>
                    <div className="interaction-body">
                      <p className="interaction-description">
                        <strong>Effect:</strong> {interaction.description}
                      </p>
                      <p className="interaction-evidence">
                        <strong>Evidence:</strong> {interaction.evidence}
                      </p>
                      <p className="interaction-management">
                        <strong>Management:</strong> {interaction.management}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {results.warnings.length > 0 && (
              <div className="result-card">
                <h3 className="result-title">⚡ Clinical Warnings</h3>
                {results.warnings.map((warning, idx) => {
                  const warningText = typeof warning === 'string' ? warning : warning.warning;
                  return (
                    <div key={idx} className="warning-item">
                      {warning.drug ? <div className="warning-drug">{warning.drug}</div> : null}
                      <div className="warning-text">{warningText}</div>
                      {warning.recommendation ? (
                        <div className="warning-recommendation">
                          <strong>Recommendation:</strong> {warning.recommendation}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {results.disclaimer && (
              <div className="result-card">
                <p className="disclaimer">{results.disclaimer}</p>
              </div>
            )}

            {/* No Issues */}
            {results.interactions.length === 0 && results.contraindications.length === 0 && (
              <div className="result-card success-card">
                <h3 className="result-title">✅ No Major Interactions Detected</h3>
                <p>The medications checked do not have documented major interactions.</p>
                <p className="disclaimer">
                  Note: Always consult drug references and clinical judgment for comprehensive assessment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Reference */}
        <div className="quick-reference">
          <h3>💡 Quick Reference</h3>
          <div className="reference-grid">
            <div className="reference-item">
              <h4>Severity Levels</h4>
              <ul>
                <li><span className="drug-severity-dot drug-severity-dot--major">●</span> Major: Avoid combination</li>
                <li><span className="drug-severity-dot drug-severity-dot--moderate">●</span> Moderate: Monitor closely</li>
                <li><span className="drug-severity-dot drug-severity-dot--minor">●</span> Minor: Usually safe</li>
              </ul>
            </div>
            <div className="reference-item">
              <h4>Common Checks</h4>
              <ul>
                <li>Drug-drug interactions</li>
                <li>Contraindications</li>
                <li>Dose adjustments (renal/hepatic)</li>
                <li>Adverse effects</li>
              </ul>
            </div>
            <div className="reference-item">
              <h4>Best Practices</h4>
              <ul>
                <li>Include all medications (Rx + OTC)</li>
                <li>Check supplements and herbals</li>
                <li>Consider patient comorbidities</li>
                <li>Review with pharmacist when needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default DrugChecker;
