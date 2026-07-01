import { useState } from 'react';
import ApiStateBanner from '../../components/ApiStateBanner';
import { fetchClinicalAuditExecutionLogs } from '../../services/clinicalIntelligenceApi';
import ToolPageLayout from './ToolPageLayout';

const TOOL_CONFIG = {
  id: 'clinical-audit',
  name: 'Clinical Audit',
  path: '/tools/clinical-audit',
  color: '#B45309',
  description: 'Display clinical AI tool chains, execution logs, and audit integrity metadata',
  shortcut: 'Ctrl+Shift+H',
  category: 'Reference',
};

const INITIAL_FORM = {
  action: 'ai_query',
  limit: '50',
};

export default function ClinicalAudit({ embedded = false, onCloseEmbedded }: any = {}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await fetchClinicalAuditExecutionLogs({
      action: form.action.trim() || undefined,
      limit: form.limit.trim() || undefined,
    });

    if (response.ok) {
      setResult(response.data);
    } else {
      setError(response.message || 'Unable to load clinical audit logs.');
    }
    setLoading(false);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner">
        <section className="simple-tool-result-panel" role="note">
          <h2>Audit Scope</h2>
          <p>
            Clinical Audit shows sanitized execution logs, PHI access flags, tool chains, hash previews,
            and integrity status. Formal exports remain role-gated in the audit module.
          </p>
        </section>

        <div className="diagnosis-tool-grid">
          <section className="diagnosis-panel" aria-labelledby="clinical-audit-inputs">
            <h2 id="clinical-audit-inputs">Audit Filters</h2>

            <label className="simple-tool-label" htmlFor="clinical-audit-action">
              Action
            </label>
            <input
              id="clinical-audit-action"
              className="diagnosis-field"
              value={form.action}
              onChange={(event) => updateField('action', event.target.value)}
              placeholder="ai_query or phi_access"
            />

            <label className="simple-tool-label" htmlFor="clinical-audit-limit">
              Log limit
            </label>
            <input
              id="clinical-audit-limit"
              className="diagnosis-field"
              value={form.limit}
              onChange={(event) => updateField('limit', event.target.value)}
              placeholder="50"
            />

            <div className="tool-form-actions">
              <button
                type="button"
                className="diagnosis-primary-btn"
                onClick={loadLogs}
                disabled={loading}
              >
                {loading ? 'Loading audit logs...' : 'Load execution logs'}
              </button>
            </div>
          </section>

          <section className="diagnosis-panel diagnosis-panel--scroll" aria-labelledby="clinical-audit-output">
            <h2 id="clinical-audit-output">Execution Logs</h2>
            <ApiStateBanner error={error} onRetry={loadLogs} />

            {loading ? (
              <div className="tool-loading-state" aria-busy="true">
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p className="tool-loading-state__message">Loading clinical audit execution logs...</p>
              </div>
            ) : result ? (
              <div className="diagnosis-results-body">
                <section className="simple-tool-result-panel">
                  <h3>Summary</h3>
                  <p>
                    <strong>Status:</strong> {result.status}
                  </p>
                  <p>
                    <strong>Logs:</strong> {result.summary?.logCount || 0} | <strong>PHI access:</strong>{' '}
                    {result.summary?.phiAccessCount || 0} | <strong>Integrity verified:</strong>{' '}
                    {result.summary?.integrityVerifiedCount || 0}
                  </p>
                  <p>
                    <strong>Capabilities:</strong> {(result.summary?.uniqueCapabilities || []).join(', ')}
                  </p>
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Tool Chain</h3>
                  <ul>
                    {(result.toolChain || []).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Execution Logs</h3>
                  {result.executionLogs?.length ? (
                    <ul>
                      {result.executionLogs.map((log) => (
                        <li key={`${log.id}-${log.timestamp}`}>
                          <strong>{log.capabilityId}</strong>: {log.action} on {log.resource}; status {log.status};
                          PHI {log.phiAccessed ? 'yes' : 'no'}; integrity{' '}
                          {log.integrityVerified ? 'verified' : 'unverified'}; hash {log.hashPreview}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No execution logs returned.</p>
                  )}
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Safety</h3>
                  <ul>
                    {(result.safety?.warnings || []).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <div className="tool-empty-state">
                Load audit logs to review execution traces and integrity metadata.
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
