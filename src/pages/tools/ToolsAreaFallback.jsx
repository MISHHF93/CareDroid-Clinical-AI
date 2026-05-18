import { useLocation } from 'react-router-dom';
import { isKnownToolAreaPath, isFleetAreaPath, isToolsAreaPath } from '../../routes/clinicalToolRoutes';
import ToolNotFound from './ToolNotFound';

/**
 * Catch-all for /tools/* and /fleet/* when no more specific route matched.
 */
export default function ToolsAreaFallback() {
  const { pathname } = useLocation();

  if (isKnownToolAreaPath(pathname)) {
    return (
      <ToolNotFound
        title="Tool route mismatch"
        description="This tool path is registered but did not match a page route. Try the clinical catalog or tools overview."
      />
    );
  }

  const areaLabel = isFleetAreaPath(pathname) ? 'Fleet' : isToolsAreaPath(pathname) ? 'Clinical tools' : 'Tools';

  return (
    <ToolNotFound
      title={`${areaLabel} page not found`}
      description="This link does not match a tool in CareDroid. Check the URL or open the catalog to find an available tool."
    />
  );
}
