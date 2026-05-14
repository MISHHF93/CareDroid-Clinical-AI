import { useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import { apiFetch, parseApiResponse } from '../../services/apiClient';

const Protocols = ({ embedded = false, onCloseEmbedded } = {}) => {
  const toolConfig = {
    id: 'protocols',
    name: 'Clinical Protocols',
    path: '/tools/protocols',
    color: '#A8E6CF',
    description: 'Evidence-based clinical protocols and guidelines',
    shortcut: 'Ctrl+4',
    category: 'Reference'
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const commonProtocols = [
    'Sepsis Management',
    'Acute MI/STEMI',
    'Stroke/TIA',
    'Anaphylaxis',
    'DKA Management',
    'COPD Exacerbation',
    'Pneumonia Treatment',
    'CHF Management',
    'VTE Prophylaxis',
    'Post-Op Care',
  ];

  const handleSearch = async (protocolName = query) => {
    if (!protocolName.trim()) return;

    setLoading(true);
    try {
      const response = await apiFetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('caredroid_access_token')}`,
        },
        body: JSON.stringify({
          message: `Provide the clinical protocol for: ${protocolName}`,
          tool: 'protocols'
        }),
      });

      const data = await parseApiResponse(response, { fallback: {} });
      setResults(data.response);
    } catch (err) {
      setResults('Error loading protocol. Please try again.');
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
            placeholder="Search for a protocol (e.g., Sepsis, STEMI, DKA)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '32px' }}>
          {commonProtocols.map(protocol => (
            <button
              key={protocol}
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => { setQuery(protocol); handleSearch(protocol); }}
            >
              {protocol}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid rgba(0,255,136,0.2)', borderTopColor: 'var(--accent-1)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '16px' }}>Loading protocol...</p>
          </div>
        ) : results ? (
          <div style={{ background: 'var(--panel-bg)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {results}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
            <p>Search for a protocol or click a common protocol above</p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default Protocols;
