import { useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import { apiFetch } from '../../services/apiClient';

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

      const data = await response.json();
      setResults(data.response);
    } catch (err) {
      setResults('Error loading procedure guide. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageLayout tool={toolConfig} embedded={embedded} onCloseEmbedded={onCloseEmbedded} results={results}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '16px',
            }}
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
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => { setQuery(procedure); handleSearch(procedure); }}
            >
              {procedure}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '16px' }}>Loading procedure guide...</p>
          </div>
        ) : results ? (
          <div style={{ background: 'var(--panel-bg)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {results}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>⚕️</div>
            <p>Search for a procedure or click a common procedure above</p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default ProcedureGuide;
