import { useEffect, useState } from 'react';
import ToolPageLayout from './ToolPageLayout';
import ApiStateBanner from '../../components/ApiStateBanner';
import { apiFetch, parseApiResponse, getApiErrorMessage } from '../../services/apiClient';
import { fetchProtocols } from '../../services/clinicalContentApi';

const Protocols = ({ embedded = false, onCloseEmbedded } = {}) => {
  const toolConfig = {
    id: 'protocols',
    name: 'Clinical Protocols',
    path: '/tools/protocols',
    color: '#A8E6CF',
    description: 'Evidence-based clinical protocols and guidelines',
    shortcut: 'Ctrl+4',
    category: 'Reference',
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [serverProtocols, setServerProtocols] = useState([]);

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

  const loadCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    const res = await fetchProtocols({ limit: 50 });
    if (res.ok && res.items.length) {
      setServerProtocols(res.items.map((p) => p.name || p.title).filter(Boolean));
    } else if (!res.ok && res.error) {
      setCatalogError(res.error);
    }
    setCatalogLoading(false);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const protocolChips = [...new Set([...serverProtocols, ...commonProtocols])];

  const handleSearch = async (protocolName = query) => {
    if (!protocolName.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await apiFetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('caredroid_access_token')}`,
        },
        body: JSON.stringify({
          message: `Provide the clinical protocol for: ${protocolName}`,
          tool: 'protocols',
        }),
      });

      if (!response.ok) {
        throw new Error(getApiErrorMessage(null, response));
      }
      const data = await parseApiResponse(response, { fallback: {} });
      setResults(data.response || data.message || 'No protocol content returned.');
    } catch (err) {
      setError(
        err.message || 'Unable to load protocol. Check your connection or try chat from the dashboard.'
      );
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
            placeholder="Search for a protocol (e.g., Sepsis, STEMI, DKA)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <ApiStateBanner
          loading={catalogLoading}
          loadingMessage="Loading protocol catalog from server…"
          error={catalogError}
          onRetry={loadCatalog}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          {protocolChips.map((protocol) => (
            <button
              key={protocol}
              type="button"
              className="simple-tool-chip-btn"
              onClick={() => {
                setQuery(protocol);
                handleSearch(protocol);
              }}
            >
              {protocol}
            </button>
          ))}
        </div>

        <ApiStateBanner error={error} onRetry={() => handleSearch()} />

        {loading ? (
          <ApiStateBanner loading loadingMessage="Loading protocol guidance…" />
        ) : results ? (
          <div className="simple-tool-result-panel">{results}</div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--app-fg-muted)' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
            <p>Search for a protocol or click a common protocol above</p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default Protocols;
