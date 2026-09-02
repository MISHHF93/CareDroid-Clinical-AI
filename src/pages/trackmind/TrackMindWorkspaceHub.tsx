import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Gauge, ArrowUpRight, Bell, Lock } from 'lucide-react';
import useTrackMindRolePermissions from '../../hooks/useTrackMindRolePermissions';
import { useUser } from '../../contexts/UserContext';
import { CANONICAL_ROUTES, getRouteByPath } from '../../config/routes.config';
import { resolveEdExtensionRedirect } from '../../config/edApplication.config';
import {
  isRouteAllowedForProfile,
  resolveSaasRoleFromUser,
  resolveUserProfileFromSaasRole,
} from '../../config/userProfileCatalog';
import './TrackMindWorkspaceHub.css';

/**
 * TrackMind Operating System hub.
 *
 * routes.config.ts declared this route (`/trackmind`, componentKey
 * 'TrackMindWorkspaceHub') and recorded that everything behind it already
 * existed -- role catalog, permission registry, workspace/KPI/notification/
 * privacy policy modules, and a route guard that resolves this exact path as
 * the fallback landing route for every TrackMind role -- while noting it "is
 * simply never mounted in router.tsx and no workspace page component exists
 * yet". This is that component; it renders what
 * useTrackMindRolePermissions() already computes.
 *
 * Deliberately shows no KPI *values*. TRACKMIND_KPI_CATALOG defines ids,
 * labels, permissions and domains -- it carries no measurements, and there is
 * no TrackMind metrics backend to read. Inventing numbers here would be
 * fabricated operational data, so the KPI section states which indicators the
 * role is cleared to see and says plainly that values are not yet wired.
 */
/**
 * A human label for a related surface.
 *
 * getRouteByPath() can return a record from either of two registries:
 * CANONICAL_ROUTE_MAP records carry `label`, ROUTE_RECORDS records do not --
 * they carry `id`. Reading only `label` rendered every ROUTE_RECORDS hit as a
 * bare path ('/workflows'), so fall through id, then the path itself.
 */
function labelForRoute(route: string): string {
  const record = getRouteByPath(route) as { label?: string; id?: string } | null;
  if (record?.label) return record.label;
  const raw = record?.id || route.split('/').filter(Boolean).pop() || route;
  // ROUTE_RECORDS ids are camelCase ('platformIntelligence'), path segments
  // are kebab ('platform-intelligence'). Split both, or the id case renders
  // as 'PlatformIntelligence'.
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
export default function TrackMindWorkspaceHub() {
  const trackMind = useTrackMindRolePermissions();
  const { workspace } = trackMind;

  const { user } = useUser();

  // The role's CareDroid profile, not its TrackMind role. A related surface can
  // be inside the TrackMind model and still be closed to the profile that is
  // looking at it: /workflows is listed for the steward, and ProfileRouteGuard
  // denies the steward /workflows. Linking there would promise a page the very
  // next click refuses, so reachability is resolved here and unreachable
  // surfaces are named without being linked.
  const profile = useMemo(
    () => resolveUserProfileFromSaasRole(resolveSaasRoleFromUser(user)),
    [user],
  );

  const quickActionRoutes = useMemo(
    () => new Set(trackMind.quickActions.map((action) => action.route).filter(Boolean)),
    [trackMind.quickActions],
  );

  const relatedRoutes = useMemo(
    () =>
      (workspace.relatedRoutes || [])
        // This page, and anything already offered above as a quick action --
        // /audit was rendering twice, once in each section.
        .filter(
          (route) =>
            route !== CANONICAL_ROUTES.trackMindWorkspace && !quickActionRoutes.has(route),
        )
        .map((route) => {
          // Two independent ways a listed surface is not actually openable,
          // and they need different words: the profile may lack the grant, or
          // ED single-application mode may fold the path into an ED surface
          // (ED_EXTENSION_ROUTE_REDIRECTS). /platform-intelligence is the
          // second kind -- permitted to the analytics profile, yet still
          // redirected to /emergency/settings because no page exists for it.
          const shadowed = resolveEdExtensionRedirect(route) !== null;
          const permitted = isRouteAllowedForProfile(profile, route);
          return {
            route,
            label: labelForRoute(route),
            reachable: permitted && !shadowed,
            reason: !permitted
              ? 'Not open to your role'
              : 'Not part of the ED application',
          };
        }),
    [workspace.relatedRoutes, quickActionRoutes, profile],
  );

  return (
    <main className="trackmind-hub" aria-labelledby="trackmind-hub-heading">
      <header className="trackmind-hub__header">
        <div>
          <p className="trackmind-hub__eyebrow">TrackMind Operating System</p>
          <h1 id="trackmind-hub-heading">{workspace.title}</h1>
          <p className="trackmind-hub__subtitle">{workspace.subtitle}</p>
        </div>
        <div className="trackmind-hub__role" aria-label="Your TrackMind role">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>{trackMind.roleLabel}</strong>
            <span>{trackMind.roleDescription}</span>
          </div>
          {trackMind.readOnly ? (
            <span className="trackmind-hub__readonly">
              <Lock aria-hidden="true" /> Read-only
            </span>
          ) : null}
        </div>
      </header>

      <dl className="trackmind-hub__facts">
        <div>
          <dt>Focus domain</dt>
          <dd>{workspace.focusDomain}</dd>
        </div>
        <div>
          <dt>Primary scope</dt>
          <dd>{trackMind.primaryScope}</dd>
        </div>
        <div>
          <dt>Permissions granted</dt>
          <dd>{trackMind.allowedPermissions.length}</dd>
        </div>
        <div>
          <dt>Reachable surfaces</dt>
          <dd>{trackMind.allowedRoutes.length}</dd>
        </div>
      </dl>

      <section className="trackmind-hub__section" aria-labelledby="trackmind-kpis">
        <h2 id="trackmind-kpis">
          <Gauge aria-hidden="true" /> Indicators cleared for this role
        </h2>
        {trackMind.kpis.length ? (
          <>
            <p className="trackmind-hub__note">
              These are the indicators your role may view. Values are not shown: TrackMind has no
              metrics source wired yet, and displaying invented numbers would misrepresent
              operational state.
            </p>
            <ul className="trackmind-hub__kpis">
              {trackMind.kpis.map((kpi) => (
                <li key={kpi.id}>
                  <strong>{kpi.label}</strong>
                  <span>{kpi.domain}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="trackmind-hub__empty">
            This role is not cleared for any TrackMind indicators.
          </p>
        )}
      </section>

      <section className="trackmind-hub__section" aria-labelledby="trackmind-actions">
        <h2 id="trackmind-actions">Quick actions</h2>
        {trackMind.quickActions.length ? (
          <ul className="trackmind-hub__actions">
            {trackMind.quickActions.map((action) =>
              action.route ? (
                <li key={action.id}>
                  <Link to={action.route}>
                    {action.label}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </li>
              ) : (
                <li key={action.id}>
                  <span>{action.label}</span>
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="trackmind-hub__empty">
            No quick actions are available to this role.
          </p>
        )}
      </section>

      {relatedRoutes.length ? (
        <section className="trackmind-hub__section" aria-labelledby="trackmind-related">
          <h2 id="trackmind-related">Related TrackMind surfaces</h2>
          <ul className="trackmind-hub__related">
            {relatedRoutes.map(({ route, label, reachable, reason }) =>
              reachable ? (
                <li key={route}>
                  <Link to={route}>
                    {label}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </li>
              ) : (
                <li key={route}>
                  <span className="trackmind-hub__locked">
                    {label}
                    <span className="trackmind-hub__locked-note">
                      <Lock aria-hidden="true" /> {reason}
                    </span>
                  </span>
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}

      {trackMind.notificationChannels.length ? (
        <section className="trackmind-hub__section" aria-labelledby="trackmind-notifications">
          <h2 id="trackmind-notifications">
            <Bell aria-hidden="true" /> Notification channels
          </h2>
          <ul className="trackmind-hub__channels">
            {trackMind.notificationChannels.map((channel) => (
              <li key={channel}>{channel}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
