import HelpTrigger from '../help/HelpTrigger';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { useRouteChrome } from '../../contexts/RouteChromeContext';
import useEdOperatingSurface from '../../hooks/useEdOperatingSurface';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import './ShellRouteTab.css';

type ShellRouteTabProps = {
  title: string;
  subtitle?: string;
};

export default function ShellRouteTab({ title, subtitle }: ShellRouteTabProps) {
  const surfaces = usePractitionerSurfaceVisibility();
  const { chrome: routeChrome } = useRouteChrome();
  const operatingSurface = useEdOperatingSurface();

  const showEyebrow = surfaces.chrome.showPageEyebrow;
  const showSubtitle = surfaces.chrome.showHeaderSubtitle;

  const resolvedTitle = routeChrome.title ?? title;
  const resolvedSubtitle = showSubtitle ? routeChrome.subtitle ?? subtitle : undefined;
  const resolvedEyebrow = showEyebrow
    ? routeChrome.eyebrow ??
      (operatingSurface.phaseLabel
        ? `ED OS · ${operatingSurface.phaseLabel}`
        : EMERGENCY_OS_BRANDING.productName)
    : undefined;

  const actions = routeChrome.actions ?? (
    <HelpTrigger variant="button" className="shell-route-tab__help" label="Guide" />
  );

  return (
    <div className="shell-route-tab" role="region" aria-label="Current workspace">
      <div className="shell-route-tab__identity">
        {resolvedEyebrow ? (
          <span className="shell-route-tab__eyebrow">{resolvedEyebrow}</span>
        ) : null}
        <div className="shell-route-tab__title-block">
          <h1 className="shell-route-tab__title">{resolvedTitle}</h1>
          {resolvedSubtitle ? (
            <p className="shell-route-tab__subtitle">{resolvedSubtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shell-route-tab__actions">{actions}</div> : null}
    </div>
  );
}