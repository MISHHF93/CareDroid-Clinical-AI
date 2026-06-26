import { useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import ToolApiErrorBanner from '../../components/ToolApiErrorBanner';
import { sendClinicalChatMessage } from '../../services/clinicalChatService';

const ProcedureGuide = ({ embedded = false, onCloseEmbedded }: any = {}) => {
  const toolConfig = {
    id: 'procedures',
    name: 'Procedure Guide',
    path: '/tools/procedures',
    color: '#6BCB77',
    description: 'Procedural guidance and step-by-step instructions',
    shortcut: 'Ctrl+6',
    category: 'Reference',
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const commonProcedures = [
    'Central Line Placement',
    'Lumbar Puncture',
    'Intubation',
    'Chest Tube Insertion',
    'Arterial Line',
    'Paracentesis',
    'Thoracentesis',
    'Nasogastric Tube',
    'Foley Catheter',
    'Wound Closure',
  ];

  const handleSearch = async (procedureName = query) => {
    if (!procedureName.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const { ok, data } = await sendClinicalChatMessage({
        message: `Provide a step-by-step guide for the following procedure: ${procedureName}`,
        tool: 'procedures',
      } as any);

      if (!ok) {
        throw new Error(data?.message || 'Unable to load procedure guide.');
      }
      setResults(data.response || data.message || 'No procedure content returned.');
    } catch (err: any) {
      setError(err.message || 'Unable to load procedure guide. Check your connection or try chat from the dashboard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageLayout tool={toolConfig} embedded={embedded} onCloseEmbedded={onCloseEmbedded} results={results}>
      <div className="simple-tool-page-inner">
        <div className="tool-search-block">
          <input
            type="text"
            className="simple-tool-search-input"
            placeholder="Search for a procedure (e.g., Central line, Intubation)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="tool-chip-grid">
          {commonProcedures.map((procedure) => (
            <button
              key={procedure}
              type="button"
              className="simple-tool-chip-btn"
              onClick={() => {
                setQuery(procedure);
                handleSearch(procedure);
              }}
            >
              {procedure}
            </button>
          ))}
        </div>

        {error ? <ToolApiErrorBanner message={error} onRetry={() => handleSearch()} /> : null}

        {loading ? (
          <div className="tool-loading-state tool-loading-state--tall" aria-busy="true">
            <div className="simple-tool-spinner" />
            <p className="tool-loading-state__message">Loading procedure guide...</p>
          </div>
        ) : results ? (
          <div className="simple-tool-result-panel">{results}</div>
        ) : (
          <div className="tool-empty-state">
            <div className="tool-empty-state__icon" aria-hidden>
              ⚕️
            </div>
            <p>Search for a procedure or click a common procedure above</p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ProcedureGuide;