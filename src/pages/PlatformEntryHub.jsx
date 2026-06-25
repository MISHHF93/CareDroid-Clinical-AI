import React from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { CAREDROID_PRODUCT } from '../config/caredroidProduct.config';
import {
  resolveAdminHomeRoute,
  resolveClinicalHomeRoute,
} from '../config/platformEntryModel';
import {
  DEMO_PERSONA,
  getDemoPersonaHeadline,
  resolveDemoDefaultLandingRoute,
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
  const demoHome = resolveDemoDefaultLandingRoute();
  const adminHome = resolveAdminHomeRoute();

  return (
    <div className="platform-entry">
      <header className="platform-entry__hero">
        <p className="platform-entry__eyebrow">{CAREDROID_PRODUCT.name}</p>
        <h1 className="platform-entry__title">Choose how you enter the department</h1>
        <p className="platform-entry__subtitle">
          {CAREDROID_PRODUCT.firstResolutionLine} Enter the ED 18 demo as {DEMO_PERSONA.displayName},
          open your role workspace directly, or use the admin console to assign staff workflows.
        </p>
        {surfaces.chrome.showEntryHubBackendSync ? (
          <p className="platform-entry__sync" role="status">
            Profile API {edContext.backendSync.profileWired ? 'connected' : 'offline'} · Emergency
            reads {edContext.backendSync.emergencyReadWired ? 'via /api/emergency' : 'local'} ·{' '}
            {edContext.backendSync.persistenceMode.replace('-', ' ')}
          </p>
        ) : null}
      </header>

      {showProfileSwitcher ? (
        <section className="platform-entry__profiles" aria-label="Switch workflow profile">
          <div className="platform-entry__profiles-copy">
            <h2 className="platform-entry__profiles-title">Switch profile before entering ED</h2>
            <p>
              Pick the lane you want to walk — reception, triage, charge, provider, EMS, command, or
              display views. CareDroid keeps {DEMO_PERSONA.displayName}&apos;s identity while
              permissions and surfaces change.
            </p>
          </div>
          <ProfileRoleSwitcher variant="chips" />
        </section>
      ) : null}

      <div className="platform-entry__grid">
        <Link className="platform-entry__card platform-entry__card--primary" to={demoHome}>
          <h2>Start at reception — {DEMO_PERSONA.displayName}</h2>
          <p>
            {getDemoPersonaHeadline()}. Walk reception-first: register arrivals, verify identity,
            hand off to triage, then explore charge nurse, physician, EMS, and command views.
          </p>
          <span className="platform-entry__cta">Open arrival dashboard →</span>
        </Link>

        <Link className="platform-entry__card" to={clinicalHome}>
          <h2>Clinical workspace</h2>
          <p>Open the emergency workspace matched to your current demo role and assigned profile.</p>
          <span className="platform-entry__cta">Open clinical home →</span>
        </Link>

        <Link className="platform-entry__card" to={adminHome}>
          <h2>Admin console</h2>
          <p>
            Assign SaaS roles, preview ED workflows, invite staff, and configure tenant settings for
            the emergency department.
          </p>
          <span className="platform-entry__cta">Open admin console →</span>
        </Link>
      </div>

      <section className="platform-entry__flow" aria-label="ED workflow A to Z">
        <strong>Emergency department workflow (A–Z)</strong>
        <ol>
          {workflowSteps.map((step) => (
            <li key={step.id}>
              {step.title}
              {step.route ? (
                <>
                  {' — '}
                  <Link to={step.route}>Open</Link>
                </>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="platform-entry__meta">
          Demo landing: {edContext.personaLabel} → {edContext.landingRoute}
        </p>
        <p className="platform-entry__meta">
          <Link to={CANONICAL_ROUTES.profile}>Profile</Link>
          {' · '}
          <Link to={CANONICAL_ROUTES.organization}>Organization</Link>
        </p>
      </section>
    </div>
  );
}