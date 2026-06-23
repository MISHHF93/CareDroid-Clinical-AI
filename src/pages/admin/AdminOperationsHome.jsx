import React from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';

export default function AdminOperationsHome() {
  return (
    <div className="admin-ops-grid">
      <section className="admin-ops-card">
        <h3>ED staff & workflows</h3>
        <p>
          Map reception, triage, waiting room, provider, and command workflows to canonical SaaS roles
          and Emergency OS screens.
        </p>
        <Link to={CANONICAL_ROUTES.adminEdStaff}>Manage ED workflows →</Link>
      </section>

      <section className="admin-ops-card">
        <h3>Team & invitations</h3>
        <p>Invite clinicians, assign roles, and review membership for the emergency department.</p>
        <Link to={`${CANONICAL_ROUTES.adminOperations}/team`}>Open team management →</Link>
      </section>

      <section className="admin-ops-card">
        <h3>Tenant administration</h3>
        <p>
          Role access preview, workspace defaults, branding, integrations, and permission overrides.
        </p>
        <Link to={`${CANONICAL_ROUTES.adminOperations}/tenant`}>Tenant settings →</Link>
      </section>

      <section className="admin-ops-card">
        <h3>Organization dashboard</h3>
        <p>Packs, assets, departments, and service-line rollout for hospital operations.</p>
        <Link to={CANONICAL_ROUTES.organization}>Organization →</Link>
      </section>
    </div>
  );
}
