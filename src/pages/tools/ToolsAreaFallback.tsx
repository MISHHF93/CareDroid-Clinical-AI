import { Navigate, useLocation } from 'react-router-dom';
import {
  isKnownToolAreaPath,
  isFleetAreaPath,
  isToolsAreaPath,
  parseCalculatorSubpath,
  resolveToolsAreaRedirect,
} from '../../routes/clinicalToolRoutes';
import ToolNotFound from './ToolNotFound';

/**
 * Catch-all for /tools/* and /fleet/* when no more specific route matched.
 */
export default function ToolsAreaFallback() {
  const location = useLocation();
  const { pathname } = location;

  const redirect = resolveToolsAreaRedirect(pathname);
  if (redirect) {
    return (
      <Navigate
        to={{ pathname: redirect.pathname, search: redirect.search ?? '' }}
        replace
        state={{ from: pathname }}
      />
    );
  }

  const mistypedSlug = parseCalculatorSubpath(pathname);
  if (mistypedSlug) {
    return (
      <ToolNotFound
        toolId={mistypedSlug}
        title="Calculator not found"
        description={`“${mistypedSlug}” is not a built-in calculator at this URL. Pick a calculator from the hub, browse All Tools, or use a supported deep link.`}
      />
    );
  }

  if (isKnownToolAreaPath(pathname)) {
    return (
      <ToolNotFound
        title="Tool route mismatch"
        description="This tool path is registered but did not match a page route. Try All Tools or, if you have access, the Developer Catalog / Source Audit."
      />
    );
  }

  const areaLabel = isFleetAreaPath(pathname)
    ? 'Fleet'
    : isToolsAreaPath(pathname)
      ? 'Clinical tools'
      : 'Tools';

  return (
    <ToolNotFound
      title={`${areaLabel} page not found`}
      description="This link does not match a tool in CareDroid. Check the URL or open All Tools to find an available tool."
    />
  );
}
