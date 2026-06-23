import React from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';
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
import { useUserIdentity } from '../contexts/UserIdentityContext';
import './PlatformEntryHub.css';

export default function PlatformEntryHub() {
  const { saasProfile } = useUserIdentity();
  const edContext = useEdWorkflowIntegration();
  const workflowSteps = listEdWorkflowAzSteps();
  const clinicalHome = resolveClinicalHomeRoute(saasProfile?.role);
  const demoHome = resolveDemoDefaultLandingRoute();
  const adminHome = resolveAdminHomeRoute();

  return (
    <div className="platform-entry">
      <header className="platform-entry__hero">
        <p className="platform-entry__eyebrow">CareDroid Emergency Platform</p>
        <h1 className="platform-entry__title">Choose how you enter the department</h1>
        <p className="platform-entry__subtitle">
          Clinical workflows stay separate from administration. Enter the ED 18 demo as Dr. Cara
          George, open your role workspace directly, or use the admin console to assign roles and
          workflows.
        </p>
        <p className="platform-entry__sync" role="status">
          Profile API {edContext.backendSync.profileWired ? 'connected' : 'offline'} · Emergency
          reads {edContext.backendSync.emergencyReadWired ? 'via /api/emergency' : 'local'} ·{' '}
          {edContext.backendSync.persistenceMode.replace('-', ' ')}
        </p>
      </header>

      <div className="platform-entry__grid">
        <Link className="platform-entry__card" to={demoHome}>
          <h2>Enter as {DEMO_PERSONA.displayName}</h2>
          <p>
            {getDemoPersonaHeadline()}. Switch between reception, triage, charge nurse, physician,
            EMS, and command views — CareDroid captures inputs as you walk each lane.
          </p>
          <span className="platform-entry__cta">Start ED 18 demo →</span>
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
        <p style={{ marginTop: 12, fontSize: '0.8125rem', color: 'var(--muted-text)' }}>
          Demo landing: {edContext.personaLabel} → {edContext.landingRoute}
        </p>
        <p style={{ marginTop: 8, fontSize: '0.8125rem', color: 'var(--muted-text)' }}>
          <Link to={CANONICAL_ROUTES.profile}>Profile</Link>
          {' · '}
          <Link to={CANONICAL_ROUTES.organization}>Organization</Link>
        </p>
      </section>
    </div>
  );
}
