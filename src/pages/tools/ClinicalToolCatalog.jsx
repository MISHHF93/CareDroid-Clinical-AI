import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../../contexts/ConversationContext';
import toolRegistry from '../../data/toolRegistry';
import {
  builtinUiCalculators,
  clinicalIntentTools,
  getCatalogSummary,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from '../../data/clinicalIntentToolCatalog';
import { fetchBackendClinicalTools } from '../../services/clinicalToolsApi';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import './ClinicalToolCatalog.css';

const CATEGORY_CLASS = {
  calculator: 'catalog-badge--calculator',
  checker: 'catalog-badge--checker',
  interpreter: 'catalog-badge--interpreter',
  protocol: 'catalog-badge--protocol',
  reference: 'catalog-badge--reference',
};

function CategoryBadge({ category }) {
  return (
    <span className={`catalog-badge ${CATEGORY_CLASS[category] || ''}`}>
      {category}
    </span>
  );
}

const ClinicalToolCatalog = () => {
  const navigate = useNavigate();
  const { setActiveTool, addMessage } = useConversation();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [backendTools, setBackendTools] = useState([]);
  const [backendLoadError, setBackendLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchBackendClinicalTools();
      if (cancelled) return;
      if (result.ok) {
        setBackendTools(result.tools);
        setBackendLoadError(null);
      } else {
        setBackendLoadError(result.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const backendIds = useMemo(
    () => new Set(backendTools.map((t) => t.id || t.toolId).filter(Boolean)),
    [backendTools]
  );

  const summary = getCatalogSummary({
    sidebarCount: toolRegistry.length,
    backendToolCount: backendTools.length || undefined,
  });

  const query = search.trim().toLowerCase();

  const matchesQuery = (text) => !query || String(text || '').toLowerCase().includes(query);

  const filteredSidebar = toolRegistry.filter(
    (t) =>
      matchesQuery(`${t.name} ${t.description} ${t.category} ${t.id}`) &&
      (categoryFilter === 'all' || t.category.toLowerCase() === categoryFilter)
  );

  const filteredCalculators = builtinUiCalculators.filter(
    (c) =>
      matchesQuery(`${c.name} ${c.description} ${c.id}`) &&
      (categoryFilter === 'all' || categoryFilter === 'calculator')
  );

  const filteredIntent = clinicalIntentTools.filter(
    (t) =>
      matchesQuery(`${t.toolName} ${t.description} ${t.category} ${t.toolId}`) &&
      (categoryFilter === 'all' || t.category === categoryFilter)
  );

  const filteredBackend = backendTools.filter((t) =>
    matchesQuery(`${t.name || ''} ${t.description || ''} ${t.id || ''} ${t.category || ''}`)
  );

  const handleOpenPath = (path) => {
    if (path) navigate(path);
  };

  const handleTryInChat = (sidebarToolId, chatSeed) => {
    if (sidebarToolId) {
      setActiveTool(sidebarToolId);
    }
    if (chatSeed) {
      addMessage(chatSeed, 'user');
    }
    navigate('/dashboard');
  };

  const isBackendExecutable = (toolId) =>
    backendIds.has(toolId) || clinicalIntentTools.find((t) => t.toolId === toolId)?.backendExecutable;

  return (
    <div className="clinical-tool-catalog">
      <button type="button" className="catalog-back-link" onClick={() => navigate('/tools')}>
        <NavIcon icon={CHROME_ICONS.arrowLeft} size={16} aria-hidden />
        Back to Clinical Tools Suite
      </button>

      <header className="clinical-tool-catalog-header">
        <h1>
          <NavIcon icon={CHROME_ICONS.tools} size={32} aria-hidden />
          Full Clinical Catalog
        </h1>
        <p className="clinical-tool-catalog-subtitle">
          Every capability wired in CareDroid today: sidebar shortcuts, calculator forms, AI clinical
          tool profiles, and backend executors.
        </p>
        <p className="clinical-tool-catalog-notice">
          This repository ships {summary.aiClinicalProfiles} AI-recognized clinical profiles and{' '}
          {summary.backendExecutors} server-side executors—not 188 separate calculator pages. Tools
          without a dedicated page open in chat with a clinical prompt seed.
        </p>
        <div className="catalog-stats">
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.sidebarShortcuts}</span>
            <span className="catalog-stat-label">Sidebar shortcuts</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.calculatorForms}</span>
            <span className="catalog-stat-label">Calculator UIs</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.aiClinicalProfiles}</span>
            <span className="catalog-stat-label">AI tool profiles</span>
          </div>
          <div className="catalog-stat">
            <span className="catalog-stat-number">{summary.backendExecutors}</span>
            <span className="catalog-stat-label">Backend executors</span>
          </div>
        </div>
      </header>

      <div className="catalog-toolbar">
        <input
          type="search"
          className="catalog-search"
          placeholder="Search tools by name, id, or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clinical catalog"
        />
        <select
          className="catalog-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          <option value="calculator">Calculator</option>
          <option value="checker">Checker</option>
          <option value="interpreter">Interpreter</option>
          <option value="protocol">Protocol</option>
          <option value="reference">Reference</option>
          <option value="diagnostic">Diagnostic (sidebar)</option>
        </select>
      </div>

      <section className="catalog-section">
        <h2>Backend executors (API)</h2>
        <p className="catalog-section-desc">
          Registered in the tool orchestrator and callable via POST /api/tools/:id/execute.
        </p>
        {backendLoadError && (
          <p className="catalog-backend-status catalog-backend-status--error">
            Could not load live registry: {backendLoadError}. Showing static catalog entries marked as
            executable.
          </p>
        )}
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>UI page</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(filteredBackend.length > 0
                ? filteredBackend
                : clinicalIntentTools.filter((t) => t.backendExecutable)
              ).map((tool) => {
                const id = tool.id || tool.toolId;
                const intentRow = clinicalIntentTools.find((t) => t.toolId === id);
                const registryId = ORCHESTRATOR_TO_REGISTRY_ID[id];
                return (
                  <tr key={id}>
                    <td>
                      <code>{id}</code>
                    </td>
                    <td>{tool.name || intentRow?.toolName}</td>
                    <td>
                      <CategoryBadge category={tool.category || intentRow?.category} />
                    </td>
                    <td>{intentRow?.path || '—'}</td>
                    <td>
                      <div className="catalog-actions">
                        {intentRow?.path && (
                          <button
                            type="button"
                            className="catalog-btn catalog-btn--primary"
                            onClick={() => handleOpenPath(intentRow.path)}
                          >
                            Open
                          </button>
                        )}
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--secondary"
                          onClick={() =>
                            handleTryInChat(registryId, intentRow?.chatSeed)
                          }
                        >
                          Try in chat
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>AI clinical tool profiles (NLU)</h2>
        <p className="catalog-section-desc">
          Recognized by the intent classifier when users ask in natural language.
        </p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Tool ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Page</th>
                <th>Backend</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIntent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="catalog-empty">
                    No tools match your search.
                  </td>
                </tr>
              ) : (
                filteredIntent.map((tool) => (
                  <tr key={tool.toolId}>
                    <td>
                      <code>{tool.toolId}</code>
                    </td>
                    <td>{tool.toolName}</td>
                    <td>
                      <CategoryBadge category={tool.category} />
                    </td>
                    <td>{tool.path ? 'Yes' : 'Chat only'}</td>
                    <td>
                      {isBackendExecutable(tool.toolId) ? (
                        <span className="catalog-badge catalog-badge--backend">API</span>
                      ) : (
                        <span className="catalog-badge catalog-badge--client">Chat / UI</span>
                      )}
                    </td>
                    <td>
                      <div className="catalog-actions">
                        {tool.path ? (
                          <button
                            type="button"
                            className="catalog-btn catalog-btn--primary"
                            onClick={() => handleOpenPath(tool.path)}
                          >
                            Open
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--secondary"
                          onClick={() =>
                            handleTryInChat(
                              tool.sidebarToolId || ORCHESTRATOR_TO_REGISTRY_ID[tool.toolId],
                              tool.chatSeed ||
                                `Help me use the ${tool.toolName}. ${tool.description}`
                            )
                          }
                        >
                          Try in chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>Calculator forms (built-in UI)</h2>
        <p className="catalog-section-desc">Interactive forms in the Calculators module.</p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Name</th>
                <th>Implementation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalculators.length === 0 ? (
                <tr>
                  <td colSpan={4} className="catalog-empty">
                    No calculators match your search.
                  </td>
                </tr>
              ) : (
                filteredCalculators.map((calc) => (
                  <tr key={calc.id}>
                    <td>
                      <code>{calc.id}</code>
                    </td>
                    <td>{calc.name}</td>
                    <td>{calc.implementation}</td>
                    <td>
                      <div className="catalog-actions">
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--primary"
                          onClick={() => handleOpenPath(calc.path)}
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="catalog-section">
        <h2>Sidebar shortcuts</h2>
        <p className="catalog-section-desc">Entries from toolRegistry.js shown in navigation.</p>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Registry ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Path</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSidebar.length === 0 ? (
                <tr>
                  <td colSpan={5} className="catalog-empty">
                    No shortcuts match your search.
                  </td>
                </tr>
              ) : (
                filteredSidebar.map((tool) => (
                  <tr key={tool.id}>
                    <td>
                      <code>{tool.id}</code>
                    </td>
                    <td>{tool.name}</td>
                    <td>{tool.category}</td>
                    <td>{tool.path}</td>
                    <td>
                      <div className="catalog-actions">
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--primary"
                          onClick={() => handleOpenPath(tool.path)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="catalog-btn catalog-btn--secondary"
                          onClick={() => handleTryInChat(tool.id)}
                        >
                          Try in chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ClinicalToolCatalog;
