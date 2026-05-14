import { useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import { apiFetch, parseApiResponse } from '../../services/apiClient';

const ProcedureGuide = ({ embedded = false, onCloseEmbedded } = {}) => {
  const toolConfig = {
    id: 'procedures',
    name: 'Procedure Guide',
    path: '/tools/procedures',
    color: '#6BCB77',
    description: 'Procedural guidance and step-by-step instructions',
    shortcut: 'Ctrl+6',
    category: 'Reference'
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

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
    try {
      const response = await apiFetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('caredroid_access_token')}`,
        },
        body: JSON.stringify({
          message: `Provide a step-by-step guide for the following procedure: ${procedureName}`,
          tool: 'procedures'
        }),
      });

      const data = await parseApiResponse(response, { fallback: {} });
      setResults(data.response);
    } catch (err) {
      setResults('Error loading procedure guide. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageLayout tool={toolConfig} embedded={embedded} onCloseEmbedded={onCloseEmbedded} results={results}>
      <div className="simple-tool-page-inner">
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            className="simple-tool-search-input"
            placeholder="Search for a procedure (e.g., Central line, Intubation)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '32px' }}>
          {commonProcedures.map(procedure => (
            <button
              key={procedure}
              type="button"
              className="simple-tool-chip-btn"
              onClick={() => { setQuery(procedure); handleSearch(procedure); }}
            >
              {procedure}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="simple-tool-spinner" />
            <p style={{ marginTop: '16px', color: 'var(--app-fg-muted)' }}>Loading procedure guide...</p>
          </div>
        ) : results ? (
          <div className="simple-tool-result-panel">
            {results}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--app-fg-muted)' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>⚕️</div>
            <p>Search for a procedure or click a common procedure above</p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ProcedureGuide;
