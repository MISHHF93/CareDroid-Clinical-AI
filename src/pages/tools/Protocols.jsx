import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CrossModuleLinkPanel from '../../components/CrossModuleLinkPanel';
import ToolPageLayout from './ToolPageLayout';
import ApiStateBanner from '../../components/ApiStateBanner';
import { sendClinicalChatMessage } from '../../services/clinicalChatService';
import { fetchProtocols } from '../../services/clinicalContentApi';
import {
  buildProtocolAiPrompt,
  PROTOCOL_CATEGORIES,
  PROTOCOL_PATHWAYS,
  searchProtocolPathways,
} from '../../data/protocolPathwayLibrary';
import './Protocols.css';

const Protocols = ({ embedded = false, onCloseEmbedded } = {}) => {
  const toolConfig = {
    id: 'protocols',
    name: 'Protocol and Clinical Pathway Library',
    path: '/protocols',
    color: '#A8E6CF',
    description: 'Evidence-based protocol viewer with calculators, simulations, version history, and AI explanation',
    shortcut: 'Ctrl+4',
    category: 'Reference',
  };

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProtocolId, setSelectedProtocolId] = useState(PROTOCOL_PATHWAYS[0].id);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [serverProtocols, setServerProtocols] = useState([]);

  const commonProtocols = [
    'Sepsis Management',
    'ACS Chest Pain Pathway',
    'Stroke Alert Pathway',
    'Trauma Primary Survey Pathway',
    'DKA Management',
    'Respiratory Failure Pathway',
    'Pediatric Fever Pathway',
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
  const filteredProtocols = useMemo(() => {
    const matches = searchProtocolPathways(query);
    if (selectedCategory === 'all') return matches;
    return matches.filter((protocol) => protocol.category.toLowerCase() === selectedCategory.toLowerCase());
  }, [query, selectedCategory]);
  const selectedProtocol =
    PROTOCOL_PATHWAYS.find((protocol) => protocol.id === selectedProtocolId) || PROTOCOL_PATHWAYS[0];

  const selectProtocol = (protocol) => {
    setSelectedProtocolId(protocol.id);
    setSelectedCategory(protocol.category);
    setQuery(protocol.title);
    setAiExplanation('');
    setError(null);
  };

  const handleQuickLaunch = (protocolName = query) => {
    const match = searchProtocolPathways(protocolName)[0];
    if (match) {
      selectProtocol(match);
      return;
    }
    setQuery(protocolName);
    handleAiExplanation(selectedProtocol, protocolName);
  };

  const handleAiExplanation = async (protocol = selectedProtocol, label = protocol.title) => {
    if (!protocol && !String(label || '').trim()) return;

    setLoading(true);
    setError(null);
    setAiExplanation('');
    try {
      const { ok, data } = await sendClinicalChatMessage({
        message: protocol ? buildProtocolAiPrompt(protocol) : `Explain this clinical protocol: ${label}`,
        tool: 'protocols',
      });

      if (!ok) {
        throw new Error(data?.message || 'Unable to explain protocol.');
      }
      setAiExplanation(data.response || data.message || 'No protocol explanation returned.');
    } catch (err) {
      setError(
        err.message || 'Unable to explain protocol. Check your connection or try chat from the dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageLayout tool={toolConfig} embedded={embedded} onCloseEmbedded={onCloseEmbedded} results={aiExplanation}>
      <div className="simple-tool-page-inner protocol-library">
        <section className="protocol-library__hero" aria-labelledby="protocol-library-title">
          <div>
            <p className="protocol-library__eyebrow">Clinical decision support only - verify local policy</p>
            <h2 id="protocol-library-title">Protocol and Clinical Pathway Library</h2>
            <p>
              Browse sepsis, ACS, stroke, trauma, DKA, respiratory failure, and pediatric fever
              pathways with linked calculators, linked simulations, version history, and AI explanation.
            </p>
          </div>
          <div className="protocol-library__hero-actions">
            <Link to="/clinical-decision-support">Open CDS</Link>
            <Link to="/simulation">Linked simulations</Link>
          </div>
        </section>

        <CrossModuleLinkPanel
          moduleId="protocols"
          title="Protocols connect calculators and AI agents"
          description="Guideline steps stay linked to risk calculators and AI explanation so pathway context follows the user."
        />

        <div className="protocol-library__search">
          <p className="protocol-library__search-helper">Search for a protocol or use quick launch below.</p>
          <input
            type="text"
            className="simple-tool-search-input"
            placeholder="Search for a protocol (e.g., Sepsis, ACS, Stroke, DKA)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickLaunch()}
          />
          <button type="button" className="protocol-library__ai-button" onClick={() => handleAiExplanation()}>
            Explain with AI
          </button>
        </div>

        <ApiStateBanner
          loading={catalogLoading}
          loadingMessage="Loading protocol catalog from server…"
          error={catalogError}
          onRetry={loadCatalog}
        />

        <div className="protocol-library__categories" aria-label="Protocol categories">
          <button
            type="button"
            className={selectedCategory === 'all' ? 'is-active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            All
          </button>
          {PROTOCOL_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={selectedCategory === category ? 'is-active' : ''}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="protocol-library__quick-launch" aria-label="Quick launch protocols">
          {protocolChips.map((protocol) => (
            <button
              key={protocol}
              type="button"
              className="simple-tool-chip-btn"
              onClick={() => {
                setQuery(protocol);
                handleQuickLaunch(protocol);
              }}
            >
              {protocol}
            </button>
          ))}
        </div>

        <ApiStateBanner error={error} onRetry={() => handleAiExplanation()} />

        <section className="protocol-library__layout">
          <div className="protocol-library__cards" aria-label="Protocol pathway results">
            {filteredProtocols.map((protocol) => (
              <button
                key={protocol.id}
                type="button"
                aria-label={`Open ${protocol.category} pathway details`}
                className={`protocol-library__card ${protocol.id === selectedProtocol.id ? 'is-selected' : ''}`}
                onClick={() => selectProtocol(protocol)}
              >
                <span>{protocol.category}</span>
                <strong>{protocol.title}</strong>
                <small>{protocol.subtitle}</small>
              </button>
            ))}
          </div>

          <article className="protocol-library__viewer" aria-label="Protocol viewer">
            <div className="protocol-library__viewer-header">
              <div>
                <p className="protocol-library__eyebrow">{selectedProtocol.category}</p>
                <h3>{selectedProtocol.title}</h3>
                <p>{selectedProtocol.summary}</p>
              </div>
              <span>{selectedProtocol.currentVersion}</span>
            </div>

            <div className="protocol-library__section">
              <h4>Protocol steps</h4>
              <ol>
                {selectedProtocol.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>

            <div className="protocol-library__split">
              <div className="protocol-library__section">
                <h4>Indications</h4>
                <ul>
                  {selectedProtocol.indications.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="protocol-library__section">
                <h4>Escalation red flags</h4>
                <ul>
                  {selectedProtocol.redFlags.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

            <div className="protocol-library__split">
              <div className="protocol-library__section">
                <h4>Linked calculators</h4>
                <div className="protocol-library__links">
                  {selectedProtocol.linkedCalculators.map((calculator) => (
                    <Link key={calculator.id} to={calculator.path}>{calculator.label}</Link>
                  ))}
                </div>
              </div>
              <div className="protocol-library__section">
                <h4>Linked simulations</h4>
                <div className="protocol-library__links">
                  {selectedProtocol.linkedSimulations.map((simulation) => (
                    <Link key={simulation.id} to={simulation.path}>{simulation.label}</Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="protocol-library__section">
              <h4>AI explanation</h4>
              <p>{selectedProtocol.aiExplanation}</p>
              {loading ? (
                <ApiStateBanner loading loadingMessage="Loading protocol explanation..." />
              ) : aiExplanation ? (
                <div className="simple-tool-result-panel">{aiExplanation}</div>
              ) : (
                <button type="button" className="protocol-library__ai-button" onClick={() => handleAiExplanation()}>
                  Generate AI explanation
                </button>
              )}
            </div>

            <div className="protocol-library__section">
              <h4>Version history</h4>
              <div className="protocol-library__versions">
                {selectedProtocol.versionHistory.map((entry) => (
                  <div key={entry.version}>
                    <strong>{entry.version}</strong>
                    <span>{entry.date}</span>
                    <p>{entry.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      </div>
    </ToolPageLayout>
  );
};

export default Protocols;
