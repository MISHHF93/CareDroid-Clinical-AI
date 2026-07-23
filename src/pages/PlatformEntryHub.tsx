import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { PageShell } from '../components/ui/CareDroidPrimitives';
import { getPublicWaitingDisplayPath } from '../config/publicWaitingScreenModel';
import { countPageRebuildByStatus } from '../config/pageRebuildRegistry';
import { PAGE_REBUILD_STATUS } from '../config/pageUxContract';
import {
  resolveAdminHomeRoute,
  resolveClinicalHomeRoute,
} from '../config/platformEntryModel';
import {
  DEMO_PERSONA,
  getDemoPersonaHeadline,
} from '../config/demoPersonaModel';
import { listEdWorkflowAzSteps } from '../config/edWorkflowIntegrationModel';
import useEdWorkflowIntegration from '../hooks/useEdWorkflowIntegration';
import useProfileSwitcherVisibility from '../hooks/useProfileSwitcherVisibility';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import ProfileRoleSwitcher from '../components/account/ProfileRoleSwitcher';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';
import './PlatformEntryHub.css';

export default function PlatformEntryHub() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { saasProfile } = useUserIdentity();
  const showProfileSwitcher = useProfileSwitcherVisibility();
  const edContext = useEdWorkflowIntegration();
  const workflowSteps = listEdWorkflowAzSteps();
  const clinicalHome = resolveClinicalHomeRoute(saasProfile?.role);
  const adminHome = resolveAdminHomeRoute();
  const waitingRoomPath = getPublicWaitingDisplayPath();
  const rebuildCounts = countPageRebuildByStatus();

  return (
    <PageShell
      as="div"
      suppressHeader
      className="platform-entry cdl-operational-page"
      contentClassName="platform-entry__content cdl-zone cdl-zone--active-work"
    >
      {surfaces.chrome.showEntryHubBackendSync ? (
        <p className="platform-entry__sync" role="status">
          Profile API {edContext.backendSync.profileWired ? 'connected' : 'offline'} Â· Emergency reads{' '}
          {edContext.backendSync.emergencyReadWired ? 'via /api/emergency' : 'local'} Â·{' '}
          {edContext.backendSync.persistenceMode.replace('-', ' ')}
        </p>
      ) : null}

      <p className="platform-entry__rebuild-status" role="status">
        UX rebuild wave 0 active Â· {rebuildCounts[PAGE_REBUILD_STATUS.rebuilt]} rebuilt Â·{' '}
        {rebuildCounts[PAGE_REBUILD_STATUS.pending]} queued
      </p>

      {showProfileSwitcher ? (
        <section className="platform-entry__profiles" aria-label="Switch workflow profile">
          <div className="platform-entry__profiles-copy">
            <h2 className="platform-entry__profiles-title">Switch profile before entering ED</h2>
            <p>
              Pick the lane you want to walk â€” reception, triage, charge, provider, EMS, command, or
              display views. CareDroid keeps {DEMO_PERSONA.displayName}&apos;s identity while
              permissions and surfaces change.
            </p>
          </div>
          <ProfileRoleSwitcher variant="chips" />
        </section>
      ) : null}

      <div className="platform-entry__grid">
        <Link
          className="platform-entry__card platform-entry__card--primary"
          to={CANONICAL_ROUTES.emergencyReception}
        >
          <h2>Start at reception â€” {DEMO_PERSONA.displayName}</h2>
          <p>
            {getDemoPersonaHeadline()}. Walk reception-first: register arrivals, verify identity,
            hand off to triage, then explore charge nurse, physician, EMS, and command views.
          </p>
          <span className="platform-entry__cta">Open arrival dashboard â†’</span>
        </Link>

        <Link className="platform-entry__card" to={clinicalHome}>
          <h2>Clinical workspace</h2>
          <p>Open the emergency workspace matched to your current demo role and assigned profile.</p>
          <span className="platform-entry__cta">Open clinical home â†’</span>
        </Link>

        <Link className="platform-entry__card" to={adminHome}>
          <h2>Admin console</h2>
          <p>
            Assign SaaS roles, preview ED workflows, invite staff, and configure tenant settings for
            the emergency department.
          </p>
          <span className="platform-entry__cta">Open admin console â†’</span>
        </Link>

        <Link className="platform-entry__card platform-entry__card--display" to={waitingRoomPath}>
          <h2>Waiting room display</h2>
          <p>PHI-safe wall board for posted waiting-room screens â€” wait ranges and crowd level only.</p>
          <span className="platform-entry__cta">Open public display â†’</span>
        </Link>
      </div>

      <section className="platform-entry__flow" aria-label="ED workflow A to Z">
        <strong>Emergency department workflow (Aâ€“Z)</strong>
        <ol>
          {workflowSteps.map((step) => (
            <li key={step.id}>
              {step.title}
              {step.route ? (
                <>
                  {' â€” '}
                  <Link to={step.route}>Open</Link>
                </>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="platform-entry__meta">
          Demo landing: {edContext.personaLabel} â†’ {edContext.landingRoute}
        </p>
        <p className="platform-entry__meta">
          <Link to={CANONICAL_ROUTES.profile}>Profile</Link>
          {' Â· '}
          <Link to={CANONICAL_ROUTES.organization}>Organization</Link>
        </p>
      </section>
    </PageShell>
  );
}