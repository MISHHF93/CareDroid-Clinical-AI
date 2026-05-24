import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { resolveCatalogLaunch, resolveRegistryId } from '../../data/clinicalCatalogWiring';
import { applyRegistryToolLaunch, getRegistryToolNavigation } from '../../navigation/registryToolLaunch';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import './ToolNotFound.css';

/**
 * Friendly missing-tool state for unknown registry ids, calculator slugs, or /tools/* paths.
 */
export default function ToolNotFound({
  toolId = null,
  title = 'Tool not found',
  description = null,
  showCatalogLink = true,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const resolvedId = toolId || location.state?.toolId || null;
  const registryId = resolvedId ? resolveRegistryId(resolvedId) : null;
  const launch = registryId ? resolveCatalogLaunch(registryId) : resolveCatalogLaunch(resolvedId || '');
  const navPlan = resolvedId ? getRegistryToolNavigation(resolvedId) : null;

  const suggestedPath =
    navPlan?.mode === 'calculator-route' || navPlan?.mode === 'tool-page'
      ? navPlan.pathname
      : launch?.path;

  const canStartGuidedChat = navPlan?.mode === 'chat-assisted' && Boolean(launch?.chatSeed);
  const message =
    description ||
    (resolvedId
      ? `We could not open “${resolvedId}”. It may be unavailable, renamed, or not yet available in this build.`
      : 'This clinical tool link is not recognized. Check the URL or choose a tool from All Tools.');

  return (
    <div className="tool-not-found" role="alert">
      <div className="tool-not-found-icon" aria-hidden>
        <NavIcon icon={CHROME_ICONS.alert} size={48} />
      </div>
      <h1 className="tool-not-found-title">{title}</h1>
      <p className="tool-not-found-message">{message}</p>
      {location.pathname ? (
        <p className="tool-not-found-path">
          <span className="tool-not-found-path-label">Requested path:</span>{' '}
          <code>{location.pathname}</code>
        </p>
      ) : null}
      <div className="tool-not-found-actions">
        {canStartGuidedChat && resolvedId ? (
          <button
            type="button"
            className="tool-not-found-btn tool-not-found-btn--primary"
            onClick={() =>
              applyRegistryToolLaunch(resolvedId, {
                navigate,
                addMessage,
                selectTool,
                setActiveTool,
                recordToolAccess,
              })
            }
          >
            Start guided chat
          </button>
        ) : null}
        {suggestedPath && suggestedPath !== location.pathname && !canStartGuidedChat ? (
          <button
            type="button"
            className="tool-not-found-btn tool-not-found-btn--primary"
            onClick={() => navigate(suggestedPath)}
          >
            Open suggested tool
          </button>
        ) : null}
        {showCatalogLink ? (
          <Link to="/tools/catalog" className="tool-not-found-btn tool-not-found-btn--secondary">
            Open Developer Catalog / Source Audit
          </Link>
        ) : null}
        <Link to="/tools" className="tool-not-found-btn tool-not-found-btn--ghost">
          All Tools
        </Link>
        <Link to="/home" className="tool-not-found-btn tool-not-found-btn--ghost">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
