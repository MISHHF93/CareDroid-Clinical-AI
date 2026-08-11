import { useRouteChrome } from '../../contexts/RouteChromeContext';
import './ShellRouteTab.css';

type ShellRouteTabProps = {
  title: string;
  subtitle?: string;
};

/**
 * Flat context bar under the top header.
 * Title + optional subtitle + ≤3 status chips. No badge/eyebrow/Guide nesting.
 */
export default function ShellRouteTab({ title, subtitle }: ShellRouteTabProps) {
  const { chrome: routeChrome } = useRouteChrome();

  const resolvedTitle = routeChrome.title ?? title;
  const resolvedSubtitle = routeChrome.subtitle ?? subtitle;
  const pageActions = routeChrome.actions ?? null;

  return (
    <div className="app-chrome-context" role="region" aria-label="Current workspace">
      <div className="app-chrome-context__title">
        <h1 className="app-chrome-context__h1">{resolvedTitle}</h1>
        {resolvedSubtitle ? (
          <p className="app-chrome-context__sub">{resolvedSubtitle}</p>
        ) : null}
      </div>

      <div className="app-chrome-context__aside">
        {pageActions}
      </div>
    </div>
  );
}
