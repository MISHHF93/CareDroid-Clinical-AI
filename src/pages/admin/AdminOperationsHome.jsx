import React from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { BACKEND_API_CAPABILITY_STATUS } from '../../config/backendApiCapabilities';

const SURVEILLANCE_STATUS = [
  { id: 'surveillanceNexus', label: 'Surveillance nexus API', path: CANONICAL_ROUTES.surveillanceNexus },
  { id: 'surveillanceCameras', label: 'Camera registry API' },
  { id: 'surveillanceIotRegistry', label: 'IoT registry API' },
  { id: 'surveillanceHealth', label: 'Health monitoring API' },
  { id: 'medicalDeviceRegistry', label: 'Medical IoT registry', path: CANONICAL_ROUTES.medicalIot },
  { id: 'hospitalMap', label: 'Hospital map API', path: CANONICAL_ROUTES.hospitalMap },
  { id: 'fleetLiveTracking', label: 'Fleet live tracking', path: CANONICAL_ROUTES.fleetCommand },
];

function statusLabel(status) {
  if (status === 'real') return 'Live';
  if (status === 'demo') return 'Demo';
  return 'Disabled';
}

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
        <h3>Surveillance & IoT platform</h3>
        <p>
          Camera registry, IoT devices, facility zones, health monitoring, and TrackMind Nexus
          integration posture.
        </p>
        <Link to={CANONICAL_ROUTES.surveillanceNexus}>Open surveillance nexus →</Link>
        <ul className="admin-ops-status-list">
          {SURVEILLANCE_STATUS.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <strong>{statusLabel(BACKEND_API_CAPABILITY_STATUS[item.id] || 'disabled')}</strong>
              {item.path ? (
                <Link to={item.path} className="admin-ops-inline-link">
                  view
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-ops-card">
        <h3>Platform system health</h3>
        <p>Integration hub, telemetry capability labels, and operational system status.</p>
        <Link to={CANONICAL_ROUTES.systemHealth}>System health →</Link>
        <Link to={CANONICAL_ROUTES.saasHealth}>SaaS health center →</Link>
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
