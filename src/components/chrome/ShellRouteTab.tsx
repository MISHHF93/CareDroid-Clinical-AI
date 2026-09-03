import { useLocation } from 'react-router-dom';
import { useRouteChrome } from '../../contexts/RouteChromeContext';
import { getBreadcrumbsForRoute } from '../../config/routes.config';
import './ShellRouteTab.css';

type ShellRouteTabProps = {
  title: string;
  subtitle?: string;
};

/**
 * Flat context bar under the top header.
 * Breadcrumb trail (when the route has real data) + title + optional subtitle + <=3 status
 * chips. No graphic-icon-badge nesting (shell-declutter pass, commit eed08173 -- that
 * component is still real and exported elsewhere, just intentionally not rendered here).
 * HEAL-187: breadcrumbs were also excluded under that same original "stay flat" call, made when
 * this bar was built for a much smaller route set. With 118+ routes today, user-directed
 * decision to add them back -- but only where getBreadcrumbsForRoute() has real per-route data
 * (currently 46 routes); every other route falls back to a lone ['CareDroid'] entry, which is
 * not a breadcrumb trail, so it's suppressed rather than shown as clutter.
 */
export default function ShellRouteTab({ title, subtitle }: ShellRouteTabProps) {
  const { chrome: routeChrome } = useRouteChrome();
  const location = useLocation();

  const resolvedTitle = routeChrome.title ?? title;
  const resolvedSubtitle = routeChrome.subtitle ?? subtitle;
  const pageActions = routeChrome.actions ?? null;
  const breadcrumbs = getBreadcrumbsForRoute(location.pathname);
  const showBreadcrumbs = Array.isArray(breadcrumbs) && breadcrumbs.length > 1;

  return (
    <div className="app-chrome-context" role="region" aria-label="Current workspace">
      <div className="app-chrome-context__title">
        {showBreadcrumbs ? (
          <nav className="app-chrome-context__breadcrumbs" aria-label="Breadcrumb">
            <ol>
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb}-${index}`}>
                  {crumb}
                  {index < breadcrumbs.length - 1 ? <span aria-hidden="true"> › </span> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="app-chrome-context__h1">{resolvedTitle}</h1>
        {resolvedSubtitle ? <p className="app-chrome-context__sub">{resolvedSubtitle}</p> : null}
      </div>

      <div className="app-chrome-context__aside">{pageActions}</div>
    </div>
  );
}
