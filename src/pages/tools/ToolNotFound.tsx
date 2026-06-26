import { Link, useLocation } from 'react-router-dom';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { Permission, useUser } from '../../contexts/UserContext';
import { resolveCatalogLaunch, resolveRegistryId } from '../../data/clinicalCatalogWiring';
import { applyRegistryToolLaunch, getRegistryToolNavigation } from '../../navigation/registryToolLaunch';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import './ToolNotFound.css';

/**
 * Friendly missing-tool state for unknown registry ids, calculator slugs, or /tools/* paths.
 */
export default function ToolNotFound({
  toolId = null as any,
  title = 'Tool not found' as any,
  description = null as any,
  showCatalogLink = true,
}) {
  const location = useLocation();
  const { profileNavigate, rawNavigate } = useProfileNavigate();
  const { hasPermission } = useUser();
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
  const canViewDeveloperCatalog = hasPermission(Permission.CONFIGURE_SYSTEM);
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
                navigate: rawNavigate,
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
            onClick={() => profileNavigate(suggestedPath)}
          >
            Open suggested tool
          </button>
        ) : null}
        {showCatalogLink && canViewDeveloperCatalog ? (
          <Link to="/tools/catalog" className="tool-not-found-btn tool-not-found-btn--secondary">
            Open Developer Catalog / Source Audit
          </Link>
        ) : null}
        <Link to="/tools" className="tool-not-found-btn tool-not-found-btn--ghost">
          All Tools
        </Link>
        <Link to="/dashboard" className="tool-not-found-btn tool-not-found-btn--ghost">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
